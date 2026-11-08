# The schema changelog: entries 3 through v221

Every bump of `SAVE_SCHEMA`/`SCHEMA_VERSION` from Milestone 3 to v221, moved out
of `src/sim/state.ts` in two steps:

- Entries 3 to v78 moved in batch H4 (`docs/audit/dead-code.md` §2.2), when the
  docblock had grown to 1443 lines.
- Entries v79 to v221 moved in batch S3
  (`docs/audit/s3-encapsulation-2026-11-07.md` §2), when the docblock had grown
  to 3365 lines.

The text is the original, verbatim. Only the comment prefix was removed. In the
S3 part, the docblock was three comment blocks, and a blank line now stands
where one block closed and the next opened (after v96 and after v97).

`loadGame` and `restoreState` test the schema for **exact** equality
(`src/sim/game.ts`), so none of these saves loads against a current build. What
the entries are for is the *reason* a bump happened — the record of which ruling
broke which replay. The current entry and the few most recent ones stay in
`state.ts` beside `SCHEMA_VERSION`, because the next bump is written by whoever
reads them there.

---

3: Milestone 3 — real cities, tile ownership, and the per-player yield pools.
4: Citizen management — `City.lockedTiles` and the `setLockedTiles` command.
5: Fresh water — the `lake` terrain, `Tile.riverEdges` and `Tile.freshwater`.
6: Milestone 4 — the tech tree: `Player.researching` and
   `Player.techsResearched`, and the `chooseResearch` command.
7: Milestone 5 — combat: `Unit.hasAttacked` and `Unit.fortifiedTurns`,
   `City.hp`, `Player.eliminated`, `GameState.winnerId`, and the `attack` and
   `fortify` commands.
8: Milestone 6 — resources: `Tile.resource`, the yields it adds, and the
   `requiresResource` production gate. The map is generated from the seed, so
   a save file carries no tiles — but a v7 save replayed against this build
   would grow resources its log never knew about, which is exactly the silent
   misreading the version exists to refuse.
9: Escalating settlers — `Player.settlersBuilt`, the counter the settler's
   `costIncrement` multiplies. A v8 log replayed against this build would
   price every settler after the first at the old flat cost, which is a
   different game rather than an older one.
10: Milestone 8 — fog of war: `GameState.visibility` and
   `GameState.citySightings`, plus the one rule that follows from them (an
   attack requires the target tile be visible to the attacker). A v9 log
   replayed here can find an attack refused that the older build allowed, so
   the log is not merely older, it is a different game.
11: Milestone 7 — workers and tile improvements: `Unit.chargesLeft`,
   `Tile.improvement`, and the two commands that write them
   (`buildImprovement`, `pillage`). A v10 log replayed here would also find
   `hasResource` grown its improvement clause (design ledger, Entry IX's
   correction), so a swordsman that empire used to be able to build is now
   refused until somebody mines the iron — a different game rather than an
   older one, which is exactly what this number exists to refuse.
12: Milestone 10 — happiness and authority: `City.captured`, the one fact the
   two derived meters cannot recompute from the board (see the field's own
   docblock). A v11 log replayed here is not merely older either: every yield
   in it was banked before the meters multiplied production, science and
   culture, and before a happiness deficit throttled growth.
13: The ratified luxury table — `Player.faithPool`, the fourth per-player
   bank, filled by the faith a tile or a signature pays and spent by nothing
   yet (see the field). A v12 log replayed here is a different game rather
   than an older one for three further reasons that carry no state of their
   own: tile yields gained three voices, a city standing on a seam now draws
   supply from it once its owner holds the improving technology, and *access*
   is gated on the resource's reveal — so a v12 empire that mined iron before
   Bronze Working held iron and a v13 one does not.
14: Territory and gold (playable.md item 2) — `Player.tilesPurchased`, the
   escalation ladder behind the `purchaseTile` command, and the command
   itself. A v13 log replayed here is a different game for two reasons beyond
   the field: the border-cost curve was retuned to Civ 6's numbers, so every
   city claims its ground on a different schedule; and border-culture accrual
   now answers to the writ, freezing outright while authority is in deficit.
15: Barbarians and discoveries (playable.md item 3, ledger Entry XX) — four
    fields and one command, folded into a single bump because they are one
    pass: `Tile.discovery` (the ruin or village a unit consumes by walking
    into it), `Player.barbarian` (the appended seat that is the wild),
    `Player.pendingDiscovery` (a claim awaiting its 1-of-3 pick, resolved by
    the new `chooseDiscovery` command), and `GameState.camps`. A v14 log
    replayed here is a different game rather than an older one for a reason
    beyond the fields: a scout that walked over a hex on turn six now claims
    something there, and every empire fights the wild at +2.
16: Sleep — `Unit.sleeping` and the `sleepUnit` command. A civilian told to
    sleep stops blocking End Turn and stops being auto-focused, and is woken
    by the `wakeSleepers` phase when a foreign combatant comes inside its own
    sight. A v15 log replayed here is the same game: nothing in it can carry
    the new command, and a unit with no `sleeping` key is a unit that is
    awake. It is a bump rather than a free field because the *phase* is new —
    the resolution now has an eleventh step, and a state that ran ten is not
    a state this build produced.
17: Statecraft (playable.md item 5, ledger Entry XV and XV.b) —
    `Player.statecraft`, and the five commands that write it (`chooseOrder`,
    `slotOrder`, `unslotOrder`, `adoptGovernment`, `chooseDoctrine`). One
    field and one phase, folded into a single bump because they are one pass.
    A v16 log replayed here is a different game rather than an older one for a
    reason beyond the field: `Player.culturePool` used to be a bank nothing
    spent, and the `statecraft` phase now **spends** it on drafts — so every
    culture figure in a v16 save is a figure that was never going to be
    deducted, and an empire that reached tier 3 on turn forty in this build
    had no tier at all in that one.
18: Religion v1 — augurs and pantheons (playable.md item 6, ledger Entry
    XXVIII). Four fields and four commands, one pass: `Player.pantheon` (the
    gods held and any belief offer outstanding), `Player.augursPurchased` (the
    faith-price ladder), and `City.timed` / `Unit.timed` (the rites that run
    out) — written by `purchaseUnit`, `consecrate`, `chooseBelief` and
    `performRite`. A v17 log replayed here is a different game rather than an
    older one for two reasons beyond the fields: `Player.faithPool` used to be
    a bank nothing spent and augurs now **spend** it, and fishing boats pay
    +1🪙 they did not pay before, so every coastal yield in a v17 save is a
    figure this build would not have banked.
19: Purchases, generalised (playable.md item 2's remainder, ledger Entry
    XXIX). **No new field** — this bump is entirely about the log. The
    `purchaseUnit` command became `purchaseItem` and carries a
    `{ kind, id }` item rather than a `unitType`, so a v18 log's augur
    purchase is a command this reducer does not recognise; and gold now buys
    units and buildings, which a v18 game had no way to spend it on at all.
    `Player.gold` in a v18 save is therefore a bank with a different meaning
    rather than the same bank one version older.
20: Wonders — `GameState.wonders`, the claim register that makes a wonder one
    per world (2026-08-27). One field, no new command: a wonder is queued by
    the `setCityProduction` a v19 log already carries. It is a bump rather
    than a free field because a v19 log replayed here is a *different game*:
    the roster has a row in it that Divination now unlocks, so an empire that
    researched Divination on turn twelve has a hundred-and-twenty-hammer
    building available it did not have, and — the load-bearing half — a city
    beaten to a wonder has its queue rewritten and its basket converted to
    gold by a rule that did not exist, which no earlier log can have expected.
21: Great people, renown and Triumphs (`docs/great-people.md`) — the fifth
    Entry XVIII bucket and everything that spends it, folded into one bump
    because they are one pass. Five fields on the player
    (`renownPool`, `renownByFamily`, `legacies`, `triumphs`,
    `greatPeopleRecruited`, and the transient `greatPersonOffer`), two on the
    state (`recruited`, the world's consumed roster, and `contested`, the
    register of the triumphs only one seat may hold), one on a unit
    (`person`) and one new command (`chooseGreatPerson`, plus the two verbs
    `greatPersonAct` and `greatPersonWork`). A v20 log replayed here is a
    *different game* rather than an older one for a reason beyond the fields:
    a library now pays a renown a turn, so every empire in it reaches a
    recruitment it never had, and `state.rng` is advanced by every offer that
    opens — which moves every roll after it.
22: The research queue and the leftover march (playtest batch two) — one
    optional field, `Player.researchQueue`, and two commands (`chooseResearch`
    grew a `queue` mode, and `dequeueResearch` is new). A v21 log replayed here
    is a *different game* rather than an older one for a reason beyond the
    field: a `moveUnit` given to a unit with no movement left used to be
    **refused**, and is now accepted as a standing order — so a command a v21
    log could never contain is one this build writes — and the resolution has
    grown a phase (`spendLeftoverMovement`) that marches a jammed column with
    the movement its turn left it, which no v21 state can have been through.
23: Trade (`docs/trade.md`) — the caravan, the road and the city connection.
    One field on a tile (`Tile.road`, the **fourth** thing on a hex that
    changes during play), one on a unit (`Unit.trade`), one on a city
    (`City.tradingPost`), three commands (`startRoute`, `setAutoResend`,
    `cancelRoute`) and one phase (`marchTraders`). A v22 log replayed here is
    a *different game* rather than an older one for a reason beyond the
    fields: a step between two road hexes now costs a third of a movement
    point, so every march over ground a caravan has crossed arrives somewhere
    a v22 walk would not have reached — and connected cities pay gold their
    empire never had.
24: The caravan stopped being a piece you position (the user, 2026-08-28: "I
    want to remove all micromanagement of units"). No field moved and no rule
    about the board changed — `sendTrader { unitId, cityId }` was **replaced**
    by `startRoute { unitId, fromCityId, toCityId }`, which names its own
    origin and teleports the caravan into it. A v23 log is refused rather than
    misread for the plainest possible reason: it contains a command name this
    build's reducer does not have, so a replay of one would stop dead partway
    through and leave a state no game ever reached.
25: One unit bought per city per turn (user, 2026-08-28: "cities can only
    purchase a single unit per turn"). One optional field on a city
    (`City.purchasedUnitTurn`, an absolute turn) and one clause in
    `purchaseError`. A v24 log is a *different game* rather than an older one
    for the usual reason: it may contain a second `purchaseItem` on a town
    inside one turn, which this reducer refuses — so the replay would leave
    the piece unbought, the treasury unspent, and every seeded thing after it
    shifted.
26: Religion v2 (`docs/religion-v2.md`) — the prophet, the religion, and the
    tide of belief. One register (`GameState.religions`), two optional fields
    on a city (`followers`, `pressureBank`), one on a player
    (`prophetsPurchased`), four commands (`plantHolySite`, `enhanceReligion`,
    `proclaim`, `redraftBeliefs`, plus `renameReligion` — `enhanceReligion`
    is gone as of v42, folded into `gainBelief`) and one phase
    (`spreadReligion`). A v25 log replayed here is a *different game* rather
    than an older one for a reason beyond the fields: the temple moved off
    Philosophy onto **The High Temple**, a technology that did not exist, so
    every research plan after the second age reaches a different tree — and
    the belief draft now spends `state.rng` on a generated name.
27: Maintenance (the user's ruling, 2026-08-28) — units and buildings cost
    gold per turn by the age of the technology that unlocks them, the palace
    pays 2💰, the treasury may go negative, and the opening kit is a settler
    and a **scout** rather than a settler and a warrior.

    One optional field on a unit (`freeUpkeep`) and four new rules
    (`rules.upkeep`, `rules.cities.palaceGold`). **A v26 log replayed here is
    a different game** for two reasons beyond the fields: every seeded start
    places a different second piece, and every empire's treasury curve moves
    from turn one.

    The migration note, said plainly because it cannot be fixed: *absent
    means "pays"*, which is right for every unit in an old save **except a
    captured one** — v26 recorded no reason to mark it, and a replay of the
    log would re-derive it correctly while a loaded snapshot would not. The
    schema bump refuses both, so nothing silently starts charging rent on a
    stolen worker; it is called out here so that a future migration writer
    knows the one field it could not have inferred.
28: The trader's own slot, and The Founders' Road as a survey (two user
    rulings, 2026-08-28). `UnitCategory` gains `'trader'` and the caravan's
    row moves onto it, so a hex holds one soldier, one civilian and any
    number of caravans; The Founders' Road pathfinds instead of drawing a
    line, lays nothing at all when no land route exists, and marks what it
    lays maintenance-free.

    One optional field on a tile (`Tile.roadFree`, presence-is-the-state).
    **A v27 log replayed here is a different game**, and the stacking half is
    the reason rather than the field: a move a v27 reducer refused because a
    settler was standing on the hex is a move this one accepts, so the first
    caravan to pass a parked civilian puts every piece on the board somewhere
    else. The gold curve moves too — a decreed road stops being billed, and a
    doctrine that used to lay a broken line across a strait now lays nothing.

    The migration note, said plainly because it cannot be fixed: *absent
    means "billed"*, which is right for every road in an old save **except
    the ones The Founders' Road decreed** — v27 recorded no reason to mark
    them, and a replay of the log would re-derive them correctly while a
    loaded snapshot would keep charging rent on a free highway. The schema
    bump refuses both.
29: The correction of who a belief pays (user, 2026-08-28), which is Civ V's
    split said plainly: **founder beliefs pay the owner of the holy city**
    and **follower beliefs apply city-locally**, in every town that follows,
    whoever owns it. Two fields move on `Religion`: `holySite` records the
    hex the first stones went up on (the holy city is whoever's territory
    holds it, so a conquest moves the payoff), and `enhancer` becomes a
    **list** because `pools.enhancerSlots` is two and a scalar silently
    overwrote the first pick.

    The migration note: a v28 `enhancer: BeliefId` becomes a one-element
    list, and a v28 religion has no `holySite` at all — `religionFounder`
    falls back to `founderId` for exactly that case, which is the same
    fallback a pillaged site takes. Neither could be inferred from a
    snapshot's board (the stones a religion was founded on are not marked on
    the map), and a replay of the log re-derives both, so the bump refuses
    the snapshot and keeps the log honest.
30: **The proclamation stops lingering** (user, 2026-08-28). A faith bomb was
    a `ReligionPulse` — a decaying source parked on a hex for ten turns, read
    by `explainPressure` every turn until it expired. It is now an **instant
    lump of pressure**: `rules.religion.bombLump` is banked into
    `City.pressureBank` of every town in range at the moment the prophet
    speaks, the temple's own resistance applied, and the phase's own converter
    is run on the spot. The Preaching is the same act out of a smaller purse.

    `Religion.pulses` and the `ReligionPulse` shape are **deleted** rather
    than deprecated: proclamations were their only source, so a field that
    could only ever be empty would be a shape a future reader had to be told
    to ignore.

    The migration note: a v29 save's standing pulses simply have no home
    here, and the pressure they had not yet paid cannot be reconstructed —
    the bank records what arrived, never what was still coming. A replay of
    the log re-derives everything (the bomb is a command), so the bump
    refuses the snapshot and keeps the log honest. It is a different game
    either way: a v29 bomb pressed 12 a turn for ten turns and this one
    presses 60 once.
31: **The settler ladder generalises** (user ruling, 2026-08-28). `UnitDef.
    costIncrement` becomes `escalation` and the worker now carries one too
    (3 hammers, vs. the settler's 8, moved onto its row from the old
    `rules.production.settlerIncrement` in an earlier pass and unchanged in
    value). `Player.settlersBuilt` — one counter, implicitly the settler's —
    is replaced by `Player.unitsBuilt: Partial<Record<UnitTypeId, number>>`,
    one counter *per escalating type*, so a worker habit and a settler habit
    price separately. `realiseItem` is still the only place either climbs,
    and still skips a free grant (`options.free`) — a captured or gifted
    unit was never *built*.

    The migration note: a v30 `settlersBuilt: n` becomes
    `unitsBuilt: { settler: n }` (or `{}` for `n === 0`, presence being the
    state exactly as it is for `researchQueue`). A replay of the log
    re-derives the count from scratch regardless, so the bump refuses the
    snapshot and keeps the log honest rather than attempting the rewrite.
32: **The Statecraft retune** (user's pass over `docs/orders-and-doctrines.md`,
    2026-08-28). **No new field on any save** — this bump is entirely about
    the balance table, and it is here for v19's and v20's reason: a log
    replayed against different numbers is a different game, not an older one.
    Every government's slot triple was rewritten, so an empire that adopted
    the Republic on turn forty holds a spread it never held; three cards were
    reworked outright (Bread and Circuses now pays happiness under a gate
    instead of culture, The Standing Levy musters a spear every ten turns
    instead of letting units jump a queue, Cuius Regio charges augurs only in
    the towns that keep its faith); a captured city's authority price became
    a *delta* rather than a set, so Hegemony and Client Kings now stack; and
    a new Order (The Legion) joined the Government I pool, which moves every
    draw from that bag. The `muster` phase is new in the pipeline and fires
    for nobody who holds no such card, so a v31 log's turn order is otherwise
    untouched — but the drafts alone move every roll after the first tier.
33: **What a prophet costs** (user ruling, 2026-08-29): "prophets should be
    entirely consumed by starting a religion or enhancing. proclamations and
    redrafting should still only consume 1 charge as usual." **No new field on
    any save** — this bump is entirely about the price, and it is here for
    v32's reason: a log replayed against a different price is a different
    game, not an older one. A v32 prophet founded a religion and walked away
    with a charge in hand; this one does not exist by the time the stones are
    up, so every piece that prophet went on to spend — a second holy site, a
    proclamation, an enhancement — never happens, and the board diverges from
    the founding turn. Nothing about a later holy site moved: it is one charge
    as before, and it still never moves `Religion.holySite`.
34: **A god belongs to one world** (user ruling, 2026-08-29, alongside
    Recasting the Omens). `beliefPool` now excludes every pantheon belief a
    *rival* seat keeps, so the bag a Consecrate draws from is smaller than it
    was and the hand dealt on any turn after the first god in the world is a
    different hand. That alone moves every seeded draw, which is v19's reason
    for a bump; the new rite adds the other half — a seventh row in the rite
    table, an ability on Divination, and `BeliefOffer.givenBack`, a field a
    v33 save never wrote. A v33 log replayed here would deal gods the log's
    indices no longer name, which is a different game rather than an older
    one. The same day's other replay-moving ruling rides the same number:
    **the sword line waits for iron** (`upgradeTargetFor` stops at a rung
    whose resource the empire does not control, and `advanceResearch` runs
    the retooling sweep every turn), so a v33 log's warriors become
    swordsmen on a different turn than the log remembers.
35: **A unit can be stamped** (the Chiefdom/Gov I/Gov II Orders pass,
    2026-08-29). `Unit.stamp` is the ninth "presence is the state" field —
    `{ hp?, strength? }`, written once by `createUnit` from the owner's live
    `unitStamp` effects and never revisited, because what a card was worth on
    the day a levy mustered is a fact about that moment (The Muster Roll's ten
    hit points, Drums of War's point of strength). It moves the game twice
    over: a *unit's* maximum health is now `unitMaxHp` rather than the
    roster's figure, so every heal cap, both forecast bars and the upgrade's
    fraction read it; and a stamped piece carries a labelled "Veteran" line
    into `planCombat`'s fold, which changes what a die is thrown against.

    The same pass adds fourteen Orders to the three pools drafted most, which
    is v32's reason on its own: a bag that grew moves every draw from it, so
    an empire replaying a v34 log is dealt hands the log's indices no longer
    name. Hill Forts also prices a city on hills a point cheaper in authority
    (`hillCityCost`, a new meter rule), and Cistern Works declares every town
    of its holder to be on fresh water — both of which change what the meters
    read on a turn the cards are held.

    The migration note: a v34 save's units simply have no stamp, which is
    exactly what this version writes for a game whose council has stamped
    nothing — but the log replays against a different pool and a different
    maximum, so the bump refuses the snapshot and keeps the log honest.
36: **Guilds** (ledger Entry XLVIII, user ruling 2026-08-29). Two fields on
    every city — `specialists`, four counts by family, and `guildBasket`, the
    bar they are earned on — and a `guilds` phase between `growCities` and
    `advanceProduction` that turns a citizen into a specialist whenever the
    bar covers its threshold. Neither field is optional: a specialist count is
    arithmetic in the innermost loop this simulation has, not an event (see
    `City.specialists`).

    **A v35 log replayed here is a different game**, and the fields are the
    smaller half of why. From the first town that finishes a library, one of
    its citizens eventually stops working a hex — so the tile assignment
    diverges, and with it the food, the hammers, the growth turn, what the
    borders reach for and every seeded roll that comes after a differently
    timed draft. The empire's renown moves too: a standing specialist pays a
    point a turn into its own family's feed, which is the weighting a great
    person is drawn against.

    The migration note, said plainly because it cannot be fixed: *absent means
    zeros*, which is right for every town in an old save — nothing before this
    version could have had a guild. It is still refused, because the board a
    v35 log produces here is not the board it produced there, and a snapshot
    restored into this version would be a game the log can no longer explain.
37: **The Bead Race** (design ledger Entry VI, `docs/beads.md`) — the game's
    one victory condition, and the largest single addition since Statecraft.
    One field on the state (`GameState.beads`: the two shuffled decks, the two
    hands, the world's register of claims, the streak book and the world's
    age), eight on the player (`beads`, `dice`, and the six counters a deed
    asks about that the board cannot answer — `citiesFounded`,
    `citiesCaptured`, `faithOnHolyOrders`, `tithesGold`,
    `scholarshipScience`, `routeYieldsThisAge`, `greatPeopleThisAge`), one
    phase (`beads`, after `renown`) and three building rows nothing unlocks
    yet (`BuildingDef.awaitsTech`).

    **A v36 log replayed here is a different game**, and the decks are the
    smaller half of why. `newGame` now draws two shuffles off `state.rng`
    before a single unit is placed, which moves **every seeded roll in the
    game** — the first barbarian camp, the first ruin's hand, every draft.
    Beyond that: a race project is a queue row a v36 city could not hold, a
    bead's boon settles through five of the Entry XVIII seams, and the first
    empire to twenty beads simply wins, which is a way a v36 game could not
    end.

    The migration note: absent means a game that has raced nobody, which is
    right for every v36 save — nothing before this version could hold a bead.
    It is still refused, because the board a v36 log produces here is not the
    board it produced there.
38: **The tree** (`docs/tech-tree.md` Part 3, the tree pass of 2026-08-30) —
    four ages where there were three, and fifty-three nodes where there were
    twenty-six. Nothing on the *state* changed shape, and the version still
    has to move, because a save is `{config, log}` and this pass changed what
    a log **means**:

      · **`drama` is deleted.** A v37 log containing `chooseResearch drama`
        names a technology that no longer exists, and there is no honest
        reading of it — its buildings are Epic Poetry's now and Theology's
        prerequisites are Rhetoric and Epic Poetry.
      · Every surviving node keeps its **id** (Philosophy is displayed as
        *Rhetoric* and is still `philosophy`), and almost none keeps its cost,
        its prerequisites or its age. A v37 log's research plan therefore
        completes at different turns, in a different order, and hands over a
        different roster.
      · Ages renumber, so everything keyed by one moves with them: the unit
        cost band gains a fourth rung, the glass-bead decks re-key 2|3 → 3|4,
        and a barbarian's tier is read off a different median tree.
      · The great-person offer is gated on Ancestor Rites, so the turn a name
        is first dealt — and therefore every `state.rng` draw after it — moves.

    The migration note: nothing to migrate. Every field a v37 save carries is
    still a field this version reads; what is gone is the tree the log was
    played against.
39: Auto-explore — `Unit.autoExplore` and the `setAutoExplore` command
    (2026-08-30). A soldier or a scout told to range ahead aims itself at the
    nearest hex whose own sight would still show it something new
    (`explore.ts`), and the `marchExplorers` phase re-aims it every
    resolution until nothing within reach is left to see. A v38 log replayed
    here is the same game: nothing in it can carry the new command, and a
    unit with no `autoExplore` key is a unit under its own orders. It is a
    bump rather than a free field for sleep's reason exactly (entry 16): the
    *phase* is new — the resolution has grown a step, and a state that ran
    without it is not a state this build produced.
41: **The tree re-cut** (2026-09-02, ledger Entry LVIII, `docs/tree-worksheet.md`
    revision 3). Entry 38's bump, for the same reason and at the same scale —
    a log played against a different tree is a different game:
      · fifty-three nodes become **forty-nine**, and twelve of the old ones
        are gone entirely (Calendar, Construction, The Legion, The Steppe Bow,
        The Halberd Wall, Standing Stones, Caravans, The Knotted Cord, The
        Orrery of Bronze, The Deluge Remembered, The Floating Fields, The
        First Distillation). A v40 log that researched one of them names a
        technology this build has never heard of.
      · Every surviving node keeps its **id** — The Imperial Post is displayed
        as *Empire-Building* and Feudalism as *Castellany* — and almost none
        keeps its prerequisites; nine nodes are new (Siegecraft, Artisanry,
        Prospecting, Horology, Banking, Fortification, The Holy Office,
        Alchemy, and the Bowman's line with them).
      · **Iron is named by Iron Working**, not by Bronzeworking, so the reveal
        moment — the label, the access and the tile's own hammer — lands an
        age later, and the Swordsman that used to need it does not.
      · **Niter** is a new strategic seam, so `placeResources` draws a
        different map from the same seed.
      · The roster retunes across the melee, pike and bow lines, and the
        upgrade chains re-link (Warrior → Swordsman → Legionary →
        Longswordsman; Archer → Bowman → Composite Bowman → Crossbowman;
        Spearman → Phalanx → Halberd → Pikeman), so the retooling sweep moves
        different pieces on different turns.

    The migration note: nothing to migrate, and nothing that *could* be. Every
    field a v40 save carries is still a field this version reads; what is gone
    is the tree and the map the log was played against.
42: **The faith rework** (2026-09-02, ledger Entry LVIII, phase 2 — the
    one-charge agents and The Holy Office's tenants). Two commands change what
    they mean, one is deleted, two are new, and a religious agent is worth a
    third of what it was:
      · **A prophet has one charge** and does exactly one deed — found,
        proclaim, gain a belief, or give a pool back. A v41 log's prophet
        planted a site and then went on to proclaim; here the same log's
        second command names a piece that is no longer on the board.
      · **An augur has one charge**: consecrate a god, or perform one rite.
        Three rites out of one augur was the v41 reading and is now three
        augurs' worth of faith.
      · **`enhanceReligion` is gone.** Enhancing is the far end of one belief
        ladder now (`gainBelief`, `nextBeliefPool`), so a v41 log carrying that
        command names a verb this build has never heard of.
      · **`plantHolySite` founds and only founds.** A prophet may no longer
        raise a second site, so a v41 log's later plantings are refusals here.
      · **Founding drafts twice** — one belief, then a second dealt the moment
        the first is answered (`PlayerPantheon.owed`) — and the follower house
        holds three where it held two, so the draws off `state.rng` differ in
        number and in order from the first founding onward.
      · **`purge` is new**, and with it the Inquisitor, the Reliquary and the
        faith bank a town holding one opens for ordinary units.

    The migration note: `PlayerPantheon.owed` absent means an empire owed
    nothing, which is right for every v41 save. It is refused anyway, because
    the board a v41 log produces here is not the board it produced there — the
    agents it spent are worth less and the drafts it opened are dealt
    differently.
43: **The map's layers** (2026-09-02, ledger Entry LVIII, phase 3 — veins, the
    second discovery wave, the deep sea). The **map a seed produces is
    different**, which is the whole of why a v42 log cannot be replayed here:
      · **Veins** are seeded under the hills by a new generation pass
        (`placeVeins`), and `placeDiscoveries` now deals two further layers —
        the barrows and the sea finds — after its own. Every one of those
        draws comes off the same generator, so a v42 seed's board and this
        one's agree on the terrain and the ruins and part company on
        everything the new passes touched.
      · **Rich ore is a new resource row**, the first that is never scattered
        on the surface (`ResourceDef.buried`) — so the surface scatter is
        bit-identical, and the tile a survey turns over is not.
      · **`prospect` is a new command** and the two new tile fields it writes
        (`Tile.vein`, `Tile.surveyed`) did not exist; a v42 log naming it is
        a verb this build has never heard of, and a v42 log that does not is
        a game played on a map without hills worth asking.
      · **A city founded on a gated site drops it**, so a settler's arrival on
        a hex that carried a barrow resolves differently.

    The migration note: nothing to migrate. Both new tile fields are absent on
    every v42 tile, which reads correctly as "nothing buried, nobody asked" —
    what a v42 save cannot carry across is the map itself.
44: **The age-1 restoration and the deepened chains** (2026-09-02, the user's
    pass over revision 3). Entry 41's bump again, for exactly its reason: the
    tree a log was played against is not this tree.
      · **Æra I is restored wholesale to what it was before the re-cut** —
        twelve nodes, **Calendar** among them, back at its old cost with the
        Hanging Gardens, the tithes conversion and the Rite of Plenty on it,
        and with the old prerequisites (Bronzeworking wants Mining *and*
        Earthenware again, Letters wants Divination, The Wheel wants
        Bronzeworking). A v43 log cannot name Calendar and a v43 log that
        researched Letters researched a cheaper, differently-gated node.
      · **Currency 195 → 160 and Irrigation 170 → 190**, so every seat's
        beaker schedule from the middle of Æra II onward parts company with a
        v43 replay's.
      · **Æra III and Æra IV are re-chained** so each lays out in three
        dependency columns rather than one — Empire-Building wants Colonial
        Charters, Paper Money and The Qadi's Court want Empire-Building,
        Machinery and Physics want Prospecting, Movable Type wants Paper
        Money, Steel wants Machinery, Banking hangs off The Silk Road, The
        Holy Office off Movable Type and Alchemy off Steel. A v43 log's
        `chooseResearch` is a refusal here wherever a prerequisite moved.
      · **Forgotten hymns pay 7 culture, not 13**, so the ruin a scout walked
        into no longer settles the opening draft and the draws that follow it
        come off `state.rng` in a different order.

    The migration note: nothing to migrate — no field changed shape. What a
    v43 save cannot carry across is the tree its log was aimed at.
45: **The endgame of Entry LVIII** — the Magnum Opus, the bead-paying great
    works, the Long Count's die and Alchemy's closing bead. A v44 log is
    refused because the *game can now end a way it could not*, and because
    four rows and two payouts move what a replay produces:
      · **The Magnum Opus** is a row the world opens — buildable by every
        empire the moment any seat completes Alchemy — and finishing it closes
        the age: the final reckonings are taken across every seat at once and
        the empire holding the most beads wins, ties going to whoever raised
        it. A v44 log played out here reaches a `winnerId` on a turn it never
        reached one before.
      · **Three great works** (Chart the Stars, The Turning Heavens, The
        Alchemical Codex) join the build lists off The Long Count, Education
        and Alchemy, so the rows a city may queue at those nodes differ; each
        pays a bead, and The Turning Heavens deals a scholars-only
        great-person offer, which spends `state.rng` where a v44 game spent
        nothing.
      · **Alchemy pays a glass bead** to every empire that completes it, and
        **The Long Count pays a die** for every age its holder enters
        afterwards — two new payouts inside `settleResearch`, so a v44 log's
        rods and dice do not match.
      · **A fifth class of bead row** (`grants`) is in the catalogue. It is
        never dealt and never shuffled, so no deck or hand moves; what changes
        is that `Player.beads` may now hold an id a v44 build has never heard
        of.

    The migration note: nothing to migrate — no field changed shape, and a
    game with none of the four rows built serialises exactly as a v44 one
    did. What a v44 save cannot carry across is a finish line its log was
    never played against.
46: **The card pools of Entry LVIII** — the Themes Build's fourth phase, the
    ratified cards. A v45 log is refused because *the tables it was dealt
    from are not these tables*:
      · **Nineteen new Orders and a Doctrine** join four pools that a draft
        draws from without replacement, so every `chooseOrder` and
        `chooseDoctrine` in a v45 log names a different index of a different
        hand. Two beliefs, a pantheon row and a sixth **consecration** join
        their own bags, and the consecration is rolled from `state.rng` when a
        cathedral is topped out — so a v45 game that raised one spent its
        rolls against a five-card table.
      · **The Laureate is reworked** (sheet 09, the user): its once-per-game
        great person is gone and a renown trickle stands in its place, so an
        empire that slotted it in a v45 game was handed a name this build
        never offers and climbs the ladder at a different rate thereafter.
      · **`Player.campsCleared` is a new field** — the tally The Last Hunt
        reads, written at `arriveOnTile`. Every v45 player is missing it,
        which reads as a realm that has cleared nothing rather than as a realm
        whose hunts were never counted.

    The migration note: a v45 `Player` gains `campsCleared: 0`. Nothing else
    changed shape — what a v45 save cannot carry across is the deck.
47: **The column-formula costs and the timeline reshape** (the user, twice, on
    2026-09-02: make the chart read like Civ V's, then price a node off the
    column it lands in). A v46 log is refused because *the tree it was aimed
    at is not this tree, and nothing in it costs what it cost*:
      · **Seventeen prerequisite edges moved**, so that every column of every
        age holds three nodes or more and almost every connector is a step
        rather than a reach. Sailing hangs off Earthenware and the Calendar
        off Divination; Epic Poetry off Kingship; The High Temple off The
        Long Count; Rhetoric off the temple as well as the epic; Colonial
        Charters, Empire-Building, Theology, The Qadi's Court and Education
        are re-chained through Æra III; Machinery, Physics, Movable Type,
        Banking and The Holy Office through Æra IV. A v46 `chooseResearch` is
        a refusal here wherever a prerequisite moved, and a plan the reducer
        expanded for it names different nodes.
      · **Every cost in the tree is rewritten** from the node's own
        `techColumn` by one tapered table (the pricing note in `tech.ts`), so
        the beaker schedule parts company with a v46 replay's on the very
        first technology: 30 where the table said 8. The tree costs 26089
        against 20354, and the ages close on turns 74 / 128 / 252 / 334
        against 34 / 71 / 177 / 265.
      · **Every lane is re-annealed** against the reshaped graph. That is
        presentation only — `row` is never read by a rule — and is named here
        because it moved in the same pass, not because it moves a replay.

    The migration note: nothing to migrate — no field changed shape. What a
    v46 save cannot carry across is the tree its log was aimed at, and the
    prices it was paying.
48: **The user's balance pass** (2026-09-02) — the Order deepening ladder, the
    Order and Doctrine retunes, and the luxury signature rework that landed
    beside it. A v47 log is refused because *the deck it was drafting from is
    not this deck, and what it drafted does not deepen the way it did*:
      · **Deepening is authored now.** `scaleByLevel`'s blanket ×1.5 on every
        printed figure is gone; a level-N Order is its printed effects plus
        N−1 copies of the increment written on its row (`OrderDef.upgrade`),
        capped at `maxOrderLevel` (3) or the row's own `maxLevel`. Every
        deepened holding in a v47 save therefore pays different numbers, and
        sixty-two rows are no longer offered as an upgrade at all.
      · **The rows are retuned** — Border Wardens and Vanguard from +3 to +2,
        Siege Doctrine 5 to 4, Public Granaries 25% to 15%, Weights & Measures
        2 gold to 1, The Tax Farm and Statute Labour from every third citizen
        to every fourth, Master Masons and Rites of Passage doubled, and a
        dozen more. A v47 replay banks different yields from the first turn a
        card is slotted.
      · **Four cards were reworked and two changed pool.** The Salt Road pays
        on strategic seams rather than improved bonus ones, Quarrymen's Guild
        asks for a quarry rather than for stone, River Wardens asks for a
        garrison, The Old Ways is un-retired and doubles what unimproved
        ground pays; Foreign Quarters is withdrawn and The Great Warring
        Tribes moved from the first Doctrine pool to the second, which changes
        what every draft after it deals.
      · **Three Doctrines were rewritten** — The Gentle Yoke, Manifest of the
        Steppe, The Gilded Court — and two replaced outright: Cuius Regio now
        converts a following city's faith into science, and The Academy of
        Deeds is The Academy and no longer doubles a Triumph's renown.

    The migration note: nothing to migrate — no field changed shape. What a
    v47 save cannot carry across is the deck, the numbers on it, and the
    ladder its holdings were climbing.
49: **The cost ladder re-anchored at the first paid tier — the root is not a
    tier** (the user, 2026-09-02: "the first tier should be 13 science …
    I think the agent skipped a tier"). v47's table anchored cost(0) = 13 at
    the *root*, but column 0 holds Agriculture alone and Agriculture is
    pre-granted (`RULES.research.startingTechs`), so the first tier anybody
    ever buys was priced at 30. The whole ladder shifts one column right:
    every column now takes the price the column to its left used to carry,
    the root gets a nominal 5 that is never paid, and the old top figure of
    950 falls off the end. A v48 log is refused because *every node in the
    tree costs something else*: Fletching is 13 where it was 30, Alchemy 920
    where it was 950, the tree 22544 against 26089, and the ages close on
    turns 46 / 91 / 200 / 273 against 74 / 128 / 252 / 334.

    The migration note: nothing to migrate — no field changed shape, and no
    prerequisite moved. What a v48 save cannot carry across is the beaker
    schedule, which parts company with the replay on the first technology
    anybody researches.
50: **Tree revision 4 — the user's own redraw**, and the per-class purchase
    stamps beside it. Four changes, any one of which would be a bump:

      · **Fourteen nodes were renamed** (Pottery, Writing, Chronology, Code
        of Laws, The Saddle, Guildhalls, Satrapies, Daughter Cities,
        Geomancy, Divine Right, Scholarship, Natural Philosophy, The Golden
        Roads, The Counting Houses). Ids are forever, so a v49 log naming one
        still names the same node — this half migrates perfectly and is the
        reason none of them was given a new id.
      · **Three ids were deleted** — `ancestorRites`, `chivalry`,
        `fortification` — and three added: `stateWorkforce` (Æra II),
        `raisedFields` (Æra III), `militantOrders` (Æra IV). A v49 log that
        researched one of the three is dead, exactly as the Wave-1 cuts were.
      · **Almost every prerequisite moved**, so the chart is twelve columns
        where it was fourteen and every cost is re-read off the shortened
        ladder (5 · 13 · 30 · 69 · 135 · 225 · 335 · 450 · 565 · 665 · 750 ·
        820). The tree costs 17920 against 22544 and the ages close later or
        earlier accordingly; a v49 replay parts company on the first node.
      · **The one-unit-a-turn rule is now one per class.**
        `City.purchasedUnitTurn` — a single stamp — is replaced by
        `City.purchasedUnitTurns`, a stamp per `UnitPurchaseBucket`
        (military-with-gold, civilian-with-gold, anything out of the faith
        bank). A v49 log is a *different game* rather than an older one for
        v25's reason in reverse: it was written against a reducer that
        refused a second purchase this one accepts, so a seat that gave up
        and did something else would, replayed here, have been allowed to buy.

    The migration note: one field changed shape and it is deliberately not
    migrated. `purchasedUnitTurn` is stale by itself — it is meaningless the
    moment the turn rolls over — so there is nothing in it worth carrying, and
    a save is `{config, log}` regardless: what replays is the log, against
    this tree and this rule.
51: **The flag rulings — parameter deepening, the scholar draft, the lapis
    trickle, retunes** (`docs/flags.md` section A, answered 2026-09-03). Five
    changes, any one of which would be a bump:

      · **An Order's deepening may move a printed number.** `OrderDef.upgrade`
        takes a second kind of entry (`OrderDeepening`), so The Standing Levy
        musters every 12 / 10 / 8 turns and Pilgrim Roads' happiness cap reads
        5 / 7 / 9 — both were `upgradable: false` in v50 and are drafted as
        upgrades now, which changes what every Statecraft offer holding one
        deals. The fifty-three additive rows are byte-identical, and a test
        pins that.
      · **The Academy sells a draft of scholars for 1000🕯.** A third entry in
        the great-person purchase register, gated by a new
        `buyScholarDraftWithFaith` action rule, and the command's field is
        `buys` where it was `currency` — a v50 log naming `currency` no longer
        resolves to a purchase, so it is refused.
      · **`noSettlerEscalation` is retired**, the id and its clause: no card
        has carried it since the balance pass, and the settler ladder now
        always climbs.
      · **Three retunes.** The Gentle Yoke asks 2 authority a city where it
        asked 3, Militia Levies gives 4 defense (deepening by 2) where it gave
        5, and River Wardens moved from the first Order pool to the second —
        which changes what every draft after it deals.
      · **Lapis lazuli pays renown.** A new resource-effect shape
        (`renownPerCity`, +1 a city a turn from Æra III) joins
        `explainRenown`'s list, so a realm holding the stone recruits sooner.

    The migration note: nothing to migrate — no field changed shape. What a
    v50 save cannot carry across is one command's spelling and four cards'
    arithmetic. The Gentle Yoke's ratified reading — the extra authority asked
    only of cities founded *after* it is taken — is still deferred on its row
    and still wants the same field the King List wants: a founding turn on
    `City`, which nothing in this state keeps. Add that field and both are one
    comparison each.

v52: Curious Elders and Triumphs retired by the user's word — both leave the
draft pools (rows kept so a save that holds them replays), which moves every
draw after the first affected draft.

v53: tree revision 4.1 — the user's arrows verbatim (edges, columns and the
fourteen-figure ladder all moved), so a v52 log replays into a different
world and is refused.

v54: revision 4.2 — the drawn columns are data: authored columnShift on
four nodes, columns 9-12 constitute Æra IV (Scholarship, Geomancy,
Machinery, Divine Right and Paper Money re-aged; State Workforce joins
Æra III), and Alchemy takes all five closing lines as parents. Costs and
ages both moved, so a v53 log replays into a different world and is
refused.

v55: the playtest notes (2026-09-03) — plantations move to the Calendar,
the Standing Stones improvement is deleted, Raised Fields drops the
Terraces for a mountain-side farm renewal and the floating gardens, the
workshop and the Stele of Laws are retuned. Two of those are *table*
deletions (an improvement id and a building id), so a v54 log that laid a
ring of stones or raised the Terraces has no row to replay into and is
refused rather than quietly dropping the thing it built.

v56: **war and diplomacy, phase one** (`docs/war-diplomacy.md`, ruled
2026-09-03) — and it is the one bump in this list that refuses an old log for
a *legality reversal* rather than for a table that moved. Everything else
here changed what a command produced; this changes which commands are
commands at all.

  · **Violence against another empire is illegal at peace.** Combat, pillage
    and the plunder that rides an advance all gained one `atWar` clause, so a
    v55 log — written against a reducer in which any blow between any two
    seats was simply legal — may contain an attack this one refuses. Replayed
    here it would leave the defender alive, the raider unpaid and every
    seeded thing after it shifted, which is precisely the case a bump exists
    for. The wild is untouched on both sides: it has no row in the register
    and `atWar` answers *true* for it without looking.
  · **Borders close at peace.** A military piece may not enter another
    empire's territory unless the two are at war; civilians and caravans pass
    as they always did. One clause in `canTransit`, so the four readers of
    `stepCost` inherit it — which means a v55 march that crossed a neighbour's
    fields is refused here, and every standing order behind it arrives
    somewhere else.
  · **Two registers and five verbs.** `GameState.wars` and `GameState.truces`
    (`wars.ts`), and `declareWar`, `proposePeace`, `withdrawPeace`,
    `annexCity` and `razeCity`. A v55 log naming none of them replays
    byte-identically *as a log*; what it cannot replay is the world, for the
    two reasons above.
  · **A captured town is a puppet.** `City.puppet` and `City.wasCapital`,
    both presence-is-the-state, so a game with neither serialises exactly as
    a v55 one did — but a v55 capture priced its authority and its
    contentment at the full rate from the turn it happened, and this one does
    not.

    The migration note, said plainly because it cannot be fixed: *absent
    means "annexed"*, which is right for every town in an old save except the
    ones that had just been taken — v55 recorded no reason to mark them — and
    `wasCapital` could not be inferred from a board at all, since
    `capitalCityOf` is derived and a seized palace stops reading as one the
    instant it changes hands. A replay of the log re-derives both; the bump
    refuses the snapshot and keeps the log honest.

v57: **war and diplomacy, phase two — deals exist** (`docs/war-diplomacy.md`,
section 7). A v56 log knows no deal commands, so it replays as a log; what it
cannot replay is a world in which the four verbs below were available and one
technology hands over a verb it did not hand over before.

  · **Two registers and four verbs.** `GameState.deals` and
    `GameState.dealProposals` (`deals.ts`), and `proposeDeal`, `acceptDeal`,
    `declineDeal` and `withdrawDeal`. Both serialise as empty arrays in a
    game nobody has bargained in, so a world with no diplomacy in it reads
    exactly as a v56 one did.
  · **`proposePeace` widened.** It carries optional `give`/`take` terms, and
    a bare offer now means *sign whatever paper is on the table* rather than
    "white peace" flatly — with no terms standing the two readings are the
    same command, which is why every v56 peace still replays, but a peace can
    now hand over coin, seams, a right of way and towns.
  · **A luxury may be lent.** `openedResource` gained a clause between the
    reveal gate and the works: a seam an empire has lent out is not in its
    hands, and one lent to it is (`controlledHoldings` at empire scale). The
    happiness, the signatures and the copies all follow, so a v56 board with
    the same tiles on it can be worth different meters here.
  · **Writing hands over a verb.** `letters` grants the `openBorders`
    ability, which is a row in `data/techs.json` and therefore a change to
    what the tech screen shows and what the compendium generates.
  · **A city may change hands without a battle.** `handOverCity` is the
    shared half of `captureCity`, and a ceded town arrives a **puppet** with
    `captured` raised — but with none of the conquest's riders, no triumph,
    no bead and no battered walls.

    The migration note: nothing to migrate — no field changed shape, and both
    new arrays default empty. What a v56 save cannot carry across is the
    world its log would build, for the two rule changes above.

v58: **puppets buy nothing** (ruled 2026-09-03, Civ V's rule). One clause in
`purchaseError` and one in `tilePurchaseError`: a town taken by force and not
yet annexed has no purse — no unit, no building, no ground — and annexation
is the verb that opens one. It is a **legality reversal** of v56's own making
rather than a table that moved: a v57 log may contain a puppet's purchase
this reducer refuses, so it is a different game rather than an older one.
Nothing changed shape and there is nothing to migrate.

v59: **the playtest nerf batch** (ruled 2026-09-03, `docs/flags.md`). Two
cards leave the bags and one is narrowed, and all three are the same kind of
break: a draft's options are *drawn* from a pool, so a hand dealt from a
shorter bag is a different hand, and a v58 log names indices of triples this
build does not deal.

  · **The Greenwood Law is retired** — the Government II pool is one card
    shorter. The row stays and its effects stay live for a save that already
    holds it slotted.
  · **Athenaeum of the Road is retired** — the first Doctrine ever withdrawn,
    which is what put `retired` on `DoctrineDef` and the filter in
    `poolDoctrines`. The tier-4 triple is drawn from six rows where it was
    seven.
  · **The Unbroken Land is narrowed** to unimproved forest and jungle, where
    it paid on every unimproved hex. A v58 board with the same tiles on it is
    worth different yields here, so it is not merely a shorter bag.

    The migration note: nothing changed shape and there is nothing to
    migrate. Every retired row is still readable by `anyCardDef`, which is
    the whole reason a withdrawn card is marked rather than deleted.

v60: **the 9/3 wave** (ten rulings in one push, `docs/flags.md`; each alone
would have earned the bump, and they land together so they share one).

  · **Routes are land or sea** — `startRoute` grew `mode`, a sea route lays
    no road, and the pair gate went directional (the return leg is its own
    route). A v59 log's absent-mode `startRoute` now takes the land path
    where it may have paved a mixed one, and `TradeRoute.sea` is a new
    optional field (absent = land, so an old route reads as what it was).
  · **Obsolete units leave the list** — `buildError` refuses a superseded
    row, so a v59 log's "build warrior" after Bronze Panoply is refused
    here; the `awaitsTech` stop also retypes fewer pieces on upgrade.
  · **The pangaea** — `generateMap` reads a new mask; every seeded map is a
    different board, which is the deepest break of the five.
  · **The late columns re-priced** — Æra III/IV costs roughly doubled and
    tripled; a v59 log's research completions land on different turns.
  · **Dry settles grow slower** — a −30% growth-surplus line on a city off
    fresh water until a `waters` building stands; every dry town's growth
    dates move. (The economy pass rode along: crowding on, palace 6,
    gold prices ×2 — tables, not shapes.)
  · **A route may end abroad** — `routeStartable` accepted only two towns of
    one empire and now takes a foreign partner at peace with a met seat, so a
    v59 log's `startRoute` to another empire's town was *refused* where this
    build accepts it and pays for it. What such a route pays is its own table
    (`trade.international`): no building lines, the sender's science, culture
    and coin, the host's one coin.
  · **The Order draft changed shape twice** — `livePool` is the current
    government's pool alone (the previous government's leftovers no longer
    ride along), and a hand of three or more now guarantees one card of each
    slot type before it fills. Both move what the generator deals from a
    given state, so a v59 log's `chooseOrder` picks name indices into hands
    this build does not deal.
  · **The card table itself changed** (the user's own pass over
    `docs/orders-and-doctrines.md`) — three rows are **retired** and leave
    every pool (Border Ballads, Wolf-Runners, Mountain Hold), two rows are
    **new** (The Sacred Path, First Fruits), and six rows say something
    different from what they said in v59: Thalassocracy is a yield conversion
    rather than two percentages and a writ discount, Wolf-Mother's Pact is
    its conversion clause alone and the convert arrives whole, The Founders'
    Road founds no Monument and pays culture instead, Bread and Circuses asks
    for six citizens and charges two coin, The Gentle Yoke softened to −15%,
    and Hearth Songs pays two. Every one of those moves what a pool *deals*
    as well as what a held card *does*, so a v59 log's `chooseOrder` and
    `chooseDoctrine` pick indices into offers this build does not deal, and
    the empires that survive the picking are worth different numbers.
  · **The great people were re-priced** (the user's own pass over
    `docs/great-people.md`) — the **acts** first: a scholar paid a share of
    the aimed technology's cost and an artist a flat forty, and both now pay
    `actGainTurns` **turns of the empire's own rate** (`actGainOf`, read off
    `empireRateReading`), so `scholarShare` and `artistCulture` are gone from
    `rules.greatPeople` and neither arm ages with the tree any more. Then the
    **roster**: one name is struck off entirely (Li Jie — a great person is
    consumed rather than withdrawn, so there is no retired marker to set) and
    thirty-odd rows say something different from what they said in v59 —
    numbers moved, malices struck (Archimedes keeps no revocation, Homer's
    army heals abroad), and half a dozen cells re-written into other shapes.
    A v59 log's `chooseGreatPerson` therefore picks indices into offers this
    build does not deal (the pool is one name shorter and the draw walks it in
    data order), and the empires that survive the picking are worth different
    numbers.
  · **A town's people can be pointed** (the citizen focus pane) — `City.focus`
    and `City.avoidGrowth` are new player intent the board cannot recompute,
    and `setCitizenFocus` is the verb that writes them. The break is not the
    two fields (both absent on every v59 town, both meaning what a v59 town
    meant): it is that the **assignment itself moved**. The settler lean is no
    longer a sheet of its own — `citizenWeightsWhileHalted` is gone and the
    halted town reads `citizenFocusWeights.production`, one step stronger than
    the sheet it replaces — so a v59 log replayed here seats a halting town's
    citizens on hexes it did not, and every yield that follows from where they
    stand is a different number.

    The migration note: three additive optional fields (`TradeRoute.sea`,
    `City.focus`, `City.avoidGrowth` — absent reads as what an older town
    was) and one additive row marker (`BuildingDef.waters`); a deleted roster row is
    read by nothing that keeps state (`Player.legacies` and
    `GameState.recruited` are both guarded by `isGreatPersonId`), so nothing
    else changed shape and there is nothing to migrate.

v61: **the card-shapes pass** (ruled 2026-09-04, `docs/history/card-shapes.md`). Nine
new Orders, two retired ones and a reworked third, which is v59's break at a
larger scale: a draft's options are *drawn* from a pool, so a v60 log's
`chooseOrder` names indices into triples this build does not deal.

  · **Nine rows join the pools** — the deck-readers (The War Council, The
    Guild Charter, The Synod) in Government II with The Harvest Songs, and
    five in Government III (The Salting Houses, The Drafting Halls, The
    Golden Scales, The Arsenal Law, The Charter of the Marches). Both bags
    are four and five cards longer.
  · **The Salt Road and Hearth Songs are retired** — Government I and the
    chiefdom are one card shorter each. Both rows stay and stay live for a
    save that already holds them slotted.
  · **The Last Hunt pays twice** — the same count in a second voice, so a
    v60 empire holding it is worth a different science figure here.
  · **A founding pays the realm** — `foundCityAt` fires a new `found`
    windfall occasion at the end of its work. No live row but The Charter of
    the Marches rides it and it draws no dice, so a v60 log founds exactly
    what it founded; what changes is what an empire holding that card banks.

    The migration note: nothing changed shape and there is nothing to
    migrate. The two retired rows are still readable by `anyCardDef`, which
    is the whole reason a withdrawn card is marked rather than deleted.

v62: **the renewals axe** (ruled 2026-09-04, `docs/flags.md`: "lets do this
now. This is part of the problem"). A technology no longer makes a building
that is already standing pay more. Nine `BuildingUpgrade` rows are struck —
the granary's two points of food (The Wheel, Irrigation), the barracks' two
hammers (Bronze Panoply, Iron Working), the library's three lines
(Mathematics, Divine Right, Movable Type) and the market's four coins (Paper
Money, The Counting Houses) — and the shape, the sim's reading of it and the
`buildingRenewal` gift kind go with them.

  · **A v61 log replays into different towns.** The renewals were free growth
    that arrived with a research settlement rather than with a command, so a
    v61 empire holding The Wheel banked a fourth point of food in every
    granary this build does not pay. Every figure downstream of a city's
    yields — growth, hammers, the treasury, when a queue finishes — is a
    different number from the turn the first of those nodes lands.
  · **A building is worth its row in every empire.** `explainBuildingYield`
    no longer takes a context and `explainCityBuildings` no longer takes the
    state: the only thing either asked the empire for was the technologies
    that renewed a building.
  · **Improvement renewals stay.** The farm's irrigation rider and its three
    siblings are a fact about *ground a worker went and improved*, which is
    the bargain the ruling left standing; so is a building's `tileYields`
    line, which pays only the hexes a town actually works.

    The migration note: the deleted field was optional on every row and is
    read by nothing that keeps state, so nothing changed shape and there is
    nothing to migrate. What moved is what the same log is worth.

v63: **the levelling axe, and the skip** (ruled 2026-09-04, `docs/flags.md`:
*"no more upgrading altogether, all cards are as is. Players are given an
option to skip and increase the rarity of their next draft"*). An Order is
what its row prints, held once, in every empire; a draft is take one or pass.

  · **Levels leave the state.** `PlayerStatecraft.orders` was a list of
    `{id, level}` and is a list of ids. A v62 save holding anything at level
    2 or 3 was paying a face this build does not compute, so every ledger
    downstream of a slotted Order — yields, happiness, combat lines, offer
    size, route slots — is a different number from the draft that deepened it.
  · **A v62 log picks options this build does not deal.** The upgrade was the
    *last* option of every draft an empire held anything for, so `chooseOrder`
    at that index named a deepening here and names nothing at all now; and the
    upgrade roll spent a generator call after every hand, so the whole
    sequence of draws diverges from the second draft onward.
  · **The draw is weighted.** Every Order row carries `rarity`, and each of
    the four sub-bags of the guaranteed spread is drawn by weight
    (`rarityWeights`: common 4, uncommon 2, rare 1) rather than uniformly —
    so a v62 log's very first draft already deals a different hand from the
    same seed.
  · **A new command and a new field.** `skipOrderOffer` spends a draft
    without taking a card and raises `PlayerStatecraft.orderSkips`, whose
    count adds `skipPity` to the uncommon and rare weights of the next draw;
    taking a card zeroes it.
  · **Two card readings change with the word "level".** The Archives pays
    per Order in a slot rather than per level of one (`CountKind`'s
    `slottedOrders`), and the bead quests that read the council are re-cut —
    The Long Reign asks for ten slotted Orders, and The Deepening is struck
    from the table outright because there is nothing left for it to ask.

    The migration note: `orders` changed shape, so a v62 save cannot be read
    and there is deliberately no migration (`NO_MIGRATIONS` — saves are
    `{config, log}` and replay). `OrderDef.upgrade`, `maxLevel`,
    `upgradable` and `StatecraftConfig.maxOrderLevel` are gone from the data
    table with the machinery that read them.

v64: **the sim singles** (ruled 2026-09-04, `docs/flags.md` queue item 5 —
four small rulings that would each have earned a bump and land together).

  · **The swordsman requires iron.** One field on one row
    (`UnitDef.requiresResource`), and it moves three things at once: a v63 log
    that queued or bought a swordsman with no mine working is refused here;
    the warrior above it stays on the build list one age longer, because
    `upgradeTargetForType` stops at a rung the empire cannot field; and a town
    whose owner holds no iron defends with a weaker garrison, since "the
    strongest unit its owner could train" asks `buildError`.
  · **A puppet takes no contributions.** One clause in `contributeError`,
    `purchaseError`'s own sentence — v58's legality reversal finished, so a
    v63 log's pour into a puppet's basket is refused here.
  · **A meeting is permanent.** `Player.metSeats` is new state: a sorted
    per-seat register written by `recordMeetings` (`visibility.ts`) the first
    time a seat sees a rival's piece or a rival's ground, and read as
    `hasMetSeat`'s first clause. Meeting used to lapse with the sighting that
    made it, so a v63 log's `startRoute` to a foreign town may be *accepted*
    here where it was refused. The wild is never met, in either direction.
  · **The Magnum Opus opens at 20 beads.** `buildError` refuses the row that
    `endsTheGame` to an empire holding fewer than `BEAD_RULES.threshold`
    beads, and the threshold's old reading — first seat to it wins outright,
    which never once decided a game — is retired with `namePossibleWinner`.
    `GameState.winnerId` has two writers now instead of three.

    The migration note: one additive field (`Player.metSeats`, empty on every
    seat a v63 game would have had — the derived clauses of `hasMetSeat`
    backfill it, which is why they stayed) and nothing else changed shape.
    What moves is what the same log is worth, and which commands it may
    contain.

v65: **the growing cards, and the war order** (ruled 2026-09-04, `docs/flags.md`
queue item 6 — the sheet's proposed additions, first half).

  · **The scaling counter is new state.** `PlayerStatecraft.tallies` is a list
    of `{card, count}`, one row per growing Order that has ever counted
    anything, in the order each counter opened. It is written in exactly one
    place (`recordScalingOccasion`) and only for cards **in a slot** at the
    moment the occasion fires — the standing ruling of `docs/history/doctrine-ideas.md`:
    the bench is never productive and nothing is retroactive. Five hooks feed
    it, each at a seam that already existed: the battle riders (a barbarian
    killed, one of yours fallen), `claimWonderFor` (a wonder finished
    *anywhere*, written into every realm's books), `spendGreatPerson`, and the
    gold branch of `purchaseItemAt`, which banks the coin itself so the card's
    divisor keeps the remainder.
  · **Six new Order rows** — The Ballad-Weavers · The Bell-Founders · The
    Reliquary Rolls · The Chroniclers of the Fallen · The Almoners' Book · The
    Casus Belli. Rows in a pool change what every draft deals, so a v64 log's
    very first hand comes out different from the same seed.
  · **One new occasion and one new count.** `WindfallOccasion`'s `declareWar`
    fires for the declaring seat in `declareWarAt`, and The Casus Belli hangs
    an ordinary `grant.timed` on the empire from it — a labelled strength line
    and a staged production percentage, expiring by comparison ten turns on.
    `CountKind`'s `tally` is the growing cards' reading of their own counter.
  · **Iron reveals at Bronze Panoply** (the same day's ruling, landed
    separately and riding this bump): the seam now surfaces on the swordsman's
    own rung instead of arriving with the legionary that supersedes it. One
    field on one row (`ResourceDef.requiresTech`), and it moves what a v64 log
    is worth — a mine worked, a hex priced and a garrison's strength all read
    the reveal.

    The migration note: one additive field, and it is empty on every seat a
    v64 game would have had — but the draws move, so there is no reading under
    which a v64 log replays to the same board.

v66: **the eleven charters** (ruled 2026-09-04, `docs/flags.md` queue item 6 —
the sheet's proposed additions, second half). A charter is an Order that opens
a *building* while it is slotted; the mechanism is the Gilded Court's
(`cardUnlocksBuilding`), and built copies stand for ever whatever the deck
later does.

  · **Eleven new Order rows** across three pools — The Rites Charter · The
    Vigil Charter (Government I); The Scriveners' · The Coin · The
    Waterwrights' Charter · The Senatus · The Toolmakers' Charter (Government
    II); The Mint · The Almshouse · The Stargazers' · The Justices' Charter
    (Government III). Rows in a pool change what every draft deals, so a v65
    log's very first hand comes out different from the same seed.
  · **Eleven new building rows** — Chapel, Keep, Scriptorium, Assay House,
    Cistern, Assembly Hall, Smithy, Coinworks, Almshouse, Orrery, Assize
    Court. None is named by any technology, so each is shut until its charter
    is in a slot. **A charter's building is the charter's** (the user's
    amendment of the same day): the Mint Charter and the Stargazers' Charter
    first opened the tree's own Æra IV Mint and Observatory *early*, and now
    hand over rows of their own instead — so those two nodes open exactly
    what they opened before the charters shipped, and every clause a charter
    pays rides its own building rather than the Order. `isUnlocked`'s card
    clause keeps the general rule it grew (a card stands in *front* of the
    tree's gate, never in place of it), read by no row today.
  · **Four new building facts, each read in exactly one place**:
    `crowdingRelief` (`explainHappiness`), `purchaseDiscount`
    (`explainPurchaseCost`, folded into the rider sum so the price multiplies
    once), `healsAdjacent` (`healUnits`), `ritePays` (`performRiteAt`, paid
    through `settleCultureWindfall`). `faithPurchases` became a word —
    `'all'` for the Reliquary, `'civilian'` for the Almshouse — rather than
    growing a second boolean beside itself.
  · **One widened scope.** `CityScope`'s `mountainAdjacent` takes an optional
    `radius`, `frontier`'s field one scope over, for the Orrery's two hexes.
    Absent is the ring of six every row written before it reads.

    The migration note: no field on the state changed shape at all — every
    addition is on the data tables. What moves is what the same log is worth:
    eleven rows in three pools redeal every draft.

v67: **the synergy-density pass** (ruled 2026-09-05, `docs/history/loop-review.md`
section 4 — the user's marginalia on the rework table). A pool of flat
numbers is a pool where no two cards are better together than apart, so eight
rows stopped being flat and started reading the council, the buildings or the
coin beside them. **No new shape was added**: every row below is written in
the vocabulary the card-shapes pass left (`slottedOrdersOfSlot`,
`yieldConversion`, `hasBuilding`, `conditionRule`'s `atWar`), which is what
makes this a data pass with a schema bump rather than a change to the
evaluator.

  · **Eight rows reworked.** Boundary Stones hurries the borders only where a
    Monument stands; First Rites reads the wildcards in the council; Harbour
    Dues became the Tide's conversion (coastal gold paid again as culture);
    Scholars' Stipend climbs a Library-then-University ladder; Ore Tithes and
    Provincial Governors read the military and economic benches; Border
    Wardens absorbed **Vanguard**, which is retired in its favour, and grows
    a point for every military Order in a slot.
  · **Three new Order rows** — The Banner-Call (Government II, the war line's
    one card from the breadth audit), The Far Charts (Government III, the
    Wayfarers' payoff) and The Wolf-Standard, which ships **retired** with its
    one clause `deferred`: a camp's bounty reaches the treasury and the
    nearest town, and nothing in the windfall vocabulary can share a payout
    out among every city.

    The migration note: no field on the state changed shape, and nothing a
    v66 save holds is invalid — a retired row keeps paying whoever already
    drafted it. What moves is the draws: rows leaving and joining three pools
    redeal every hand from the same seed, so there is no reading under which
    a v66 log replays to the same board.

v68: **the cards pass** (ruled 2026-09-05, `docs/history/cards-pass-2.md`) — the two
late Order pools, the cuts, the modifications and the holes, in one bump
because every one of them moves the same thing: what a draft deals.

  · **Government IV and Government V are pools.** `poolOfGovernment` answered
    `governmentIII` for every rung above eighteen, so a tier-29 or tier-45
    empire re-drew the shelf it had already emptied; each rung of the ladder
    opens its own now, stocked with twenty-seven new Order rows. A v67 log's
    `chooseOrder` past the third rung names indices into hands this build
    does not deal.
  · **Eight rows are retired and eight say something different.** Militia
    Levies, Horse Lords, The Muster Roll, Land Grants, The Shield Wall, The
    Quartermasters, The Common Purse and Public Granaries leave every pool
    (kept for saves); Far Runners pays sight and ruins instead of a scout's
    legs, River Wardens dropped its garrison clause, The Great Warring Tribes
    is two clauses, Village Fairs is uncommon, Bread and Circuses pays two,
    The Scattered Hearths waives two. Nine rows are new (seven Orders, The
    Horse-Tribes, and the late Doctrines' struck halves), and The Master
    Builders' production sign was inverted and is fixed — that row made the
    Opus *slower* than its own text promised.
  · **One new count.** `CountKind`'s `roadHexes` (The Long Roads), read off
    `Tile.road` — the one field `layRoad` writes.

    The migration note: no field on the state changed shape, and a retired
    row keeps paying whoever already drafted it. What moves is the draws, and
    they move in every pool, so there is no reading under which a v67 log
    replays to the same board.

v69: **the Great Work wins it** (ruled 2026-09-05, `docs/flags.md` — "the
victory rule, and what Æra V is for"). One rule, one function, and it is here
because it changes **who won a game that has already been played**.

  · **Finishing the Magnum Opus wins outright.** `closeTheGreatWork` named the
    seat holding the most beads and broke a tie for the builder; it now names
    the builder, full stop. The beads are the *door* — an empire may not begin
    the row below `BEAD_RULES.threshold` (schema 64, unchanged) — and no
    longer the close.
  · **The reckonings stay, as history.** The closing age's measures are still
    taken by `takeReckonings`, and the golden bead is still on the builder's
    rod before the curtain: an age that ended unmeasured would be a hole in
    the record. Neither decides anything now.

    The migration note: no field on the state changed shape and no draw moves,
    so a v68 log replays to the same board — but not to the same *verdict*. A
    v68 game whose Opus was raised by a seat that did not lead the rods was
    won by the leader; the same log here is won by the builder. That is
    exactly the kind of divergence a version number exists to refuse.

v70: **the Æra III fork** (ruled 2026-09-05, `docs/history/age-three.md` sections 1–3
with the user's marginalia). The third age is where a game forks toward war or
toward a victory road, and the fork was illegible: three tier-18 governments
whose signatures said nothing about the chairs they dealt, a Pool III with no
faith pick and no science pick, and a five-turn seal that made a Æra III
commitment as cheap as a Æra I one.

  · **Each tier-18 government reads its own dominant chair.** Divine Mandate
    pays its capital a candle and a note for every wildcard Order slotted (and
    +10% faith in its larger towns); Imperium pays every city a hammer for
    every military Order slotted, keeps the movement, and pays +50 gold and a
    whole army's health for a captured town; the Merchant League pays two coins
    for every economic Order slotted, keeps the routes' half again, and runs
    one more route. Written in the vocabulary the card-shapes pass left
    (`slottedOrdersOfSlot`, `routeRider`, the `capture` occasion's `healAll`),
    so the signatures are data.
  · **Pool III is eleven rows.** The Iron Price is sharpened (a kill pays 20
    culture, a pillage pays double); The Gilded Court dropped its authority;
    Master of Maps became the Geomancy row (a vein surfaced and a ruin claimed
    each pay 25 science); Hegemony is the user's own rewrite — a captured city
    at the writ's floor, and 5% more production everywhere for ten turns after
    a capture. Three rows are new: The Pilgrim Ways (faith), The Natural
    Philosophers (science) and The Deep Delving (the Highlands' second
    Geomancy path).
  · **One new occasion.** `WindfallOccasion`'s `veinFound`, fired from
    `prospectAt` on a strike and only on a strike — `prospect`'s other half,
    because that occasion pays for the *asking* by design and a rider that
    fired only on ore would have been a second rule about what a survey is.
  · **A `fromRate` grant may quote a *share* of a turn** — The Natural
    Philosophers' fifth of the realm's culture, floored in `windfallPayout`
    with every other figure (a windfall is a whole number all the way down)
    and printed as a percentage rather than as a fraction of a turn. The
    Lyceum's whole turn reads and pays exactly as it did.
  · **Two rarity marks move** — Cistern Works ●→○ (the best rule-changer in
    Gov II) and Mandate of Heaven ○→◆ (large, not rule-changing). The pass's
    third proposal, a ten-turn seal from Government III on, was **vetoed by
    the user the same day**: swapping a card in and out is skill expression,
    so a seal is the same five turns on every shelf.

    The migration note: no field on the state changed shape. What moves is
    what the same log is worth — three rows join the tier-18 Doctrine pool and
    two rarities change the weights, so every draft from a v69 seed deals a
    different hand, and a v69 seat under Imperium or Divine Mandate was
    collecting different yields from the same board.

v71: **faith's currency** (ruled 2026-09-06, `docs/history/fewer-things.md` §3 and §1's
reroll row; the batch is `docs/fewer-things-plan.md` C1). The Magister's dice
were a bank the game filled and nothing ever drew on; faith is the supplement
the design actually wanted, so the dice go and faith buys two things.

  · **The dice are gone.** `Player.dice` and `BeadRules.startingDice` are
    removed, eight bead boons lose their `dice` grant, Chronology loses its
    `ageEntryDice`, and The Auspicious Seal — the one Order that paid one — is
    **retired** (the row kept for replay, out of every pool, as The Loose Rein
    is). Nothing spent a die, so no outcome moves for it; what moves is the
    draw, because a retired row leaves the Government III bag.
  · **The faith ladder deals the pantheon.** `PlayerPantheon.rungs` counts the
    consecrations the bank has paid for, `RELIGION.ladder` prices them (40,
    +15 a rung, at a 1.5 exponent — the augur's old price ladder), and
    `openFaithLadder` opens a belief draft the moment `Player.faithPool`
    covers the next rung. The offer carries the price it quoted
    (`BeliefOffer.rungCost`) and the **pick** pays it. The augur's own
    Consecrate is untouched and stays until batch C2 retires it.
  · **A draft may be rerolled for faith.** `rerollOffer` redeals an Order hand
    (`PlayerStatecraft.rerollsTaken` is the empire's bill, `RELIGION.reroll`
    the price, Chronology's Long Count the door) or a belief hand (free, and
    counted by nothing). `SlottedOrder.rerollsSeen` — declared in the shapes
    batch — is written for the first time here.

    The migration note: a v70 save does not load. Two fields left the player
    (`dice`) and the rules (`startingDice`), two joined
    (`PlayerStatecraft.rerollsTaken`, `PlayerPantheon.rungs`), and a retired
    Order changes every Government III draw from the same seed.

v73: **buildings with chains** (ruled 2026-09-06, `docs/history/fewer-things.md` §2 and
`docs/history/tech-gifts.md` §7; the batch is `docs/fewer-things-plan.md` D). The
ordinary building list was thirty-eight rows of which most were a flat with a
different name. It is twenty-six, ten of them behind a parent.

  · **`BuildingDef.requiresBuilding`** — a parent that must stand in the same
    town, refused in `buildError` (and therefore in `purchaseError`) and shown
    on the add-list row and the Compendium entry. Ten chains: Palisade → Stone
    Walls → Castle · Monument → Amphitheater · Market → Bazaar, Bank ·
    Harbour → Shipyard · Library → University → Observatory · Workshop → Forge
    · Shrine → Temple. A **grant ignores the chain** — neither `realiseItem`'s
    completion grants nor `cardFoundingRider`'s founding list asks `buildError`.
  · **Twelve rows leave the buildable set.** Ten wear `BuildingDef.retired`
    (Funeral Games, the Stele of Laws, the Monastery, the Baths, the
    Examination Hall, the Clocktower, the Reliquary, the Mint, the Armoury,
    the Printing House); the Forum and the Caravanserai are **re-cut in place**
    as two of the five uniques. The Town Charter is `grantedOnly` — Daughter
    Cities' founding rider was already the only honest way to get one. Every
    row stays in the table so a save that raised one still replays, and a copy
    already standing keeps paying.
  · **Five unique buildings** (`oncePerEmpire`), each on its node and each at
    about half its age's wonder: the Heroic Epic (Epic Poetry), the Imperial
    Throne (Kingship), the High Temple (The High Temple), the Forum
    (Philosophy) and the Caravanserai (Mathematics). Three new `BuildingId`s.
  · **`Unit.upkeepRebate`** — the Throne's placement half, stamped in
    `realiseItem` off the town's own buildings and read as a give-back line in
    `explainUnitUpkeepRebate`. Not `freeUpkeep`: a partial rebate on a piece
    the empire did pay for.
  · **The science cut** (`docs/balance-turn.md` §4b): `rules.cities.sciencePerPop`
    1 → 0.5 and the Library's own line 1 → 0.5, with the −25% of §4a on the
    ordinary flats that survive as flats.
  · **Three bead deeds re-aimed** off cut rows — The Great Games to the
    Amphitheater, The Mint to the Bank, The Muster of the Realm to the Forge.

    The migration note: a v72 save does not load. One field joined the unit
    (`upkeepRebate`), three joined the building table, `data/buildings.json`
    re-prices eleven rows and adds three, and three endeavours name different
    buildings — so a v72 log replays into a different board from the first
    turn a town finishes anything.

v74: **rites, prophets, the apostle** (ruled 2026-09-06, `docs/history/fewer-things.md`
§3 and §6.3; the batch is `docs/fewer-things-plan.md` C2 — which the plan
numbered 72 and which lands here because the buildings batch reached `main`
first; the numbers are a sequence, not a name). The user's own complaint about
the augur — *"i never wanted to invest in my chapel because i was so far ahead
and didnt want to waste time paying for augurs and using them in my cities"* —
is a complaint about an **errand**, so the errand goes and the season stays.

  · **A rite is a city's verb.** `performRite` names a `cityId` where it named
    a `unitId`, a hex and a belief; the town must not already be keeping
    one (the tree is the only gate — no building opens the verb), and the price
    is the faith ladder's rung for the age (`RELIGION.rite.costByAge`, 40 · 56
    · 72 · 90). The five surviving rows are reworked to ten turns of pure
    blessing — there is no instant grant left anywhere — and the two that no
    longer fit (Recasting the Omens, The Preaching) are **retired**, rows kept
    for replay, with their two abilities gone from `AbilityId` and from the
    tree.
  · **The augur is retired** (`UnitDef.retired`, the row kept): `buildError`
    and `purchaseError` refuse it and `consecrateError` always refuses, so the
    verb survives for an old log and the piece is never made again. The
    pantheon belief that counted charged augurs is renamed **The Vigil** and
    its effect deferred until a city condition can ask "is a rite live here".
  · **The prophet carries two charges again.** Founding and drawing a belief
    take the whole piece; a proclamation and the new **empire rite** —
    `empireRite`, one of the five said over every town at once for one price —
    take one each. `redraftBeliefs` is gone from the union.
  · **The apostle** joins the roster at Theology: two charges, four movement,
    `proclaims` its marker, and three acts of a charge each — `proclaim` at
    half a prophet's lump within six hexes, `healAdjacent`, and `placeRelic`.
  · **The relic is a building** (`BuildingDef.placed`, the `relic` row): never
    built, never bought, one per town that has topped out a cathedral, paying
    `RELIGION.relicFaith` a turn through the ordinary building fold and
    following the stones on a capture.

    The migration note: a v73 save does not load. The rites' rows changed
    shape and duration, two abilities left the tree, the prophet's charge
    count changed, and a unit type joined the roster — so a v73 log replayed
    against this table would perform different rites for different lengths
    with different pieces.

v75: **exact yields** (ruled by the user, 2026-09-06 — *"could we just have
yields be valid as decimals? Just don't show this to the player, but behind
the scenes all yields should be calculated exactly"*; the batch is
`docs/fewer-things-plan.md` X). Batch D halved `sciencePerPop` to 0.5 and the
scripted five-town empire's Æra I close slid 66 → 236, because the beaker was
floored **per town**: a size-1 village at half a beaker banked nothing at all.
The floor was inside the fold, and the ruling takes it out.

  · **Nothing is rounded inside a yield fold.** `applyStages` (Entry XVII's
    two multiplications) returns the exact product; the science-per-pop lines,
    the tile percentage shares, the card conversions and amplifiers, the route
    share, the connection share, the renown trickle share, the upkeep rebate,
    a luxury's signature, the growth surplus, the growth carryover and the
    border accrual all carry fractions.
  · **The banks hold the fraction.** `Player.gold`, `sciencePool`,
    `culturePool`, `faithPool`, `renownPool`, `City.foodBasket`,
    `hammerBasket` and `City.culture` are now JSON numbers that may be
    fractional. Every threshold beside them stays an integer and every
    comparison against one is the same `<`/`>=` it always was.
  · **A windfall composes exactly and banks exactly** (Entry XVIII.5
    restated): one figure, still composed before anything is banked, no longer
    floored on the way.
  · **Prices, costs, thresholds, counts, movement and rolls are untouched** —
    the growth threshold, the border rungs, the guild bar, the faith ladder,
    every purchase price, `snapMovement` and every "per N things" count keep
    their integer arithmetic. The audit table is in the batch doc.
  · **Display rounds at the surface**, in one place — `src/sim/yieldFormat.ts`
    (`roundYield` / `signedYield`). No surface shows a fraction.

    The migration note: a v74 save does not load. Every figure in the
    simulation moves — the first turn a town collects, its pools hold
    different numbers from the ones a v74 log would have produced — so a v74
    command log replays into a different empire by turn two.

v76: **the tree's gifts** (`docs/history/tech-gifts.md` §7 as the user marked it; the
batch is `docs/fewer-things-plan.md` E). Batch D left six nodes handing over
no building; this is what they hand over instead, and every one of them is a
row rather than a branch — the effect vocabulary the tree has carried since
the Age I rework (`TechDef.effects`, `liveEffects`' tenth source) plus the
engine shapes batch A declared and nothing had used yet.

  · **A third conversion project.** `pageants` (Code of Laws): production →
    culture at the same rate its two siblings trade at. `ProjectPayout` gained
    `culture`, and `payProject` pays it through `settleCultureWindfall` —
    which is exactly the door `projectData.ts`'s docblock left open, so a
    culture project is one basket-filler more and not a second path into the
    basket.
  · **The Examination Hall is The Civil Service.** A name only; the id
    `theExaminationHall` is kept, so no save's tech list moves.
  · **A road step is an empire fact.** `CardRule` gained `roadStepCost` and
    Machinery carries −40% of it, which is a third becoming a fifth exactly.
    `MOVEMENT_DENOMINATOR` is 15 rather than 3 for that reason (the least
    common multiple of the two fractions, and `5k/15 === k/3` for every
    integer `k`, so no older figure moved). The price is folded once per
    sweep into `MoveProfile.roadStep` and read only by `stepCost` and A*'s own
    floor, so the four readers still agree by construction.
  · **A route may be paid per luxury at either end.** The Golden Roads:
    `CardRouteYieldEffect.perEndpointLuxury`, folded in `routeYields.ts`,
    which is the one module holding both cities.

    The migration note: a v75 save does not load. Ten nodes hand over
    different gifts, a project id joined the queue's vocabulary, and an army
    that holds Machinery marches further on the same paving — so a v75 command
    log replays into a different empire the turn any of them lands.

v77: **the order pass** (`docs/history/orders-pass-3.md` §2 as the user marked it and
§9 as it rules; the batch is `docs/fewer-things-plan.md` F). The deck itself,
gone over row by row: twenty-four Orders retired, thirty-four written, and
every surviving standalone re-priced off the balance turn's marked numbers.
No shape was invented — batch A declared all seven and this is the pass that
puts them on cards.

  · **The bag moved, which is why this is a schema at all.** Three rarity
    marks changed (Cistern Works ○ → ◆, The Consistory ◆ → ○, The Inquisition
    ● → ○) and twenty-four rows left every pool while thirty-four joined, so
    an Order draft dealt from the same generator state deals a different hand.
  · **The grammar is the user's**: put yields on a thing, then multiply the
    thing. Silk Roads' coin and the Ledger-Keepers' lines moved onto the
    **route**; Wayside Shrines' and Fire-Keepers' candles into the
    **capital**; and the multipliers arrive later and rarer as shares on a
    class of buildings, on the works of a hex, and on what the other Orders
    pay.
  · **Two caps came off** — Ore Tithes' and The War Council's slot-flavour
    counts — and no line reader was built: `CardLine` stays a drawn mark, as
    `docs/history/orders-pass-3.md` §9's second answered question rules.
  · **Four rows are deferred whole** (the Æra V "just win now" Orders): a
    bead is won by the deeds an age deals, and nothing can hand one to a card.
    They carry their text and a `deferred` line, the vocabulary's own
    convention for a card whose shape does not exist yet.

    The migration note: a v76 save does not load. The draw bag changed and
    most of the deck's numbers with it, so a v76 command log replays into a
    different empire from the first draft it answers.

v78: **cadence and chairs** (`docs/history/fewer-things.md` §1 "The levers" and §6
item 9 as the user ruled them on the third pass; the batch is
`docs/fewer-things-plan.md` G). The last batch of the fewer-things pass, and
the one that is tuned rather than built: the deck is finished, so the two
dials that say how often a card arrives and how many can sit down are set
against it.

  · **The draft ladder steepens**: `meter.costExponent` 2.25 → **2.8**, so
    cost(n) = 12 + 6n + n^2.8. The opening is deliberately untouched (the
    first three drafts land on the turns they always did — the exponent is
    worth under a point at n ≤ 3) and the late gaps open out: on the user's
    own culture curve twenty drafts by turn 92 becomes fourteen.
  · **Chairs come down a quarter at tiers 18, 29 and 45** — Government III
    eleven → **eight**, IV thirteen → **ten**, V sixteen → **twelve**. Each
    government's own M/E/W spread is apportioned by largest remainder off
    three quarters of its old total, so the shape of a government (the
    Sultanate's soldiers, the Merchant League's counting-house) survives the
    cut: 2/5/4 → 1/4/3, 5/3/3 → 4/2/2, 3/3/5 → 2/2/4, 3/5/5 → 2/4/4,
    6/3/4 → 5/2/3, 4/4/5 → 3/3/4, 3/7/6 → 2/5/5, 7/4/5 → 5/3/4,
    4/5/7 → 3/4/5. The Chiefdom and tiers 4 and 10 are untouched: the ruling
    names III and up, and the early governments were never the crowded ones.
  · **The seal stays five turns** (ruled 2026-09-05 and re-ruled here: a card
    slotted in and out is skill expression).

    The migration note: a v77 save does not load. The draft ladder prices
    every rung differently from the fourth one up, and adopting a government
    rebuilds the slots array — so a v77 command log replays into an empire
    with a different hand at a different turn, holding a different number of
    chairs to put it in.

v79: **the woods** (`docs/flags.md` "Rulings 2026-09-06, evening" item h; the
batch is `docs/fewer-things-plan.md` H9). The user: "currently forests spawn
in huge patches, could we make them more diffuse across the map? There should
be smaller patches of forest across the map, and some unforested tiles
breaking up the large patches." Two passes answer the two halves, both in
`mapgen.ts`, both tuned by the new `woodland` block of `data/mapgen.json`.

  · **The grain** (`woodland.grain` 0.55, `noise.woodlandGrain` at five tiles
    a cycle): the forest deal orders its eligible ground by the moisture
    percentile blended with a copse-scale one, so the same number of hexes
    are wooded and they are wooded in twice as many places. Measured over
    five seeds on a standard board: 25 woods of mean 11.8 became 48 of mean
    6.0, and the largest wood on a map fell from 74 hexes to 44.
  · **The clearings** (`woodland.clearingChance` 0.4, `clearingMinPatch` 8):
    a hex whose six neighbours are all trees, in a wood of at least eight, is
    offered a clearing. Forest hexes with a wooded ring fell from 13.6% of
    the wood to 1.4% — which is the "huge patches" complaint stated as a
    number, and the number the ruling was written against.

  · **And the capitals are armed** (`docs/flags.md` note 20, ruled 2026-09-05,
    never built until now): `resources.startStrategics` — horses and iron —
    within `startStrategicRadius` of every possible start. The fourth
    fairness guarantee, built exactly like the three beside it: it rolls no
    dice, plants on the nearest legal hex, gives up `minSpacing` rather than
    the promise, and never the row's own terrain filter. The scatter's
    twenty-two strategic tiles per 1000 land arms about forty of the 120
    seat-resource pairs a five-seed sweep asks about; the guarantee forces the
    rest, and no seat is short at any size from `standard` up. Behind it, the
    start chooser gained its seventh hard rejection — a site with no legal
    hex for a listed row in reach (`strategicGround`), unreachable on the
    standard sheet and firing only on a `duel` board asked to seat twelve.

    Both draw from streams keyed on the seed
    (`webciv:mapgen:woodland:grain:<seed>`, `…:clearings:<seed>`) rather than
    from the map's own generator, so the terrain, the hills, the rivers and
    every later pass's *dice* are bit-identical to v78 on every seed. What
    moved is the ground those dice land on: a forest resource needs a forest.

    The migration note: a v78 save does not load. The map is regenerated from
    the config rather than stored, so a v78 command log replays onto a world
    whose woods — and whose deer, furs, horses and iron — stand somewhere
    else.

v80: **the belief hand's own ladder** (`docs/flags.md` "Rulings 2026-09-06,
evening" item i). The user: "make the first reroll free and the following
ones cost faith… It should auto-draft a pantheon once you reach the requisite
faith. It subtracts that amount from your faith total… Prophet re-rolls
reset per roll, and are entirely separate from order drafts." Three moves in
`religion.ts`: `openFaithLadder` spends the rung and climbs
`PlayerPantheon.rungs` at the *deal* (the pick charges nothing; the offer's
`rungCost` is the record); a belief hand's reroll is priced on the hand's
own count — new `BeliefOffer.rerolls`, first asking free, then
`explainBeliefRerollCost` (the Order draft's base and age multiplier, the
exponent raised to the paid askings on this hand), through no door, moving
neither `rerollsTaken` nor the chairs' tallies; and the count dies with the
hand. A v79 log that rerolled a belief hand replays a different bank.

v81: **early production** (`docs/flags.md`, "Rulings 2026-09-06, late — early
production", items x and y). Two prices moved, and both of them move in every
game. The first paid column of the tree is **10** beakers rather than 13 —
Fletching, Husbandry, Mining and Pottery, the four nodes an empire buys before
anything else. And the age band that repriced units alone is now one rule for
**every hammer price**: `cost × costAgeBase ^ age` at a base of 1.25, asked of
buildings and wonders on the same terms as units and folded as its own line
(`explainBuildingCost` joins `explainUnitCost`). Æra I is no longer exempt at
×1, which is the ruling read as written — the complaint was that hammers had
stopped meaning anything, and an age exempted from the fix would be a rule
with a hole in it.

A v80 log does not replay. Every research settlement banks against a different
threshold and every completion against a different basket, so the first town
to finish anything diverges and the rest of the log is a different game.

v82: **the cost scale** (`docs/flags.md`, "Rulings 2026-09-07, small hours",
item aa — the user on v81's own numbers: "production costs are way too low,
they probably need to be like 4–5× what they are now", corrected to "in age 4
only", then drawn out in full: "the curve needs to be fairly exponential").
The band v81 made a power is the user's **table**: `production.costAgeBand`
**[1.25, 2.5, 4.5, 8.5]** by Æra, replacing `costAgeBase`, and a price is
`floor(cost × costAgeBand[age − 1])`. Æra I is untouched from v81 and the
later eras are two to three and a half times dearer than they were — a
Library 35, a Market 147, a Workshop 310, a University 1139. One printed line
still ("Æra III ×4.5"); purchases move with it because they convert the
folded price, and projects stay outside it as before.

A v81 log does not replay — anything an empire built after leaving Æra I
finishes on a different turn, and from there the game is a different one.

v83: **the wide-play rows** (`docs/flags.md`, "Rulings 2026-09-07 — the
early-pacing doc, marked", items cc and ee and the Throne half of dd;
`docs/early-pacing.md` §2c–2e). Seven cards and two building rows, and every
one of them a JSON row — nothing in the vocabulary moved. The Monument
carries `authorityCapacity` 1 again (ruling n), so the fourth town of Æra I
is reachable without a technology; the Imperial Throne's flat five writ
becomes **three plus one for every three cities held** (a `pays` count on
the row's own `effects`, read at the empire scale as every `oncePerEmpire`
row is). Three authority Orders (The Elders' Writ, The Marches, The Census)
and three science Orders (The Tally Sticks, The Scribes' Hall, The Lamp Kept
Lit) join the chiefdom and Government I pools, and The Founders' Charter
joins the tier-4 Doctrines — its Monument is `foundingRider.building`, the
shape The Founders' Road left standing when its own free Monument was taken
away on 2026-09-03.

A v82 log does not replay. Six new rows in two early pools is a different
bag, so the first draft an empire is dealt is a different hand, and every
pick after it lands on a different board.

v84: **the bead Orders, and the draft the cards promised** (batch H3,
`docs/audit/orchestrator.md` — the fix queue and "What surprised me"). Four
rare Æra V Orders carried `effects: []` and were being dealt paying nothing;
they now carry one shape between them, `CardEffect`'s `beadPerOccasion` — a
grant bead of the empire's own, minted on one of four last-age deeds
(`OrderBeadOccasion`: a node of the last age finished, a draft turned down, a
city razed, a prophet's proclamation), each hooked at its own single seam.
`awardBead` is still the only writer of `Player.beads`; the four new bead
rows carry `BeadGrantDef.repeatable`, which gives up the grant class's
once-per-empire key and nothing else. Beside it, the surface for
`purchaseGreatPersonOffer` — built in the simulation since The Commonwealth
was written and constructed by no screen until now — is a rail of calls at
the foot of the Reliquary.

A v83 log replays **identically until an Æra IV empire holds one of the four
cards**, at which point a bead is minted where none was: the rod is longer,
the Opus door opens sooner, and every seat's reading of the race differs from
there. Nothing about the draw itself moved — the four rows were already in
the bag — so the divergence is a payout rather than a deal.

v85: **the rerolls, on one ladder** (batch H14, `docs/flags.md` item q;
`docs/early-pacing.md` §2f). `rerollOffer` knew two hands and knows four: a
**Doctrine** draft and a **great-person** draft join the Order draft on
`PlayerStatecraft.rerollsTaken` — one lifetime count, so rerolling any of the
three raises the price of all three — at **twice** the Order price
(`religion.reroll.heavyMultiple`, a line of its own in the fold) and through
the same door. The belief hand keeps its own free-first ladder, untouched, and
the shrine engine's tally still counts Order drafts alone. One field is new:
`GreatPersonOffer.family`, so a scholar draft bought narrow is redealt narrow.

A v84 log does not replay past the first reroll of either new hand — the
redeal is drawn inside the command from `state.rng`, so the generator moves
where it did not and every draw after it belongs to a different game. A log
with no such reroll in it replays identically: nothing about a deal, an Order
reroll's price or the tally moved.

v86: **the empire stage** (batch H19, `docs/flags.md` item oo — the user,
2026-09-07: *"empire additive bonuses should apply before empire
multiplicative bonuses"*). The meter tiers and the arrears multiplied every
*town's* basket and nothing else; the empire's own lines — a luxury's empire
signature, the caravans abroad, the roads' coin, an Order's empire-wide
science — were banked flat, which made a tier a rule about *where* a beaker
happened to be earned. They now fold first and take the empire stage once:
`(Σ empire lines) × (1 + Σ empire%)`, Entry XVII's shape at the empire's
scale, as the ordered list `explainEmpireLines` (`cities.ts`) is the fold of —
with the multiplication printed as one reconciliation line per voice. The
treasury's **bills** stay outside it: maintenance, a levy's surcharge, a
charter's rebate and the treaties are costs rather than yields
(`TradeGoldKind`), so a contented empire earns more from its roads without
paying its soldiers less.

A v85 log replays identically until the first turn an empire holds **both** a
meter tier (or an arrears penalty) and an empire-scale line, at which point
that turn banks a different figure and every threshold downstream of it — a
technology, a border rung, a draft — is crossed on a different turn.

v87: **the revision** (batch E2, `docs/flags.md` item pp;
`docs/audit/evaluations.md` §2b and §3c — the user, 2026-09-07: *"variables
are cached and updated with the user's actions, so yields that have not
changed are not recalculated"*). One integer, `GameState.revision`, nought at
`newGame`, raised by `applyCommand` on every accepted command and once by
each end-of-turn phase after it runs. It is the key every derived reading is
remembered under — the town's labelled list (`readCity`), the empire's
(`readEmpire`), the law reaching a seat (`liveReading`), the interface's own
"re-read" trigger — replacing four private invalidation schemes, of which the
loudest was a **print** of everything a seat held, rebuilt on every one of the
hundred-odd-thousand asks a late turn makes.

A v86 log replays **identically**: the counter is derived from the log and the
fixed phase order, no rule reads it, and no figure moves. What moves is the
*snapshot* — `snapshotState` is `JSON.stringify(state)`, so a saved state
gains a field and its hash changes, which is why this is a schema bump and not
a quiet addition.

v88: **the deferred rows, first half** (batch E4a,
`docs/audit/deferred-rows.md`). Twenty-odd rows that promised a clause the
game did not keep were ruled one at a time: five clauses built on shapes that
already existed or on a field's worth of new vocabulary, seven struck out of
the rows that carried them, and eight rows withdrawn from their pools
outright. What moves a replay is that the cards themselves changed — The Curia
pays for a Cathedral, Blitz hands a killer its walking back and forbids the
trench, The Siege Train pays beside its engines, Patrons pays renown for the
culture houses, Triumphs pays renown for a town taken, the Terracotta Army
stamps the soldiers raised under it, the Statue of Zeus takes fifteen percent
off a wall, Notre-Dame and the Observatory and the Shipyard read what they
always printed, three great people's legacies stopped being empty, The Vigil
pays while a rite runs, Castellany answers arrows, Ivory puts hammers behind
soldiers, and The Long Road and The First Keel can be earned at last.

A v87 log replays identically **only** in a game where none of those rows was
ever held, drawn or reachable — which is to say, almost none. A pool that lost
five Orders and gained two Doctrines deals different hands from the first
draft on, and every seeded draw after that belongs to a different game. This
is a content bump, and content is what the log is played against.

v89: **the production standard** (batch P1, `docs/production-costs.md` — the
user, 2026-09-07: *"we need to scale them back … buildings should be sized
small, medium, large, wonder, and we should use one set of scaling notation
across the board. Costs should scale this base production cost by column
number in the tech tree."*). Every hammer price in the game is now
`sizeHammers[size] × columnRate ^ (column − 1)`, floored once, with the
once-per-empire line after it and the settler's ladder on top: a row carries a
**size** (`BuildingDef.size`, `UnitDef.size`) and never a figure, and the
column is `techColumn` of the technology that unlocks it — or the row's own
`column` where the tree names nothing, which is how a charter's building is
finally priced in the age its pool opens in rather than as Æra I. The rate is
the user's **1.31**; `costAgeBand` is retired with the printed bases it
multiplied. Two ladders became one: a Cathedral is 397 where it was 1530, a
University 520 where it was 1139, a Bank 893 where it was 1530, a Market 89
where it was 147, a Granary 30 where it was 26, Notre-Dame 1934 where it was
2720. The roster rides the same curve at the same rate (ruled: playtest first)
— a warrior 10, a knight 297, a frigate 448, a settler 28 and 42 at its third.

A v88 log does not replay. Every completion lands on a different turn and the
first one to move takes the rest of the game with it.

v90: **the audience** (batch D1, `docs/war-diplomacy.md` §12). A paper put to
an empire is answered while the player is still standing at the table: the
client driving a bot seat asks that seat's answer arm at once and dispatches
the bot's own command (`answerAudience`, `src/ai/driver.ts`), so an offer is
signed or sent back in the same breath it was made. Two things move in the
rules to allow it — a new command **`declinePeace`**, which sends the other
seat's envoy home (before this a peace offer stood for ever, and "no" was not
a thing a seat could say), and a peace that **closes on the second
signature**, inside that command, rather than at the turn's end. Civ's rule,
and the one an audience needs: a seat that signed is at peace now. The
end-of-turn phase stays as a sweep for a pair whose flags met without a
command between them.

A v89 log replays identically only in a game with no peace in it. Where there
is one the war ends a beat earlier — inside the signing command rather than in
that turn's resolution — and the expulsions, the ceded towns and everything
the rest of that turn was priced against move with it.

v91: **a luxury is lent by the copy, and Petra stands at the edge of the sand**
(batch T1, flags (tt) and (uu)). The deal register lent the *kind*: a clause in
`openedResource` refused the giver every tile of a promised luxury, so an
empire with two amber that lent one kept none of it and the ground stopped
paying as well (the user, 2026-09-08: *"i have two copies of amber. I traded
one amber to the bot for marble. I should be getting the +4 happiness from
having a unique amber and a unique marble"*). The clause is gone. One deal row
now lends **one copy**; `resourceCopies` is where the whole rule lives — opened
tiles, less the copies promised away, floored, plus the copies received — and
`hasResource`, `controlledHoldings` and a town's own `cityResources` are three
readings of that one figure. The tile itself never stops paying its yield:
only the signature crosses the table. Beside it, Petra's `requiresSite` takes
the new `terrainBeside` scope (the user, same day: *"To build petra, you only
need to be settled on or adjacent to desert"*) — the centre hex or the ring of
six, a third question beside `onTerrain`'s centre and `terrainInBorders`'
culture-fed borders.

A v90 log replays identically only where nobody ever lent a luxury and nobody
raised Petra. Where a bargain was struck the contentment on both sides of it
moves, and every growth, purchase and build priced against that happiness
moves with it; where a town beside the sand can now raise a wonder it could
not, its whole queue is a different game.

v92: **the tech ladder re-anchored at 10** (batch S1, `docs/flags.md` item
(vv); v91 is batch T1's, in flight beside this one — the user, 2026-09-08:
*"adjust the science tree costs according to the
decreased cost from the first tech … let's go with A for now"*). The first
paid column was hand-cut from 13 to 10 on 2026-09-06 without the ladder above
it being re-run, so every column from the second up was still priced off an
anchor that no longer existed. It is re-run now: the same taper from
cost(1) = 10 for the columns the formula owns (30 · 69 · 135 · 225 →
23 · 53 · 105 · 175) and the seven authored late columns scaled by the same
10/13 (400 · 540 · 680 → 310 · 415 · 525; 1450 · 1700 · 1950 · 2200 →
1100 · 1300 · 1500 · 1700). No node's column moved and no prerequisite was
touched — a column is still a price, and this is the price the column now
carries. The tree came to 27401 beakers where it had been 35698 (batch B6 has
since re-cut it again; it is 68609 today).

A v90 log does not replay. Every technology after the first lands on a
different turn, and a tree that arrives early takes every unlock, every
escalation and every bead threshold in the game with it.

v93: **the Orders balance pass** (batch B1, `docs/flags.md` item (xx) — the
user's marks on `docs/orders-and-doctrines.md`, 2026-09-08). Fifteen rows
moved and three are new. The new ones first: **The Muses' Call** is a Pool I
Doctrine that opens the great-person door before the tree does, calls one
great person the moment it is adopted, and pays +1 production on every great
person's work; **Boatwrights** (chiefdom) pays +1 production in every coastal
city and **Fish Weirs** (Government I) +1 food on every fishing boat, the
first two rows of the worksheet's Tide thread. **Divine Inspiration is
withdrawn** — banked faith is meant to be spent — and **The Horse-Tribes'**
struck strength clause is built as a flat +1 for the mounted, its second
deferral dropped with it. The rest are dials: Thalassocracy converts food to
production rather than gold, Mountain Hold reads a mountain anywhere in the
borders rather than one hex from the centre, The Great Warring Tribes' hammers
stand without the authority gate, Manifest of the Steppe loses its happiness
bill, The Gilded Court gains +2 authority capacity, Master of Maps loses both
science riders, Pax Imperia's +3 culture becomes +10%, The Pilgrim Ways pays 3
faith a congregation and The Natural Philosophers half a turn of culture a
technology; The Elders' Writ seats two.

One shape is new — `grantsAbility`, a card handing over a verb the tree
teaches, folded into `hasAbility` so a door keeps one answer — and one field,
`DoctrineDef.onAdopt`, which is `OrderDef.onSlot` at the Doctrine's scale.

A v92 log does not replay: a Doctrine pool that no longer holds Divine
Inspiration and two Order pools that hold a row they did not deal the same
hands, and every offer after the first draft diverges from there.

v94: **the Governments marks** (batch B1b, `docs/flags.md` item (zz) — the
user's marks on the Governments table of `docs/orders-and-doctrines.md`,
2026-09-08, which rode into an earlier commit and were missed by B1's pass).
Three chairs move. **War Chief** trades its scaled combat line — +1 for every
second city, capped at three — for +3 authority capacity and a flat +2 that
pays from the first turn it is adopted; the two kill riders stand.
**Theocracy** gains its capital's faith again as science and as culture at a
fifth of the rate where it was a tenth. **Tyranny** goes to +5 authority
capacity, gains a flat +2 combat strength, and its raids cost no movement.

That last is one new behaviour rule — `freePillage`, read in `pillageAt`
where the raid's single point is spent and nowhere else — and the Governments
table's Signature column becomes each row's own `text`, the four early rows
gaining one, sync-tested beside the chairs.

A v93 log does not replay: an empire under any of the three banks different
writ, different strength and different beakers from the turn it adopts, and a
raid under Tyranny leaves its column somewhere the old law could not reach.

v95: **the deferred rows that needed a shape** (batch E4b,
`docs/audit/deferred-rows.md`; v93 is batch B1's and v94 batch B1b's, landed beside this one).
E4a built every ruling that was a data row on a shape that already existed and
left the ten that were not. They are built here, and what each needed is
written on its own row: The Levée en Masse musters a levy on the calendar and
**stamps it** with a point of movement for life (`UnitStamp.movement`, read in
`fullMovement`, handed to `createUnit` by the muster); The King's Road fills a
piece's allowance when it comes to rest in one of your towns, and Admiralty
lands its men **free** and gives them three turns of strength — two rules read
at the two movement seams that already exist (`stepCost` prices the pair of
hexes, `advanceAlongPath` hangs the blessing, and neither is a second price).
Five buildings join the table: the **Stable** at The Wheel (which is what The
Horse-Tribes was waiting for), the **Printing House** un-retired to take the
beakers the roads bring it, the **Bourse** at Paper Money — a `oncePerEmpire`
house whose coin becomes culture, which is how a `pays` rate reaches the
empire's own books — and the **Bank** and the **Cistern** reworked: a share of
the coin where a caravan ends (`routeEndsHere`), and farms watered by the town
that works them (`BuildingDef.irrigates`, read where the renewal reads the
river). The Silk Exchange doubles what its roads carry in beakers and song
(`CardRouteYieldEffect.share`), Manufactories pays the towns that hold one,
and **The Crusade** presses a lump of faith wherever its soldiers kill —
`bankPressure`'s third caller.

A v92 log replays identically only in a game where none of those rows was ever
held. Where one was, a piece walks further, a levy is stamped, a caravan pays
more or a citizen turns — and every basket priced against it moves.

v96: **the beliefs balance pass** (batch B2, `docs/beliefs.md` — the user's
marks of 2026-09-08; v93 and v94 are the batches in flight beside it). The
worksheet came back marked and the marks are rulings: Star Readers pays four,
the almanac comes round every ten turns, an altar takes twenty-five, Lord of
the Hoard is **The Stone Hoard** and pays a mine *or* a quarry on any seam at
all, The Vigil pays two tenths instead of two flats, and The Living Rock is
withdrawn. Two gods are new — Vineyard Rites on the plantations, Cult of
Heroes on the whole renown trickle. Choirs and the Tithe Houses swapped their
steps; the Preachers walk five hexes; Ecclesia's stones pay three; the
Congregation counts by threes to five; Pilgrims' Coin pays coin for every
following town in the world; the World Church pays a *share* of culture per
following empire. Cathedrals of the Sky and Feast Days moved onto the
**temple** rather than onto the town, so a share of a temple's worth has one
figure to take.

And **Holy Order is built**: the Knights Templar are a roster row no
technology opens (`UnitDef.unlockedByCard`, `CardUnlocksUnitEffect`), bought
out of the faith bank, armed and priced off whatever horse the age has taught
this empire (`UnitDef.mirrors`). The `cityHappinessDemand` meter rule went
with the pass (the user: *"Don't keep the useless rule"*) and the Manifest of
the Steppe is the settlers' card alone.

A v92 log does not replay. Every one of those figures is banked into a
different pool on a different turn, a pantheon draw no longer deals The
Living Rock and therefore deals a different god from the same seed, and the
roster grew a row — which moves nothing that was raised and everything that
is drawn against a list of them.

v97: **the second beliefs pass** (batch B3, `docs/beliefs.md` — the user's
marks of 2026-09-08, the second set). Seven rows, and one of them is a shape.

**Herd Gods** pays a hammer and a candle on every pasture, which is the wild
axis' answer to the plantations. **The Crusade** fights for three instead of
two. Two enhancers count the tide by what stands in it: **Marvels of the
Faith** pays five beakers and five songs for every following city in the world
that holds a wonder, and **The Scriptoria** a beaker for every faith house in
one — two new `following…` counts, over the sweep the other five already
share.

And **four follower beliefs open four buildings** — the Mosque, the Wat, the
Gurdwara and the Dar-e Mehr. Each is bought with faith and never built
(`BuildingDef.purchase`, the roster's marker one table over, at
`faithPerHammer` per hammer of the ordinary cost), and each may stand only in
a town that keeps the faith which opened it (`BuildingDef.followingOnly`,
read in `purchaseError` and nowhere else). A follower belief is city-local, so
a row it hands over is opened for **whoever owns a following city**:
`cardUnlocksBuilding` walks the empire's own towns' beliefs after its law.

A v96 log does not replay. The pantheon and both belief pools grew rows, so a
draw from the same seed deals a different hand; a Crusade's blow lands harder;
and a town that bought a faith house is a town holding stones the old build
has no id for.

v98: **standing orders walk on this turn's points** (batch U1,
`docs/flags.md` (bbb) — the user, 2026-09-08: *"a unit's orders should only be
performed at the end of the turn if they have available movement"*).

One phase changed and one march moved. `resetMovement` (`turn.ts`) used to
refill every allowance and then walk every stored path on the points it had
just handed out, so a column under orders opened its owner's turn with that
turn's movement already spent, standing somewhere nobody had watched it walk
to. The second pass is gone: the refill resumes nothing, and
`spendLeftoverMovement` — one line above it, on this turn's own leftover — is
now the only phase in the pipeline that marches a standing order.

A v97 log does not replay. **Every multi-turn march arrives a turn later**,
and a column stands one turn's allowance short of where the old pipeline put
it on the turn it set out — which moves what a scout sees, which hex a raider
burns a camp on, and therefore every die rolled after it.

v99: **the palace pays a beaker, a note and six writ** (the user,
2026-09-08: "lets have the starting palace supply 1 science and 1 culture";
"+6 starting authority. That way the player can settle 3 coastal or 2
regular cities without needing monuments"). The one "Palace" line in the
capital's list carries `palaceScience` and `palaceCulture` beside its coin
(`rules.cities`), staged like everything else the town banks; and the
palace's writ is six (`meters.authority.palaceCapacity`, was four). A v98
log does not replay: every capital researches and drafts a little sooner
from the first turn, the first technology lands on a different turn, and an
empire's third town no longer pays an overrun the old law charged.

v100: **a route is hired with gold, and the sea pays more** (batch R1; the
user, 2026-09-09, `docs/flags.md` item (iii): "Instead of building traders,
lets have trade routes be purchasable with gold directly in the interface of
the trade screen"; and "sea routes should pay +50%"). A new command,
`buyRoute`, charges the treasury `routePrice` — the Trader row's own
converted production cost, `rules.trade.routePriceMultiplier` over it —
mints the caravan in the origin's gates and writes the route on it, gated by
the whole of `routeStartable` plus the purse. The Trader row leaves the build
queue and the purchase book with it (`UnitDef.routeOnly`), and a route run by
sea pays `rules.trade.seaYieldPercent` more as a line of its own fold. A v99
log does not replay: the caravan a seat used to queue is now a coin it
spends, every bot seat's purse and build order move with it, and a sea route
already running banks half again from the turn this lands.

v101: **the world clock is the mean, and an age is given ten turns to close**
(batch G1; the user, 2026-09-08, `docs/wager.md` §1: "lets take the idea of a
global age (takes the mean of all players, with a 10 turn countdown for age
end)"). The first-seat rule is **retired**: `BeadTable.worldAge` — a stored
clock raised to the highest age any real seat had reached — is gone, and in
its place `GameState.ageClose` carries one absolute `{age, turn}` stamp off
which two readings are derived (`worldClock.ts`): `worldAge`, the mean of
every living empire's highest technology floored, and `currentWorldAge`, the
age the world is in. When the mean first crosses, the age it is leaving is
given `rules.wager.countdown` turns; at the close a new announced occasion —
`ageClosed`, the moment G2's wagers are judged on — fires for every seat and
the world enters the next age, which is when the deed tables turn over. The
last age has nothing above it and closes `rules.wager.lastAgeTurns` after it
opened, or the turn the Great Work is raised, whichever comes first.

A v100 log does not replay. Every age now opens a countdown later than it did
and off a different reading, so a hand turns face up on a different turn, a
reckoning is taken on a different board, and the per-age counters the opening
resets are zeroed somewhere else entirely.

v102: **the wager** (batch G2, `docs/wager.md` §2/§3/§5; the user,
2026-09-08: "5 turns into each new age, players are shown three targets drawn
from a deck… Each player chooses one of the wagers"). Every age from the
second deals the whole world **three bars** out of `data/wagers.json`,
guaranteed to come from three different theme lines; every seat stakes one in
secret (`chooseWager`, an End Turn blocker on the deal turn, the phase's own
default for a chair nobody sat in); a card is claimed the turn a seat first
meets it and mints beads then — two for the card that seat staked, one for
either of the others — through four new repeatable grant rows, one per rod;
and at the age's close a seat whose own card is still unclaimed takes a
`pendingMalice`, which batch G3 turns into a card in a chair. New state:
`GameState.wagers` (append-only, one row per age, with every seat's opening
figures and every claim), `Player.wager`, `Player.wagerTotals`,
`Player.pendingMalices`, `Player.malices`, `Player.renownEarned`,
`Player.unitsKilled`/`unitsLost`, and `City.capturedOn`. A new `wagers` phase
runs between `worldClock` and `beads`, and a new announced occasion
(`wagerClaimed`) joins the union. The eight **reckonings** are retired
(`retired: true`): the wager is the age's snapshot now and it is taken for
everybody rather than paying the leader alone.

A v101 log does not replay, for two reasons. The deal takes two rolls of
`state.rng` an age (a line, then a card inside it). And retiring the
reckonings takes four cards out of each age's deck, so the shuffle at
`newGame` spends fewer rolls and every draw in the game starts from a
different place — `drawAgeReckonings` still spends a roll a family over its
now-empty pools, deliberately, so that at least *that* much is unmoved and a
later reckoning-shaped row costs nothing to add back.

v103: **crowding is removed, and the justices forgive the citizens** (batch
B7; the user, 2026-09-09, `docs/flags.md` item (kkk): "lets remove crowding
unhappiness altogether"). A town's happiness demand is `demandPerPop ×
charged citizens` and nothing else: the surcharge a town over a threshold
paid on top of its citizens is gone with its three rules
(`meters.happiness.crowdingWeight`/`crowdingFrom`/`crowdingExponent`), gone
from `explainHappiness`, from the founding preview, and from the puppet's
gain line — which now relieves the citizens alone. The Assize Court carried
the one `crowdingRelief`; the marker is retired for `demandRelief`, the same
fifteen read one cost line over, and the court's "the justices sit" line is
now a share of everything its town's citizens ask for.

A v102 log does not replay. Every empire holding a town of eleven or more is
paying less for it from the turn this lands, which moves the happiness tier
it sits on, which moves every yield the tier scales, which moves growth,
research and the turn a bot seat decides it can afford one more town.

v104: **the great-person pass** (batch GP1; the user, 2026-09-09,
`docs/flags.md` item (lll): "i massively buffed the great people, since
they're now much more rare"). The roster is re-cut against the doc's own
*Legacy* column: eight names are **retired** (`GreatPersonDef.retired`, the
row kept so a save holding that legacy still loads and out of every draw),
six are new — Gaius Marius, Willem Beukelszoon, Epicurus, Aristotle,
Maimonides, Roger Bacon — five move age, and a couple of dozen legacies are
retuned or rewritten in the existing effect vocabulary. Nothing on the state
shape moves: this is a data bump, and it is a bump because a **draw** is
state. `rosterOfAge` is the bag every offer is dealt from and it no longer
holds the retired rows, so every recruitment in a game deals a different hand
— and the rows were reordered into the doc's reading order besides, which
moves the weighted walk's own indices.

A v103 log does not replay: the first great person of a v103 game is drawn
from a bag of eighty in one order and of seventy-eight in another, and the
offer's rolls diverge from there.

v104 (with GP1): **the almoner's ledger** — `Player.goldSpent`, a whole
number raised at the five seams where a player's own act takes gold out of
the treasury for a thing (see the field). It rides the great-person pass'
bump rather than asking for one of its own: **GP1** moves the roster — eight
names retired, four added, five re-aged — and a changed roster changes the
draw, so the version was already going up in the same batch. The field is the
only state batch **GP2** adds; every other shape it builds is vocabulary, read
off rows and off the board.

A v103 log does not replay under it, for GP1's reason and not for this
field's: a seat loaded from an older log simply starts its ledger at nought,
which is the honest reading of a record nobody was keeping.

v105: **the malice deck** (batch G3, `docs/wager.md` §4; the user,
2026-09-08: *"the malice be a card that must remain slotted in your government
with a malice effect"*). The half of the wager G2 recorded and did not pay is
built: at an age's judgement a seat whose staked bar went unmet is dealt a
card from `data/malices.json` by `state.rng`, never one it already holds, and
the world **seats** it — in the last chair of its flavour, turning whatever
Order sat there out into the hand with its seal broken and nothing refunded;
in a wildcard chair where the realm has none of that flavour; and, where a
realm has no chair at all, in a ninth chair nobody has, paying its effect all
the same (`HeldMalice.chair` absent). It cannot be unslotted — `slotOrder` and
`unslotOrder` refuse the chair in one plain sentence each — it stacks to
`rules.stack` (two, a third replacing the oldest), it survives an adoption and
re-seats itself into the new spread, and it leaves at the next age's judgement
if that age's stake is kept. A held malice is `liveEffects`' **eleventh**
source, credited to itself by name in every ledger it reaches, and `CardId`
gains its eleventh class. New state: `HeldMalice.chair`, and `Player.malices`
— declared by G2 and written by nothing — now written. A new announced
occasion, `maliceSeated`, joins the union.

A v104 log does not replay. The judgement now spends a roll of `state.rng` for
every seat that missed its bar, so the first missed wager in a game moves
every draw after it; and from that turn the seat is paying an effect it was
not paying before, which moves its yields, its research and everything priced
against them.

v106: **the census** (batch C1, `docs/wager.md` §10/§11; the user,
2026-09-09: "every few turns, a notification is shown of every player's yield
of a major stat… I was imagining the notification would be a full modal, and
only take place every 15 turns or so"). Every thirteen to seventeen turns —
the gap drawn uniformly from `state.rng` at each census, so a seed is a
calendar — the world is measured on **one** figure out of a closed list of
thirteen, drawn from the same generator and never the same one twice running,
and every real seat is ranked on it. The seat at the head takes a repeatable
Triumph worth `rules.census.renown`, shown **inside the census sheet** and
never as a Triumph card of its own (the user: "let's not show both"). New
state: `GameState.census` (`nextTurn`, an absolute turn drawn at `newGame`
and again at every census, and `taken`, an append-only list of records) and
`Player.censusSeen` (the turn of the last census this seat acknowledged,
written by the new `dismissCensus` command — presence-is-state, absent means
none). A new `census` phase runs between `wagers` and `beads`, a new
announced occasion (`censusTaken`) joins the union, and `data/triumphs.json`
gains `censusLeader`.

A v105 log does not replay. The first interval is drawn at `newGame` — after
the two decks are shuffled, deliberately, so the opening hands are exactly
the hands they were — and every roll after that point is one place along:
each census afterwards spends three more (the next gap, the figure, the
taker's name), so every offer, every raid and every draft downstream of the
first census lands differently.

v107: **the waterline, and the taking of a town** (batch N1,
`docs/war-diplomacy.md` §5b; the user, 2026-09-09: "melee units should not be
able to attack boats from land… boats should take reduced damage from ranged
attacks from land… but should take increased damage from siege… Boats should
also take reduced damage when attacking embarked units, and embarked units
should not be able to attack boats. Also, a melee unit attacking and killing
the unit protecting a city should take the city"). Five rules, all of them in
`combat.ts` and three new numbers in `rules.naval`: a land piece that closes
may not attack a water hex and an embarked piece may not attack a ship (both
refused in `attackTargetAt`, so the tint, the forecast and the reducer say one
sentence); a land bow fights a hull at `landRangedVsShipPercent` and a land
siege engine at `landSiegeVsShipPercent`, attacker-side percentages on named
lines; a hull boarding a column at sea takes `embarkedCounterPercent` of the
counter; and a **melee blow that kills a town's garrison takes the town in the
same blow**, the winner walking in through `arriveOnTile`.

No new state — every one of them is a rule read off the board — but **a v106
log does not replay**: battles resolve differently. A blow refused where it
used to land spends no dice at all, a shot at a hull rolls against a different
strength, and a garrison's death now ends a siege one blow earlier, so every
draw downstream of the first fight is one place along.

v108 (batch Q1, `docs/flags.md` (nnn); the user, 2026-09-09: *"Could we remove
the table of the previous win conditions and remove it from our code? the
wager system seems way better to me."*): **the deeds retire**. Feats,
endeavours and quests were the old victory conditions and the wager replaced
them, so every row of the three carries `retired: true` — kept for the
Compendium's record, dealt to nobody — beside the eight reckonings that went
this way in G2 and the four Æra V bead Orders, whose grants go with the cards
that minted them. `BeadTable` loses `decks`, `hands` and `streaks` and is the
world's register alone; `BeadCard` is gone with the table it sat on; the
`beads` phase is gone from `END_OF_TURN_PHASES`, because a phase that dealt a
card, swept a count and kept a streak book has none of the three left to do.
`rules.handSize` and `rules.dealEveryTurns` leave `data/beads.json` and
`rules.threshold` is re-cut on the bench for a world with no deeds in it.

A v107 log does not replay. `newGame` drew four reckonings and shuffled two
decks off `state.rng` and now draws nothing at all, so every generator-fed
decision in the game — the first great person offered, the first Order dealt,
the malice — moves by the rolls the deal used to spend.

v109 (batch U9, `docs/flags.md` (ttt); the user, 2026-09-10: *"There should be
a larger gap between units in combat strength … i'd love for the fire lancer
to end as an 80 strength unit"*): **the strength ladder**. Every
`combatStrength` and `rangedStrength` in `data/units.json` is re-cut on Civ 6's
magnitudes — the curve here has always been Civ 6's (`baseDamage` 30 ×
e^(0.04 × difference)), so a gap of ten is half again the damage and a gap of
thirty is a kill, and the old figures were packed too tightly for either to
mean anything. With them go every flat line that shares the ledger: terrain,
fortification, the general's aura, the walls, the naval column, the citadel,
and every card, belief, rite, wonder and great person that adds strength
points. The Cataphract's row retires with the ladder (no node has opened it
since tree revision 4).

No new state again — a strength is a data figure and none of it is stored on a
piece — but **a v108 log does not replay**: every battle rolls against
different numbers, so the damage, the deaths and the dice spent after the
first blow all move.

v110 (batch T5, the user's tree pass — `docs/flags.md` (uuu), 2026-09-10:
*"could you fold in my changes to the tech tree"*): **eleven marks, and a
replay's yields move on every one of them.** The Barracks, the Stable and the
Shipyard hurry a quarter rather than a tenth and each now names *which*
soldiers; the Lighthouse and the Harbour trade a food line for a coin and a
seam; two new buildings stand (the **Garden** at Irrigation, the **Public
Bath** at State Workforce); Satrapies stops keeping a wide realm's roads for
nothing; Daughter Cities pays the carts that never leave the realm; The Saddle
pays beakers and songs for a burnt field. And **Raised Fields is gone** — the
id leaves `TechId`, so a v108 log that researched it is refused rather than
replayed against a tree without it, exactly as v44's re-cut refused one that
named Drama. **The Silk Road** stands in its slot, at its column, off its
prerequisite, with Shipwrights still chaining off it; it carries the
Caravanserai down from Mathematics, pays a caravan that ends abroad, and
lends the empire one luxury from every foreign market it reaches, at half
(`rules.trade.importedLuxuryPercent`). The Floating Gardens move to Irrigation
with the water that grows them.

v111 (batch S2, `docs/flags.md` (www); the user, 2026-09-10: *"the pool of
yields shouldn't swap over when reselecting something … swapping to a
different tech shouldn't allow you to keep your technology progress on the
new tech, same for production"*): **beakers and hammers are committed to the
thing they were spent on.** A pool used to follow the aim, so switching
research or re-heading a queue carried every banked point along with it and
cost nothing. Progress is now **kept with the thing** and neither carried nor
lost: `Player.techProgress` parks the beakers banked toward a technology the
empire has aimed away from, `City.itemProgress` parks the hammers banked
toward a queue row that is no longer at the front, and returning to either
finds it exactly where it was left. Overflow still follows the *queue* —
what is left after a thing completes was never toward that thing — and the
turn's own spend is still committed at the end of turn. **The Vizier's Hall**
stands with the rule (`BuildingDef.queueFloor`): a town that holds it may not
be left with fewer than two rows to build, and it makes half again as many
hammers while it has them.

A v110 log replays identically **except where a seat changed its mind**: a
`chooseResearch` that moved the aim, a `setCityProduction` that re-headed a
queue, or a `dequeueResearch` that dropped the head now leaves the old
thing's progress behind rather than handing it to the new one, so every
completion after that moment lands on a different turn.

v112 (batch F2, the user's ruling of 2026-09-10 — `docs/flags.md` (bbbb):
*"Prophets should have only two charges … Proclamations and empire-wide rites
each take 1 charge. Founding a religion creates a holy site and consumes two
charges. Drawing a new belief costs two charges."*): **a price on every one of
a prophet's acts**, in `rules.religion.prophetCosts`, read in one place
(`chargeCostOf`) and spent in one (`spendCharge`). No new state — a charge has
always been a number on the piece — but **a v111 log does not replay**: a
prophet that had spent a charge speaking could found a faith or draw a belief
before this, and is refused now, so a log whose prophet did that diverges at
the command and every draw after it moves with the generator.

v113 (batch L2a, `docs/flags.md` (dddd) and (xxxx); rewritten for the second
cut, batch L6a, 2026-09-12): **a leader is two abilities, a unique unit and a
unique building.** `data/leaders.json` carries, per figure, a pair of
`abilities` — ordinary card effects, live for the seat from the turn it sits
down and for the rest of the game — and the ids of the one soldier and the one
building that figure alone may raise, beside its colours, its towns and its
start bias. One field joins the seat: `Player.leader`, the runtime copy of the
spec's figure. Both abilities join `liveEffects` as its twelfth source; a
unique's row carries `unlockedByLeader` and is opened for the figure's seat by
`isUnlocked` once the row's own technology has come — no age machinery, no
offer, no pick.

The first cut's draft is **retired with the deck**: there is no
`Player.leaderPicks`, no `Player.leaderOffer`, no `chooseLeaderCard` command,
no `leaders` phase and no End Turn blocker. Nothing of it ever landed on a
saved game — the schema stayed at 115 through the whole of it — so a v115
config naming a figure replays byte for byte here: the fields are simply not
written, and a seat under a figure now owes no decision it did not owe before.
A roster naming no figure is untouched either way.

v114 (batch X14, `docs/flags.md` (gggg); the user, 2026-09-10: *"units set on
auto-explore should use all of their movement"*): **a ranging piece marches,
not steps.** `marchExplorers` re-aims and walks again on the same turn's
points until the allowance is spent, the road is jammed, or there is nothing
left to see — the seat's fog recomputed between legs so the search reads the
ground the piece has just lit. No new state, but **a v113 log does not
replay**: an explorer that walked one hex a turn now walks two or three, so
every hex it claims, every camp it burns and every unit it meets happens on
a different turn, and the resolution order moves with it.

v115 (batch P3, `docs/flags.md` (hhhh); the user, 2026-09-10: *"purchased
units should spawn on the city tile. If a unit of it's type is already
occupying the city tile, it should block purchasing"*): **a bought unit
stands on the city hex, or is not sold.** `spawnTileFor`'s walk stops at the
centre for a purchase (`onCityHexOnly`) and `purchaseError` refuses, naming
the piece in the way, before any coin moves; a *built* unit keeps its spill
to a neighbour. No new state, but **a v114 log does not replay**: a purchase
made into a garrisoned town was accepted then and is refused now, and the
bots step their garrison aside before buying — two commands where there was
one.

v116 (batch L8, `docs/flags.md` (bbbbb); the user, 2026-09-14, playtesting
Pachacuti: *"originally, i was imagining that terraces would be a unique
farm, not a building in the city. It would have +1 food compared to a regular
farm, and could be built adjacent to mountains"*): **the Terraces are a field,
not a hall.** The building is `retired` — kept, like every withdrawn row, so a
save that raised it still replays and a copy already standing keeps paying —
and its `townTerraces` hills waiver is gone from the farm with it. In its
place `data/improvements.json` carries a `terraces` row: the farm's terrain,
features and worker charge, two food where a farm pays one, no
`requiresHills` at all, and `mountainFoot` — the fourth seam in the constraint
shape, which forgives a row its water on any hex a peak stands beside.
`countsAs: 'farm'` is what keeps every rule already written true of it, read
through `improvementCountsAs` and never by a name. A figure's second unique
may now be a **work of the ground**: `LeaderDef.improvement` beside
`building`, one of the two and never neither, gated by
`leaderOpensImprovement` exactly as the soldier and the hall are gated.

No new state — a figure's uniques are read off `data/leaders.json` and never
written into a game, and `Tile.improvement` was always the field that holds
this. But **a v115 log does not replay**: the row did not exist, so a
`buildImprovement` naming it was refused where it is now accepted, a hillside
and a dry mountain foot that took nothing now take a terrace, and the Terraces
queued as a *building* in a town — which a v115 Inca player could do — is
refused where it was built, so every hammer after it lands somewhere else. A
v115 log that neither queued the hall nor cut a terrace replays byte for byte.

**Still 116, with one more field** (2026-09-15, `docs/flags.md` (ggggg); the
user: *"the game should allow razing cities that aren't original
capitals"*): `City.originalCapital`, written at founding on an empire's
first town, is what razing refuses now — `wasCapital` (every seat that ever
fell) is the bead's alone. A v116 log replays byte for byte: the field is
derived at founding on replay, and a raze the old rule refused never reached
a log. The snapshot print gains the key on every empire's first town.

**Still 116, and no new field at all** (2026-09-15, `docs/flags.md` (ooooo);
the user: *"units should be able to 'move past' units that are blocking
them… Units should not exert ZOC if you're not at war with them. Moving a
military unit onto another should 'swap' the two unit's positions"*): three
movement rules, all of them about who is in the way. A piece of a seat this
empire is not at war with is **passed through** rather than walked around
(`canTransit` admits it, `canStopOn` still refuses it); the zone of control
counts **only seats at war** (`zocField`); and a soldier ordered onto one of
its own seat's soldiers **trades places** with it when both walks fit the turn
(`planSwap`, carried by `moveUnit` — no command was added, which is why the
version did not move).

**A v116 log replays, and the games it describes may end differently.** No
refusal became an acceptance for any command a v116 log can hold — a
`moveUnit` onto a friend's hex was refused by every version of these rules
there has ever been, so no log contains one — but a march *stored* under the
old rules is walked under the new ones: a column that halted behind a
neighbour's spearman now files past it, and one that paid a picket's toll at
peace now does not. Every seat re-decides from the board it is handed, so the
bots take different roads from the same seeds and the 120-turn digests moved
with them (re-taken in `test/sim/explore.test.ts`, with the measurement in
their docblock). Nothing about the *shape* of a save changed.

**Still 116, and nothing moved** (2026-09-15, `docs/flags.md` (ppppp); the
user: *"players should be identified by their leader choice — let's retire
the color naming scheme unless the user has selected no leader"*): a seat is
called by its figure now, and its country by the figure's people, but that is
a *reading* over the state and not a field in it. `seatName` / `seatPeople`
(`leaderData.ts`) answer off `Player.leader`, which a game has carried since
v112; `Player.name` still holds exactly what the config wrote and a save still
carries exactly that word. No command changed, no refusal changed its shape,
and a v116 log replays byte for byte — the sentences the interface prints over
it simply say "the Inca" where they said "the Crimson".

v117 (batch S2, `docs/flags.md` (bbbbbb); the user, 2026-09-15: *"lets get
working on each of these things"*, over V1's own sacrifice): **the deck keeps
a lifetime tally.** `PlayerStatecraft.yieldTallies` — one row per card that
has ever paid, six voices each (`CardYieldTally`, `draft.ts`) — is added to
once a turn at the head of the `collectYields` phase by `recordDeckTally`
(`ledgerFold.ts`), from the Ledger's own per-card reading of the statecraft
class (`explainDeckLedger`), and written by nothing else. The Ledger's third
band prints it per card, and the six statecraft lines of the score read its
fold in place of the current turn's pay. No rule of play moved and no command
changed: **a v116 log replays**, and the replay writes the tally from its
first resolution, so a save — which is a config and a log — arrives with the
tally it would always have had. The one migration sentence is for a state
*restored from a print* rather than replayed: a pre-117 snapshot has no
`yieldTallies` key, every reader takes `?? []` for it, and the writer opens
the list on the next turn — zeroed tallies, in other words. The snapshot
print gains the key on every seat.

v118 (batch B1, `docs/flags.md` (aaaaaa); the user, 2026-09-15: *"the
specificity of our cards, and how it's difficult to find the card you're
looking for with our long spans of time between drafts, and how expensive
re-rolls are"*): **two changes to the draw, none to a card**. Four were
ruled; two — a line to follow, and a card held back from a passed hand — were
dropped by the user before landing, for the separate-decks rework of the
pool, and nothing of either shipped. (1) `rerollsTaken` is **zeroed by
adoption** (`adoptGovernmentAt`, the one writer of adoption) — the reroll's
ladder starts again under every new government; the field was a lifetime
count from v71 to here. (2) **A flatter meter**: `meter.costExponent` 2.65 →
**2.2**, `costLinear` and `costBase` untouched, so the ladder is
`12 + 5n + n^2.2`. Measured in a headless six-seat bot game (seed 20260915,
standard map, barbarians on, driven to turn 160), drafts taken per seat,
mean of six — today's 12 + 5n + n^2.65: **11.0 by t100, 17.5 by t160**, the
first three drafts landing on turns 8 / 15 / 26; candidates 4 + n^2.15:
14.5 / 26.3 (8 / 15 / 24); **5 + n^2.2: 14.2 / 26.5 (8 / 15 / 25)**;
5 + n^2.1: 15.0 / 28.8; 5 + n^2.0: 16.8 / 31.5. The pair landed is the one
nearest one and a half times the drafts by t160 with the opening cadence
kept — its first three rungs are 12 / 18 / 26 against today's 12 / 18 / 28,
and the twentieth draft costs 757 culture where it cost 2554. The number is
the user's to re-rule after playtesting the feel; the table is repeated in
`docs/orders-and-doctrines.md` under "The draft pass".

No field joined or left the player. **A v117 log does not replay**: every
draft from the third is priced off a different curve, so the meter fills on
different turns and every hand after it is a different deal. 117 is S2's,
the lifetime tally, taken in the same batch.

v119 (the decks rework, batch D1a on branch `decks` —
`docs/plans/decks-rework.md`, ruled `docs/flags.md` (iiiiii); the design of
record is `docs/six-decks-first-cut.md`): **the card system learns decks.**
Four fields join the seat: `Player.decks` (the figure's two, all six for the
rainbow and for a seat under nobody), `charteredTechs`, `charteredBuildings`
and `charteredRites` (what a charter's pick has opened; three lists that only
grow). Two join the deck: `PlayerStatecraft.rewardHands` (the rare-only
reward hands banked at regular draft counts 4 / 18 / 29, as absolute counts)
and `pendingReward` (one of them opened and on the table). `slots` is a flat
list of universal chairs — 3 / 4 / 6 / 9 by the government's tier, the M/E/W
spread retired — and a government offer's `tier` is unchanged. Every
pre-rework Order and Doctrine row is `retired: true` and deleted from
nothing; every row carries `decks` and `band`; the draw is rarity-first
(60 / 30 / 10) into positions the seat's decks and the draft count decide,
and an exhausted pool charges nothing. Three commands join the log
(`openRewardHand`, `chooseReward`, `passReward`).

**A v118 save is refused and does not replay** (`loadGame` tests the
schema for exact equality): every hand from the first is a different deal —
a different pool, a different draw, different chairs to seat it in — so a
v118 command log would pick indexes into hands this build never dealt. Nothing
migrates; the branch starts its saves afresh, which is what a playtest branch
is for.

v120 (the decks rework, batch D2c on branch `decks` — occasions): **the world
writes down what was done first.** One field joins the world —
`GameState.firsts`, the append-only ledger of first-of-a-kind records
(`FirstKind`, written only by `markFirst`) — and one joins the deck,
`PlayerStatecraft.riderTurns`, the absolute turn each once-a-turn windfall
rider last rode. Three moments join `TallyOccasion` (a kill, a unit trained, a
camp burnt out — a town grown was written up and deliberately not built, see
`TallyOccasion`'s own note) and two counts join `CountKind` off the new
ledger; a windfall grant may be a share of the occasion's own facts
(`OccasionMeasure`), capped by `WindfallGrantSpec.max`.

**A v119 save is refused and does not replay**, and this is a bump *within*
the branch rather than one over `main`: a v119 log replayed against these
rules would pay different windfalls from the first kill and count different
tallies from the first muster, so the state it reached would not be the state
it recorded. D1a's paragraph above says why the branch migrates nothing, and
the same answer holds — the playtest starts its saves afresh.

v121 (the decks rework, batch D2d on branch `decks` — the age stamp): **three
things now remember when they were placed.** `City.buildingTurns` is the turn
each of a town's buildings joined it, written only by `addBuilding`;
`Tile.improvedOn` is the turn the work standing on a hex went up, written only
by `raiseImprovement` and cleared only by `razeImprovement` (`map.ts`); and
`TradeRoute.startedTurn` is the turn a road opened, written only by
`startRouteAt` and never rewritten by a renewal. Every one of them is an
**absolute turn compared against `state.turn`** — `TimedEffect.expiresTurn`'s
discipline — so nothing anywhere ticks. The vocabulary that reads them is
`standingTurns` on three `CityScope`s and on the route `pays`, and
`TileCondition`'s `standingSince`.

**A v120 save is refused and does not replay**, and this is again a bump
*within* the branch rather than one over `main`: a v120 log carries no stamps
at all, so every card written on an age would answer "not old enough" forever
and the state it reached would not be the state it recorded. The branch
migrates nothing, for D1a's stated reason.

v122 (the decks rework, batch D2e on branch `decks` — the bilateral grant and
the trading post): **a town remembers whose traders keep a house in it.**
`City.posts` is the one new field: a list of `CommercialPost` records, one per
empire that has traded here, each carrying the absolute turn that empire's
unbroken trading presence in the town began. A post is *established* once that
presence has lasted a full route term (`rules.trade.routeTurns`), and an
established post is permanent — war, capture and cancellation never remove
one. Only the writers in `trade.ts` touch the list, and nothing ticks: the
ripening is `state.turn - since >= term`, an absolute turn compared, exactly
as v121's stamps are.

Beside it the card vocabulary gains the other half of the batch,
`CardPaysEffect.payee`, which is how a card may pay an empire that is not the
one holding it.

**A v121 save is refused and does not replay**, for v121's own reason one
paragraph up: a v121 log carries no posts, so every card written on one would
answer "no house here" forever. The branch migrates nothing.

v123 (the decks rework, batch C8 on branch `decks` — provenance on a shelf):
**a town remembers which bank paid for each of its buildings.**
`City.buildingBanks` is the one new field: for each building bought at the
till, which currency bought it. It is written only by `addBuilding`, beside
the date v121 added, and it records nothing at all for a building that was
completed in the queue, granted by a card or laid as a relic — absence is
"nobody bought this", which is the common case and the shape every town from
before the field already has.

The field exists because provenance cannot be recovered afterwards: by the
turn after a purchase a bought library and a built one are identical, and The
Endowment pays for one and not the other.

**A v122 save is refused and does not replay**, for the same reason as every
bump on this branch: a v122 log carries no banks, so a card written on one
would answer "nothing here was bought" forever. The branch migrates nothing.

v124 (branch `decks`; the user's ruling of 2026-10-13 in
`docs/decks/deck-design.md`, "Only the current band is dealt"): **a draft
hand is dealt only from the seat's current band**, the highest band open to
it on both the ladder tier and the research age (`currentBand`,
`statecraft/draft.ts`). Earlier bands are no longer dealt once a later one
opens; cards already held keep their chairs. The exhaustion check now reads
the bag at the waiting draft's own count, the count the hand is dealt at. No
field joined or left the state.

**A v123 save is refused and does not replay.** From the first hand dealt
after a seat's second band opens, the bag is smaller, so the same roll picks
a different card and a v123 log's `chooseOrder` index would name a card this
build never dealt. The branch migrates nothing, for the reason given under
v119.

v125 (branch `decks`; batch WC1, `docs/flags.md` (rrrrrr) part 1): **a town
taken by force enters unrest.** `City.unrest` is the one new field, absent on
every town that is not in unrest. While it stands the town makes no
production, science or culture and its borders do not grow; a new `unrest`
phase fills its pacification each turn and raises a rebel from an unguarded
town every third unguarded turn. The Courthouse gains the `easesUnrest`
marker, `rules.war.unrest` holds every figure, and the town's yield sequence
gains a thirteenth step, the unrest gate.

**A v124 save is refused and does not replay.** From the first capture on, a
v124 log's taken town would bank hammers, beakers and culture this build
withholds, and a rebel would roll dice the v124 game never rolled. The branch
migrates nothing, for the reason given under v119.

v126 (branch `decks`; batch WC2, `docs/flags.md` (rrrrrr) part 2): **losing
a war costs happiness.** `Player.warLosses` is the one new field, absent
until an empire first loses a unit or a town to another empire. Each record
is a loss stamped with its turn and the empire that caused it. War weariness
against one enemy is the losses suffered to it over the last
`rules.war.weariness.windowTurns` turns minus the losses inflicted on it over
the same turns, never below zero, with a town worth `townLoss` units. It is
one cost line per enemy in the happiness list. The `settleDiplomacy` phase
now also prunes records that have left the window.

**A v125 save is refused and does not replay.** From the first unit lost in
a war on, a v125 log's empire would be happier than this build makes it, so
its towns would grow on turns this build holds them back, and the bots would
weigh peace differently. The branch migrates nothing, for the reason given
under v119.

v127 (branch `decks`; batch WC3, `docs/flags.md` (rrrrrr) part 3): **units
earn ranks in combat.** `Unit.experience` is the one new field, absent until
a unit earns its first experience. A unit gains `rules.combat.ranks.survive`
for each fight it lives through and `kill` in place of that for a fight in
which it destroyed the unit it fought, attacking or defending. It is a
Veteran from 4 experience and Elite from 10, and the rank is one flat
strength line on the combat ledger (+3 and +6). Fights with the barbarians
can take a unit to Veteran and no further, and barbarian units earn nothing.
The strength line a card's stamp adds is now labelled "Training", because
"Veteran" names the rank.

**A v126 save is refused and does not replay.** Once any unit reaches
Veteran, a v126 log's copy of it fights weaker than this build makes it, so
its fights end differently and a later command can name a unit that is no
longer where the log expects it. The branch migrates nothing, for the reason
given under v119.

v128 (branch `decks`; batch D0 of `docs/plans/chairs-build.md`, the Dominion
cards that need no new shape): **fourteen cards join the decks, seventeen
change, and three are retired.** No field joined or left the state. The
Dominion file gains thirteen rows, and the shared file gains Carried-Off
Scholars and The Muster of the Fields, which moves out of the Expansionist
file under its own id and now needs a town of five citizens. The sheet's
three cut cards (Defensive Lines, Arsenals and Naval Supremacy) are retired.
Among the changed cards: Battle Honours becomes a commission, The Camp
Chaplains pays on kills, Songs of the Fallen pays every loss, The Pacified
Marches counts the camps cleared this game, and Martial Law moves to Tier I.
The user's rulings of 2026-10-16 are part of the same version: a unit raised
by The General Levy now pays the cards that pay for a unit gained (it still
does not count as trained), a second declaration of war restarts The
Arrière-ban's ten turns instead of stacking, and Walled Towns counts any
defensive building, the Palisade included.

**A v127 save is refused and does not replay.** The draft bags hold
different cards, so the same roll deals a different hand and a v127 log's
`chooseOrder` index would name a card this build never dealt, and a card a
v127 game held pays differently here. The branch migrates nothing, for the
reason given under v119.

v129 (branch `decks`; batch C2a of `docs/plans/chairs-build.md`): **chairs
have types again.** No field joined or left the state. In the data, each
government row's `chairMix` replaces its old `slots`: a mix of Military,
Economic, Civic and Wildcard chairs that adds up to the rung's chairs
(`docs/plans/doctrines-governments-chairs.md` section 4), and every chair
beyond the mix is a Wildcard chair. A typed chair takes a card of its own
type or an unsorted card, a Wildcard chair takes any card, and a Wildcard
card fits only a Wildcard chair (`orderFitsSlot`). Adopting a government now
re-seats the cards already seated (`reseatOrders`) where it used to empty
every chair: a card whose chair still exists and still fits it keeps that
chair, and the rest move to free chairs that fit them. Imperium, the
Merchant League and Divine Mandate count seated Orders by type (Divine
Mandate counts Civic ones now), and an unsorted card counts as the type of
its chair, a Wildcard chair included. The Empire, The Commonwealth and The
Magisterium are retired, so nobody is offered a government at draft 38.

**A v128 save is refused and does not replay.** A v128 log can seat a card
in a chair this build refuses it, its adoptions emptied councils that this
build keeps seated, and a seat that reached draft 38 adopted a government
this build never offers. Each of those changes what the seat holds from that
command on. The branch migrates nothing, for the reason given under v119.

v130 (branch `decks`; batch D1 of `docs/plans/dominion-build-triage.md`,
ranks: earning them): **eleven Dominion cards that give units experience or
pay when a unit earns a rank.** Nine join the Dominion file and two take over
existing rows: The Training Cadre replaces Drill Manuals and Honours of the
Legion replaces The War Hall Schools, each keeping its id. One field joins
the state: `Player.ranksEarned`, the number of ranks the empire's units have
ever earned, absent until the first and raised only by `settleRanksEarned`
(`cities.ts`). The rules that change:

  · experience no longer comes from fighting alone. A new end-of-turn phase,
    `drill`, runs after `muster` (The Drill Grounds, The Regimental Schools,
    The Tactica); a unit gained in a town can start with experience or a
    rank (The Training Cadre, The Drill Masters, and The Devshirme's levy);
    and a town founded beside a military unit can make it a Veteran (The
    Armed Colony). Civilians and barbarians still earn nothing;
  · earning a rank is a moment the cards pay on: the `rankEarned` windfall
    occasion and tally, and the `ranksEarned` count over the new record;
  · two cards may grant one levy use, and the row that governs it in a town
    is chosen by the town (`levyGrantFor`, `levies.ts`).

**A v129 save is refused and does not replay.** The draft bags hold
different cards, so a v129 log's picks would name cards this build never
dealt, the new phase raises the revision once more every turn, and a unit
that earns a rank writes the new record. The branch migrates nothing, for the
reason given under v119.

v131 (branch `decks`; batch C3 of `docs/plans/chairs-build.md`): **Doctrines
come with a government, and the reward hands go.** Two fields leave the
state: `PlayerStatecraft.rewardHands` and `PlayerStatecraft.pendingReward`,
with the three commands that used them (`openRewardHand`, `chooseReward`,
`passReward`). One command joins: `skipDoctrineOffer`, which passes on a
Doctrine offer. Adopting a government now opens a Doctrine offer of that
government's tier (tier 4 offers the Tier I Doctrines, tier 10 Tier II, tier
18 Tier III and tier 29 Tier IV), drawn from the seat's two decks: one from
each deck, then a third from either. A Doctrine already held is never
offered again, and with nothing to offer no offer opens. A waiting Doctrine
offer must be answered before another government is adopted. A deck's
Doctrines live in its file's new `doctrines` map; the first is Dominion's
The Steppe Confederacy, and with it the border freeze's exemption
(`meterRule` `borderFreezeExempt`) lifts the freeze's own line and lets a
border claim, where before it only cleared the flag.

**A v130 save is refused and does not replay.** A v130 seat carries the two
reward fields this build no longer reads, a v130 log may name the three
reward commands this build refuses, and from the first adoption on this
build deals a Doctrine offer the v130 game never dealt, which spends
randomness and blocks the turn until it is answered. The branch migrates
nothing, for the reason given under v119.

v132 (branch `decks`; Dominion batch D2 of
`docs/plans/dominion-build-triage.md`, ranks read, and combat rules): **nine
Dominion cards that read a unit's rank or change a rule of combat.** Seven
join the Dominion file. The Soldiers' Purse is reworked, and The Marching
Camps takes over March Discipline's row and keeps its id. One field joins
the state: `Unit.firstAttackTurn`, the turn an Elite under The Varangian
Guard made the first of its two attacks. Only `applyCombat` writes it. It is
compared against `state.turn`, never reset, and absent in any game without
the card. The rules that change:

  · a card can read a unit's rank: a combat condition (`hasRank`), a
    narrowing on a unit stat and on a flag rule (`rank`), a town scope
    (`garrisonRank`) and an upkeep rebate for each rank (`perRank`);
  · four new behaviour rules: an attack keeps fortification, a land unit
    may move after attacking, an Elite may attack twice, and a siege unit
    takes a town's walls to the floor in one blow;
  · a combat condition for a unit that has not moved this turn (`unmoved`);
  · every write of a unit's experience is announced on the economy clock,
    because a town scope now reads it.

**A v131 save is refused and does not replay.** The draft bags hold
different cards, so a v131 log's picks would name cards this build never
dealt. The branch migrates nothing, for the reason given under v119.

v133 (branch `decks`; Dominion batch D3 of
`docs/plans/dominion-build-triage.md`, pillage and grant delivery): **nine
Dominion cards about pillaging and about where a grant lands.** Eight join
the Dominion file, and Armoury Guilds is reworked in place. One field joins
the state: `Player.hexesPillaged`, the number of hexes the empire's units
have pillaged in the game. Only the pillage verb writes it (`payPillage`,
which only `pillageAt` calls, in `improvements.ts`). The wild never writes
it, and it is absent until the first pillage. The rules that change:

  · a pillage tells its riders which unit type did it, counts a tally
    (`hexPillaged`) and keeps the record above. Because the raider is now
    named, the Mandekalu's own salvage rider (`data/units.json`) pays. It
    never paid before;
  · a pillage rider can heal the raider fully, strike the enemy towns near
    the hex, put an ungarrisoned enemy town beside the hex into unrest
    (`startUnrest`'s second caller), and spread the pillage to the enemy
    improvements beside the hex. Each extra hex is a full pillage;
  · a strike (`strikeTownsNear`, `combat.ts`) takes one roll from
    `state.rng` for each town it hits, in founding order;
  · a grant's food and production can go to the capital, to every town, or
    to the nearest town that a scope admits;
  · the food and production that a pillage's riders pay settle at once.
    Before, Spoils of War's production waited for the end of the turn.

**A v132 save is refused and does not replay.** The draft bags hold
different cards, and every pillage now writes the new record. The branch
migrates nothing, for the reason given under v119.

v134 (branch `decks`; Expansionist batch E0 of
`docs/plans/expansionist-build-triage.md`, the types and the data): **the
Expansionist deck is sorted, and the cards that need no new shape are
built.** No field joins the state and no rule changes. What changes:

  · every Expansionist row on the deck's sheet carries the sheet's type, and
    so do the nine shared rows its shared table lists that had none. An
    Expansionist card now fits only a chair of its own type or a Wildcard
    chair, as Dominion's cards have since C2a;
  · twenty-seven new Expansionist rows. Eight rows change to the sheet's
    text: six Expansionist rows and two shared ones. The Rope Stretchers
    and Garden Cities were deferred and are now dealt. The Spirits of Place
    is renamed The Ambarvalia and keeps its id;
  · The Forest Gardens and Daughter Towns are retired, and so is the Keep
    building, which only the retired Vigil Charter unlocked. Each row stays
    in the data, so a town or a collection that holds one keeps it.

**A v133 save is refused and does not replay.** The draft bags hold
different cards, and a seat command that put an Expansionist card in a
chair of another type is now refused. The branch migrates nothing, for the
reason given under v119.

v135 (branch `decks`; Dominion batch D4 of
`docs/plans/dominion-build-triage.md`, unrest, authority, and "this game"
counts): **twelve Dominion cards about unrest, the writ and the game's
records.** Nine Orders join the Dominion file, The Proconsuls is reworked in
place, and two Doctrines join its `doctrines` map: The Consular Roads at
Tier I and The Universal Monarchy at Tier III. One field joins the state:
`Player.enemiesKilled`, the number of units the empire's units have killed
in the game, the wild's included. Only `tallyFall` (`combat.ts`) writes it.
The wild never keeps it, and it is absent until the first kill. The rules
that change:

  · a card can add a line to a town's pacification (`CardRule`
    `pacificationRate`), end a town's unrest at once in the unrest phase
    (`CityRuleId` `pacified`), or end it at the moment of capture
    (`ActionRuleId` `pacifyOnCapture`);
  · the end of a town's unrest is a moment the cards pay on (the `pacified`
    windfall occasion, with the town's population), paid by `endUnrest`
    (`unrest.ts`);
  · a card can set a town's writ price or scale it (`cityCost` with a
    `value` or a `percent`);
  · the writ sums a town-by-town count over the towns a row's scope admits.
    Before, such a row paid nothing;
  · three counts over the game's records (`enemiesKilled`, `unitsLost`,
    `citiesCaptured`), and two town scopes (`generalPresent`,
    `notCaptured`);
  · every town that The Outriders' hammers land in settles at once, after a
    camp and after a discovery;
  · the bots price D3's pillage extras and the places a grant can land, so
    they draft differently.

**A v134 save is refused and does not replay.** The draft bags hold
different cards, every kill now writes the new record, and the bots draft
differently. The branch migrates nothing, for the reason given under v119.

v136 (branch `decks`; Expansionist batch E1 of
`docs/plans/expansionist-build-triage.md`, the levies): **twelve
Expansionist cards about levies.** Ten join the Expansionist file; Seasonal
Levies gains the levy gate, and The General Levy its free upkeep. What
changes:

  · four new things a levy can buy: a worker, a settler, science, and hammers
    for the nearest other town building a world wonder;
  · a deal gate, "Needs a levy" (`OrderDef.needsLevy`): a gated card is
    dealt only to a seat holding a card that grants a levy;
  · three fields join the state, each absent until it is first written:
    `Player.citizensLevied`, the citizens an empire has spent on levies
    (written only by `recordLevy`); `Unit.levied`, the levy that raised a
    piece (written only by `createUnit`); and `CityLevyRecord.returns`, the
    citizens due home to a town (written by `levyAt`, emptied by the new
    phase);
  · a new end-of-turn phase, `levyReturns`, before `collectYields`. It
    raises the revision once more every turn;
  · a stamp and an upkeep rebate can be narrowed to the pieces a levy
    raised, and a citizen coming home through `settlePopulationWindfall`
    pays no growth riders.

**A v135 save is refused and does not replay.** The draft bags hold
different cards, and every resolution runs one more phase. The branch
migrates nothing, for the reason given under v119.

v137 (branch `decks`; Dominion batch D5 of
`docs/plans/dominion-build-triage.md`, units gained and new moments):
**fourteen Dominion cards that raise units or pay on new moments.** Nine
Orders join the Dominion file, three shared Orders join the common file (The
Sword of State, Copying the Enemy and The New Code), and two Doctrines join
Dominion's `doctrines` map: Total Mobilisation at Tier III and The Landsturm
at Tier IV. One field joins the state: `Player.greatPeopleByFamily`, the
great people the empire has gained in the game, by family. Only
`settleGreatPersonChoice` (`greatPeople.ts`) writes it, and it is absent
until the first great person. The rules that change:

  · every unit `realiseItem` brings into being counts for a new tally,
    `unitGained`: trained, bought, free and conscripted units alike;
  · four new moments the cards pay on: an Order draft passed
    (`draftPassed`), a town taken by force and razed (`raze`, with its
    population), an attack from range (`rangedAttack`) and a great person
    gained (`greatPersonGained`). `payOccasionRiders` (`cities.ts`) pays all
    four;
  · a grant can raise the best melee unit or each military unit a
    technology unlocks, in the capital or in each town a scope admits; can
    be paid once for each item a count finds (`perCount`); can bank science
    toward the technology of a unit killed (`towardFallenTech`, through
    `bankTowardTech`); and can open a free Order draft (`freeDraft`) that
    moves neither the draft count nor the culture;
  · a rider can fire at most once in a number of turns (`oncePerTurns`), and
    only for a kill of a unit the empire cannot build yet (`fallenUnbuilt`).
    A kill now names the unit killed (`WindfallOccasionFacts.fallen`), and a
    finished technology names itself (`tech`);
  · an Order can raise units when it is drafted (`OrderDef.onDraft`), and a
    row whose whole text is that grant is dealt;
  · a periodic muster can cost the town a citizen (`costsCitizen`);
  · a strength line can ask for a great general beside the unit
    (`besideGreatGeneral`), and a count can count great people, of one
    family or all (`greatPeopleGained`);
  · a kill, a death or a capture pays a payout that holds only science
    toward a technology or a free draft. Before, `payBattleRiders` dropped
    a payout with no yields, units, heal or timed effects;
  · the bots price the new moments and grants, so they draft differently.

**A v136 save is refused and does not replay.** The draft bags hold
different cards, every unit gained and every great person now write the new
records, and the bots draft differently. The branch migrates nothing, for
the reason given under v119.

v138 (branch `decks`; Dominion batch D6 of
`docs/plans/dominion-build-triage.md`, captures, commissions and the end of
a war): **eleven Dominion cards.** Two Orders join the Dominion file
(Danegeld, Vae Victis) and one the common file (Looted Art). Two deferred
rows come live (War Reparations, Commission: A Victor's Peace), and six live
rows are reworked in place (Commission: Clear the Frontier, Commission: Take
the City, Commission: The Grand Campaign, Commission: The Captured Marvel,
Commission: Hold the Capitals, Spolia). Five fields join the state, each
absent until it is first written:

  · `WarState.taken` and `WarState.pillaged`: the towns each side took by
    force and the hexes each side pillaged during that war, written only by
    `recordWarCapture` and `recordWarPillage` (`wars.ts`);
  · `City.originalCapitalOf`: whose first town this is, written beside
    `originalCapital` in `createCity`;
  · `Player.opusBank`: production kept for the Magnum Opus until a town
    raises it;
  · `PlayerStatecraft.chairsWon`: Wildcard chairs a commission gave for the
    rest of the game. The tally rows (`OrderTally`) may also carry `people`,
    `wonders` and `town`.

The rules that change:

  · a peace pays each side's `peace` riders with what it won
    (`takenPopulation`, `hexesPillaged`), and the end of a war, by peace or
    by the other empire's destruction, is a tally a commission counts
    (`warEnded`, with the towns taken);
  · a counted commission goal may have a floor (`minPopulation`,
    `minTownsTaken`), keeps the towns it counted, and a reward may read them
    (`fromGoal`), build in the town that met it (`building`), grant citizens
    (`citizens`, to the capital or the smallest towns) or add Wildcard
    chairs (`wildcardChairs`, read by `chairCount`);
  · three commission figures that read the towns taken this turn or ever
    (`capturedPopulation`, `capturedThisTurnPopulation`,
    `capturedThisTurnWonders`) are gone: the goal's own record replaces
    them. `originalCapitalsHeld` no longer counts the empire's own first
    town, and The Captured Marvel no longer counts it either;
  · a production grant sent to the Opus with no town raising it is kept on
    `Player.opusBank`, and `releaseOpusBanks` (`cities.ts`) moves it into
    the town raising the Opus at the start of the production phase. Before,
    it went to the capital;
  · an amplifier can scale an Order's capture riders (`captureRewards`), and
    a renown grant can be a share of the moment (`fromOccasion`). A capture
    now carries the works and wonders inside the town (`worksAndWonders`);
  · the bots price the peace moment and the capture amplifier.

**A v137 save is refused and does not replay.** The draft bags hold
different cards, every war and every first town now write the new records,
a Spolia grant lands somewhere else, and the bots draft differently. The
branch migrates nothing, for the reason given under v119.

v139 (branch `decks`; Expansionist batch E2 of
`docs/plans/expansionist-build-triage.md`, moments, records and counts):
**ten Expansionist cards.** Nine join the Expansionist file, and The Land's
Great Work now counts towns of at least eight citizens, as its text says.
What changes:

  · two fields join `City`, each absent until it is first written:
    `largestSize`, the most citizens the town has ever had (written by
    `foundCityAt` and `settleSizeRecord`), and `joinedBy`, the empires whose
    capital the town has been joined to by road (written only by the new
    phase);
  · three windfall occasions: a town growing past its largest size
    (`sizeRecord`), the world taking a census (`census`, paid to every real
    empire) and a town first joined to its capital by road
    (`joinedToCapital`). The completion occasions now carry the town's
    population;
  · a tally occasion, `sizeRecord`, and two counts: `citiesFounded` (the
    record `Player.citiesFounded`) and `citiesAdmitted` (the towns a scope
    admits, which a production bonus can read);
  · a founding rider can start a town at a share of the largest town
    (`fromLargest`);
  · a new end-of-turn phase, `roadJoinings`, after `levyReturns` and before
    `collectYields`. It raises the revision once more every turn, and it
    writes `City.joinedBy` for every real empire, with or without the card.

**A v138 save is refused and does not replay.** The draft bags hold
different cards, every resolution runs one more phase, and towns carry the
two new fields. The branch migrates nothing, for the reason given under
v119.

v140 (branch `decks`; Expansionist batch E3 of
`docs/plans/expansionist-build-triage.md`, the land): **ten Expansionist
cards about the land.** Five join the Expansionist file; The Prospectors,
The Watercourses and The Landscape Garden now do what their text says; The
Common Domain and The Raising of the Land were deferred and are now dealt,
the second at Tier III with the sheet's text. What changes:

  · two fields join `Tile`, each absent until it is first written:
    `marks`, the lasting marks on a hex (written only by `markHex`, and only
    ever added to), and `surfacedBy`, the empire whose survey struck the
    seam (written only by `prospectAt`, on a strike);
  · the rule book gains `improvements.hexMarks`, what each mark pays and
    while what stands on the hex, and the hex fold reads it;
  · a farm can count as having fresh water by its empire's law
    (`farmWaterOf`): the Irrigation renewal, the farm's placement and the
    cards' `freshwater` test all read it;
  · three tile tests (`river`, `wonderTown`, `surfaced`), a combat condition
    that reads the hex a piece stands on (`standingIn`), three behaviour
    rules (`woodsWalk`, `riverFarmsWater`, `farmChainsWater`) and two city
    rules (`workMountains`, `widerReach`);
  · a town's reach is its own (`workRadiusOf`), mountains can be workable,
    and a unit's step into forest or jungle can cost the open-ground price;
  · a windfall rider can name the building finished and can mark a town's
    land, and a great person's act now pays its riders in the town where the
    act landed rather than in the capital;
  · an Order amplifier can carry a tile test, and then raises hex lines only.

**A v139 save is refused and does not replay.** The draft bags hold
different cards, and the riders of a great person's act land in a different
town. The branch migrates nothing, for the reason given under v119.

v141 (branch `decks`; Expansionist batch E4 of
`docs/plans/expansionist-build-triage.md`, works, claims and borders): **ten
Expansionist cards.** The Keeps, The Garden Frontier and The Staked Claims
join the Expansionist file. Outposts, The Polders, Migration, The Great
Migration and The Encroaching Fields were deferred and are now dealt. The
Fish Traps and The Wide Country now do what their text says. No field joins
the state. What changes:

  · three improvement rows join the table (`townKeep`, `polder`, `outpost`),
    each opened while a seated card names it (`unlocksImprovement`). The
    Keep copies the hexes around it and gives its hex's defender +5, one in
    each town; the polder yields as a farm on grassland; the outpost is laid
    beyond the borders and claims the unowned ring around it;
  · a tended work may be laid on unowned ground near the borders under The
    Garden Frontier (`worksBeyond`), and the hex joins the nearest town;
  · a worker of a seat holding The Fish Traps may step onto a lake as if
    embarked (`MoveProfile.wades`), and only the fish traps may be laid on
    one;
  · a founding rider can claim every unowned hex within a radius
    (`claimRadius`), and a town founded on an outpost takes its land;
  · the tally `hexBought` is now `hexClaimed`: hexes claimed by an outpost,
    a cleared camp or buying;
  · two new end-of-turn phases after `expandBorders`, `encroachment` and
    `migration`, which run The Encroaching Fields (`encroach`) and the two
    migrations (`migration`) every ten turns. Each raises the revision once
    more every turn;
  · the bots may lay Keeps and polders when a seated card opens them.

**A v140 save is refused and does not replay.** The draft bags hold
different cards, every resolution runs two more phases, and the bots lay
different works. The branch migrates nothing, for the reason given under
v119.

v142 (branch `decks`; Dominion batch D7 of
`docs/plans/dominion-build-triage.md`, economy rules and Double Time):
**thirteen Dominion cards.** Eight Orders join the Dominion file (The Spear
Makers, The Defiant Kingdom, The Hunting Grounds, The Funeral Oration, The
Castra, Double Time, War Feeds Itself, The Glorious Dead) and one the common
file (The Farming Garrisons, shared with Expansionist). A deferred row comes
live (The Legions' Labour), and three Doctrines join Dominion's `doctrines`
map: The Marian Reforms at Tier I, The Laws of Lord Shang at Tier II and The
Fortress Empire at Tier IV. No field joins the state. An Order row may name
a last band (`OrderDef.lastBand`): Double Time is dealt in bands 2 and 3.
The rules that change:

  · a town's yields gain a fourteenth step: a card may move the town's food
    surplus into production while the town builds a row the card names
    (`explainSurplusMoved`), and the growth channel then banks none of it.
    The empire's steps are now 15 to 20;
  · a production percentage can join the empire stage (`stage: 'empire'`);
  · a hex test asks whether a fortified military unit of the empire stands on
    the hex (`fortifiedUnit`, answered through `GroundFacts`), and a count
    counts those units (`fortifiedUnits`);
  · a unit filter can ask for a unit's age (`ageAtMost`), a town scope for
    the row at the front of its queue (`producing`), and an empire condition
    for a met empire that holds more towns (`rivalHoldsMoreTowns`);
  · disbanding a unit is a moment the cards pay on (`disband`), with the town
    the unit stood in and its production cost, and a rider can ask for that
    town (`inTown`);
  · a barbarian camp near the towns of an empire whose law speeds it musters
    sooner (`campMuster`), and an empire's law can count its own war losses
    for less (`unitLossWeariness`, `townLossWeariness`);
  · at the end of a turn, a unit in enemy territory can yield its owner the
    hex's yields (`harvest`, run in the drill phase);
  · an Order's periodic boons, musters, drills and harvests can happen twice
    (`turnEffectRepeats`);
  · a write of a unit's fortification moves the economy clock, and a
    completion rider that pays only science toward a technology or a free
    draft is now paid (`payCompletionRiders` asks `windfallPayoutIsEmpty`);
  · the bots price the new shapes, so they draft differently.

**A v141 save is refused and does not replay.** The draft bags hold
different cards, a disbanded unit now pays the cards that pay on one, and
the bots draft differently. The branch migrates nothing, for the reason
given under v119.

v143 (branch `decks`; Expansionist batch E5 of
`docs/plans/expansionist-build-triage.md`, meters, commissions and the shared
militia): **eight cards.** The Burhs, Commission: Break the Sod, The
Sovereign Writ and The Imperial Roads join the Expansionist file, and The
Frontier Militia joins the shared file. The Heartland was deferred and is
now dealt, and The Domesday Survey and The Master of Works now do what their
text says. One field joins the state, absent until it is first written:

  · `City.markedBy`: the commissions that marked the town, each with the
    empire that held it then, written only by `markGoalTown`
    (`commissions.ts`).

The rules that change:

  · a commission reward may mark the town that met the goal (`markTown`),
    hand over effects for the rest of the game (`lasting`, read by
    `liveEffects` from the fulfilled commissions) and pay each town from its
    own figure (`eachTown`). The `markedBy` town scope reads the mark;
  · two commission figures, `improvedOnlyTilesWorked` and
    `oneTownWorkedHexes`, and a goal's floor on each hex
    (`hexYieldAtLeast`); a goal one town meets names its town in
    `commissionGoalTown`;
  · a meter rule, `writUncapped`, takes the ceiling off the writ's bonus;
  · a founding rider can raise a unit in the new town (`unit`), a production
    bonus can name fortifications (`defensive`, read by `isFortification`),
    a windfall rider's town filter (`inTown`, from Dominion batch D7) now
    reads a great person's act too, and a grant can be read off the
    empire's other towns (`fromTowns`). A great person's act now carries
    its town (`WindfallOccasionFacts.townId`, the fact D7's disband moment
    fills).

**A v142 save is refused and does not replay.** The draft bags hold
different cards, and The Domesday Survey and The Master of Works pay
differently. The branch migrates nothing, for the reason given under v119.

v144 (branch `decks`; the lake fix, "L1", the user's ruling of 2026-10-16,
`docs/flags.md` (wwwwww)): **a lake is water like the coast.** No field
joins the state. What changes:

  · the lake's terrain row is `embarkable`, so a land piece that may embark
    (Sailing; soldiers at Wayfinding) may cross a lake, and a hull may enter
    one from a port beside it. Every step is priced through `stepCost`, as
    for the coast;
  · E4's lake rule for workers is removed: `MoveProfile.wades`, the
    improvement row field `workersWade` and `workerWaters`. A worker lays
    fish traps on a lake as on the coast, standing on the hex, embarked;
  · the Floating Gardens' deferred note is removed, because its lake half
    can now be built.

Whether a town beside a lake is coastal is unchanged.

**A v143 save is refused and does not replay.** Pieces now path across
lakes, so the bots move differently. The branch migrates nothing, for the
reason given under v119.

v145 (branch `decks`; Dominion batch D8 of
`docs/plans/dominion-build-triage.md`, the last Dominion Doctrines):
**eight Doctrines join Dominion's `doctrines` map**, so all sixteen of the
sheet's Doctrines are in the data. The Soldiers' Share and The Servian
Reforms join Tier I; Centurions, The Plunder Economy, The Strategoi and
Weight of Numbers join Tier II; Combined Arms joins Tier III; and The Scourge
of God joins Tier IV. One field joins the state: `Player.strikesThisTurn`,
the attacks an empire's units made this turn, kept only for an empire whose
law counts them. The rules that change:

  · a grant can heal every unit within some hexes of the moment's hex and
    raise each fighting unit one rank (`healWithin`, `rankWithin`), and can
    hang timed effects on the unit that acted (`actorTimed`, hung by
    `pillageAt`);
  · a pillage carries the raider's own strength (`pieceStrength`);
  · three behaviour rules: no founding (refused in `foundingError` and, for
    a unit that founds cities, in `buildError`), no experience (asked in
    `ranks.ts`), and a siege unit screened from melee by a melee unit beside
    it (`screenError`, asked by `attackTargetAt` and `planCombat`);
  · a unit cost percentage for a class of units, as a line of
    `explainUnitCost` (`unitCost`);
  · a strength line can count the Elites beside a unit (`CombatScale.rank`)
    or the attacks already made this turn on the same target
    (`attacksOnTarget`);
  · an upkeep surcharge can name a rank, and a unit a free rebate covers pays
    no surcharge at all (`freeByLaw`);
  · a great general's aura can be amplified (`generalAura`), and a hex row can
    take a share of everything the hex pays (`wholePercent`, the hex's last
    line);
  · the bots price the new shapes, so they take different Doctrines.

**A v144 save is refused and does not replay.** The Doctrine offers hold
different cards, so every seat that adopts a government is dealt a
different hand, and the bots choose differently. The branch migrates
nothing, for the reason given under v119.

v146 (branch `decks`; Expansionist batch E6 of
`docs/plans/expansionist-build-triage.md`, the two cards that waited for
Dominion batch D7): **two cards come live.** The Breadbasket and Veteran
Colonies were deferred and are now dealt. No field joins the state. The
rules that change:

  · a town scope asks whether the town's owner told it to stop growing
    (`avoidsGrowth`, read off `City.avoidGrowth`). The Breadbasket moves
    such a town's food surplus into production through D7's
    `surplusToProduction`, whatever the town builds;
  · while a card moves a town's food surplus into production, the Avoid
    growth tick no longer moves the town's citizens off food
    (`assignCitizens` skips `capFoodSurplus`). This reaches The Laws of Lord
    Shang too, in a town told to stop growing while it builds a military
    unit;
  · Veteran Colonies is a rider on D7's disband moment: a military unit
    disbanded on the hex of one of your towns pays that town food equal to
    its production cost, as a growth windfall.

**A v145 save is refused and does not replay.** The draft bags hold
different cards. The branch migrates nothing, for the reason given under
v119.

v147 (branch `decks`; the movement fixes of `docs/flags.md` (xxxxxx), ruled
2026-10-17): **units stuck on water, and routing round a blocking unit.**
No field joins the state. The rules that change:

  · a step from land onto water (the coast or a lake), or from water onto
    land, spends the whole allowance and ends the march on the hex it lands
    on, so `findPath` plans such a step only onto a hex where the piece may
    stop (`endsTheMarch`, `canStopOn`). Before, a march could aim its landing
    at a full town hex and then wait at the water's edge for good;
  · when the hex a march has to rest on holds a piece that leaves it no
    room, the walk plans a way round that hex to the same goal
    (`findPathAround`) and walks it. A route on dry land goes round on dry
    land. When there is no way round, the piece waits, as before. The order
    left on the unit is the detour's remainder, and the command's result
    names the cells walked (`CommandResult.reroutes`);
  · the bots step a garrison out of a town only onto land, never leave a
    land piece asleep or dug in on the water (it comes ashore instead), and
    never dig in to mend there.

**A v146 save is refused and does not replay.** Its marches would walk
different routes: a landing it planned onto a full hex is refused, and a
march it left waiting at a blocked hex now goes round. The branch migrates
nothing, for the reason given under v119.

v148 (branch `decks`; the user's ruling of 2026-10-17, `docs/flags.md`
(aaaaaaa)): **towns may take each other's hexes with the citizen tool.** No
field joins the state. The rules that change:

  · a pin (`setLockedTiles`) may go on a hex that another town of the same
    empire owns inside this town's work radius (`takeableTiles`). The pin
    takes the hex: `takeTile` moves its owner in `state.tileOwner` to this
    town, the losing town drops its pin there, and both towns are re-seated
    in the same command. The hex stays this town's when the pin is lifted;
  · a take that would give a town a second "at most one per town" work (The
    Keeps) is refused;
  · the automatic assignment, and so the bots, never take a hex.

**A v147 save is refused and does not replay.** Its own pins would replay as
they were, but the rule a pin is judged by has changed, and the branch
refuses a save from before a rule change. It migrates nothing, for the
reason given under v119.

v149 (branch `decks`; the user's ruling of 2026-10-17, `docs/flags.md`
(ccccccc)): **the Order tiers open at the government tiers.** No field joins
the state. The ladder's rungs (`tierLadder`) are now 0 · 4 · 10 · 18 · 29
drafts, one per band, with 3 · 5 · 5 · 8 · 11 chairs. Since schema 119 they
had been 0 · 4 · 18 · 29 · 38: the tier-10 governments add no chairs and
had no rung, so every Order tier from Tier II up opened one government tier
late. The rules that change:

  · Tier II is dealt from draft 10 (with research age three), Tier III from
    draft 18 (age four) and Tier IV from draft 29 (age four). Before they
    were dealt from drafts 18, 29 and 38;
  · draft 38 is no longer a rung. Its governments stay retired, so it opens
    nothing;
  · no chair count changes: the tier-10 rung keeps the five chairs of the
    rung below it, and every government row keeps its own figure.

**A v148 save is refused and does not replay.** A seat between drafts 10 and
17 is now dealt Tier II hands where it was dealt Tier I hands, so every
later pick differs. The branch migrates nothing, for the reason given under
v119.

v150 (branch `decks`; the user's ruling of 2026-10-17, `docs/flags.md`
(ddddddd): *"lets move tier IV to tier 26"*): **Tier IV opens at 26
drafts.** No field joins the state. The rules that change:

  · the last rung of `tierLadder` is 26 drafts instead of 29, so Tier IV is
    dealt from draft 26 (with research age four);
  · the last live governments (The Estates, The Sultanate, The Curia) are
    offered at tier 26 instead of 29, with their eleven chairs, and the Tier
    IV Doctrines come with them (`governmentTierForDoctrineBand`).

**A v149 save is refused and does not replay.** A seat at drafts 26 to 28
is now offered a government, a Doctrine offer and Tier IV hands where it was
offered none of them. The branch migrates nothing, for the reason given
under v119.

v151 (branch `decks`; the user's ruling of 2026-10-17, `docs/flags.md`
(eeeeeee): *"lets remove the research age altogether"*): **an Order tier
opens at its draft rung alone.** No field joins the state. The rules that
change:

  · a seat is dealt from the band its draft count has reached
    (`currentBandOf`): Tier I from draft 4, Tier II from 10, Tier III from
    18 and Tier IV from 26, in any research age. Before, each band also
    needed the research age one above it (Tier I age two, Tier II age three,
    Tiers III and IV age four), the rule of 2026-09-16;
  · `bandOpen` and `currentBand` are gone. They had no input left but the
    ladder tier.

**A v150 save is refused and does not replay.** A seat whose draft count was
ahead of its research age is now dealt hands from a later band, so the same
roll picks a different card and every later pick differs. The branch
migrates nothing, for the reason given under v119.

v152 (branch `decks`; Scientific batch S0, `docs/plans/scientific-build-
triage.md`): **the charter technologies.** No field joins the state. The
rules that change:

  · thirteen technologies join `data/techs.json`, each marked
    `TechDef.charter`. Only a seat that drafted the charter naming one may
    research it. They sit off the sky (`TECH_IDS` is still the fifty
    ordinary rows; `ALL_TECH_IDS` holds all sixty-three), and none moves an
    empire's age, marks a world first or counts as a node of the last age;
  · a technology's price is a fold (`explainTechCost`, `foldTechCost`): the
    column price, then for a charter technology a premium of
    `rules.research.charterPremiumPercent`, then the cards' percentages,
    added together and floored once. An ordinary technology with no card on
    it costs what it cost before;
  · two Scientific cards come live: The Commonplace Book (Tier I) and The
    Patent Office (Tier IV). The thirteen charter rows are in the deck file
    and stay deferred until their gifts are built. The Metallurgists' and
    Naturalists' Charters are retired.

**A v151 save is refused and does not replay.** A Scientific seat's pool now
holds two more cards, so its hands from Tier I on differ, and the roster of
technologies a log may name has changed. The branch migrates nothing, for
the reason given under v119.

v153 (branch `decks`; Scientific batch S1, `docs/plans/scientific-build-
triage.md`): **the line traits.** No field joins the state. The rules that
change:

  · a technology row may carry line traits (`TechDef.traits`): a name, a
    unit line and card effects, read as `liveEffects`' tenth source and
    labelled "<technology> · <trait>". A unit filter may name a line
    (`UnitFilter.line`): the named unit and every unit its upgrade chain
    reaches. Casting gives the Hoplite and the Maryannu, Mechanics the
    Onager and the Repeating Crossbow, Chemistry the Grenadier and Naval
    Gunnery the Galleass;
  · two strength scales (the citizens of your own town a piece stands in,
    and the charter technologies you know), one count (the second of
    these) and one behaviour rule (`blockades`). Whether a piece blockades
    is now a question about the piece, its row's marker or its owner's
    cards, at all four places that ask it;
  · three Scientific charters are dealt: the Bronze-Founders', the
    Mechanists' and the Naval Gunners'.

**A v152 save is refused and does not replay.** A Scientific seat's pool now
holds three more cards, so its hands differ from the opening draft on. The
branch migrates nothing, for the reason given under v119.

v154 (branch `decks`; Scientific batch S1b, `docs/plans/scientific-build-
triage.md`): **the Scientific sheet of record and the chair types.** No
field joins the state. The rules that change:

  · the Scientific deck is sorted: each of its twenty-six current rows
    carries a type (`OrderDef.type`), from the Type column of
    `docs/decks/scientific.md`. So is each shared row that sheet lists,
    eight of them for the first time (the cards Scientific shares with
    Commerce, Devotion and Magisterial). A typed card fits only a chair of
    its own type or a Wildcard chair, so a seat command that seated one of
    these cards in another chair is now refused;
  · twenty-four Scientific rows are retired: Field Notebooks, the ten live
    rows the sheet cut on 2026-10-06, Discoveries through Great People and
    twelve deferred rows. The shared The Hydraulic Commonwealth is retired
    too. A retired row leaves every pool.

**A v153 save is refused and does not replay.** A Scientific seat's pool now
holds eleven fewer cards, so its hands differ from the opening draft on, and
a logged seat command may now be refused. The branch migrates nothing, for
the reason given under v119.

v155 (branch `decks`; Dominion batch D9, `docs/plans/dominion-themes-
triage.md`): **the Dominion themes pass, first batch.** No field joins the
state. The rules that change:

  · ten Dominion Orders are retired (Muster Rites, The Funeral Games, The
    Armourers' Secret, The Marshals, The Marching Camps, The Open Muster,
    The Cleruchy, The Valetudinaria, The State Forges, The Keshik), and so
    is the Doctrine The Servian Reforms. No pool or offer deals them. A seat
    that holds one keeps it, with its effects;
  · one new Order comes live: The Champion's Portion (Tier 0);
  · four Orders change: Clear the Frontier and Battle Honours trade rewards,
    and Battle Honours asks for six kills, not ten; The Camp Chaplains also
    pays faith when you lose a unit; The Bards' Praise pays 30 culture for
    a camp, not 15.

**A v154 save is refused and does not replay.** A Dominion seat's pool and
its Tier I Doctrine offer now hold different cards, so its hands differ.
The branch migrates nothing, for the reason given under v119.

v156 (branch `decks`; Scientific batches S2 and S3, `docs/plans/scientific-
build-triage.md`): **the guildsmen as a card count, and readings against
the empires a seat has met.** No field joins the state. The rules that
change:

  · new card kinds: the count `guildsmen` (feature A); the counts `techLead`
    and `techGap`, the strength scale `techLead`, the combat condition
    `vsFewerTechs`, the production filter `aheadOfMet`, the rider filter
    `unbuildableByMet` and the rule `gapTechCost` (feature B, read through
    the new leaf `rivals.ts`). A technology a met empire already knows can
    now carry a card line in `explainTechCost`;
  · seven Scientific Orders come live (The Scholars' Guild, The Secret Arts,
    The Edge of the Sword, The Translation Movement, The Great Designs, Greek
    Fire, The Proving Ground), and one shared Commerce and Scientific Order
    (Books from the Ships).

**A v155 save is refused and does not replay.** A Scientific or Commerce
seat's pool now holds more cards, so its hands differ from the opening draft
on. The branch migrates nothing, for the reason given under v119.

v157 (branch `decks`; Dominion batch D10, `docs/plans/dominion-themes-
triage.md`): **the Dominion themes pass, the data-only cards of Tiers I to
III.** No field joins the state. The rules that change:

  · nine new Orders come live: The Castle Demesne, The Spartan Discipline,
    Commission: The Ranks of Merit and Commission: The First Province
    (Tier I); The Naadam, The Taker of Cities and The Roll of Triumphs
    (Tier II); The March Revenues and The Tributary Kings (Tier III);
  · two Orders change: The Acropolis pays culture and authority for
    citadels, not authority for the capital's buildings; Commission: Take
    the City asks for a city of eight citizens, not five, and its reward
    becomes science and culture for each later capture, for the rest of
    the game, in place of a one-time payout and a Barracks.

**A v156 save is refused and does not replay.** A Dominion seat's pools
from Tier I on now hold more cards, so its hands differ. The branch
migrates nothing, for the reason given under v119.

v158 (branch `decks`; Scientific batch S4, `docs/plans/scientific-build-
triage.md`): **the building charters.** No field joins the state. The rules
that change:

  · eight Scientific charters are dealt: the Herbalists', Glassmakers',
    Librarians', Paper-Makers', Physicians', Printers', Gunfounders' and
    Military Engineers';
  · their charter technologies now give something. Optics, Cataloguing,
    Medicine, Printing and Gunfounding open five new buildings (the
    Specularium, the Mouseion, the Bimaristan, the Aldine Press and the
    Tophane). Papermaking opens the Scriptorium, which no card opens any
    more, and Military Architecture opens the Bastion, which waited for a
    technology until now. Herbals opens a new worker row, the Physic Garden,
    and pays happiness for each one inside your borders. Printing gives one
    more trade route;
  · a building row may cost a share more than its size and column say
    (`BuildingDef.costPercent`, the Mouseion's premium), as one more line
    of `explainBuildingCost`. The Scriptorium and the Bastion now cost what
    their technologies' columns say.

**A v157 save is refused and does not replay.** A Scientific seat's pool now
holds eight more cards, so its hands differ from the opening draft on, and a
logged build of a Scriptorium or a Bastion meets a different gate and price.
The branch migrates nothing, for the reason given under v119.

v159 (branch `decks`; Dominion batches D11 and D12, `docs/plans/dominion-
themes-triage.md`): **the Dominion commissions, and five small automatic
rules.** The two batches were built as 155 and 156 on their own branch and
merged after S4 together, so they share one number. No field joins the
state. The rules that change in D11 (the commissions):

  · five new Orders come live: Commission: Man the Walls (Tier 0), The
    Ovation (Tier I), The Res Gestae and Commission: The Border Fortress
    (Tier II), and Commission: The Chosen Men (Tier III);
  · Commission: The Captured Marvel's reward becomes +30% science and
    culture, for the rest of the game, in captured towns that hold a world
    wonder or were founded as another empire's capital, in place of a
    one-time payout;
  · meeting a commission is a moment the empire's cards can pay on, and the
    commissions met are a count;
  · the `rankEarned` tally is written once for each rank, with the rank,
    and the great-person spend tells the tally the work it laid;
  · a rank's production lands and settles at once, except for a unit gained
    already holding a rank, whose hammers still wait for the production step.

The rules that change in D12 (the automatic rules):

  · two new Orders come live: Commission: Harry the Border (Tier I) and
    Rally to the Standard (Tier III);
  · three Orders change: The Gathering Host grows only for military units
    gained; The Soldier-Farmers pay +1 production and +1 gold on each worked
    hex with a resource in a garrisoned town, at war or at peace; The
    Marshalate adds +1 to the great generals' aura for each great general
    gained, at most +5, in place of its strength line and citadel yields;
  · a card's resource tests (`hasResource`, `resourceKind`, `resource`)
    answer only for a resource the empire can see, in hex lines, in counts
    of hexes and in scopes over worked hexes. A card no longer pays on
    copper, horses, camels, iron or niter before the technology that reveals
    it;
  · the `militaryGained` tally is written beside `unitGained`.

**A v158 save is refused and does not replay.** A Dominion seat's pools now
hold more cards, and every seat's resource lines read the sight gate. The
branch migrates nothing, for the reason given under v119.

v160 (branch `decks`; Scientific batch S5, `docs/plans/scientific-build-
triage.md`): **the learned land.** No field joins the state. The rules that
change:

  · the Surveyors' and the Alchemists' Charters are dealt. Surveying opens
    the Aqueduct before Engineering and a new worker row, the Qanat, which
    waters the farms beside it. Chemistry opens a new worker row, Niter
    Beds, built beside a farm or pasture, which supply one niter;
  · eight more Scientific Orders come live: The Prospectors' Notes, The
    Founding Gift, The Latin Quarter, The Studium Generale, The Nizamiyya,
    The Republic of Letters, The School of Mines (the old Strategic
    Reserves row), and The Long Inheritance at its new text;
  · The Assay moves to the shared cards (Expansionist and Scientific) with a
    new text: hexes with a strategic resource gain science;
  · a great person's work pays the riders on building an improvement, as a
    worker's build does;
  · a town scope `hasImprovement` reads a variant row as its base row.

**A v159 save is refused and does not replay.** A Scientific or
Expansionist seat's pools now hold different cards, and a logged Aqueduct
meets a different gate. The branch migrates nothing, for the reason given
under v119.

v161 (branch `decks`; Dominion batches D13, D14 and D15, `docs/plans/
dominion-themes-triage.md`): **The Limitanei, the three drafts and The
Upstarts.** The three batches were built as 160 and 161 on their own
branch and merged after S5 together, so they share one number. No field
joins the state.

The rules that change in D13 (The Limitanei):

  · one new Order comes live: The Limitanei (Tier III, rare);
  · a card's `garrisonWorks` rule lets a town work one more hex for each
    combat unit of its owner on the town's hex, ships included, up to the
    rule's `max`. The assigner (`chooseCitizens`) fills these seats after
    the citizens' seats. The extra hexes eat no food and count as worked
    hexes for every card.

The rules that change in D14 (the three drafts):

  · two Orders come live: The Relay Stations (Tier II) and Circumvallation
    (Tier IV). The row `marineDrill` becomes The Longships and plays a new
    rule;
  · a card's `shoreRaid` rule makes each naval combat unit of its holder
    pillage, at the end of the turn (the `drill` phase), the first enemy
    improvement on land beside it (`raidFromTheSea`). The raids join the
    turn's pillage reports;
  · a `unitStat` line can name `where: 'connectedTown'`: a unit standing in
    one of its owner's towns joined to the capital by road;
  · a card's `opusSiege` rule holds a rival town's production at nothing
    while it builds a Magnum Opus, is under siege, and a combat unit of the
    holder stands beside it (`explainOpusGate`, step 13 of
    `docs/yields.md`).

The rules that change in D15 (The Upstarts):

  · one new Order comes live: The Upstarts (Tier I, a new row);
  · a strength line can ask `vsMoreTechs`: the other side's empire knows
    more technologies than this one.

**A v160 save is refused and does not replay.** A Dominion seat's pools in
every tier from I to IV now hold more cards, so its hands differ, and
Marine Drill's strength lines are gone. The branch migrates nothing, for
the reason given under v119.

v162 (branch `decks`; Scientific batch S6, `docs/plans/scientific-build-
triage.md`): **the research record.** No field joins the state. The rules
that change:

  · eleven Scientific Orders come live: The Royal Workshops, The Prize
    Essay, The Sky Watchers, The Astronomical Diaries, The Scholars' Fame,
    The Charter Rolls, The Royal Charter Commission, The Age of Reason, The
    Journeymen, The Sum of Knowledge and The Great Catalogue;
  · completing a technology is written down for the seated Orders that
    count it (`techCompleted`, and `charterTechCompleted` for a charter
    technology), and its price travels with the `tech` occasion;
  · the `tech` occasion now pays a rider that grants renown alone, and the
    food and production its riders pay settle in their towns at once;
  · a grant may pay each town by its own citizens (`fromTownPopulation`),
    and The Age of Reason makes an Order count each technology twice.

**A v161 save is refused and does not replay.** A Scientific seat's pools
now hold eleven more cards, so its hands differ. The branch migrates
nothing, for the reason given under v119.

v163 (branch `decks`; Scientific batch S7, `docs/plans/scientific-build-
triage.md`): **the data-only cards of Tiers 0 to II.** No field joins the
state, and no shape is new. The rules that change:

  · nine Scientific Orders come live: The Royal Tutors, The War Manuals,
    The Royal Estates, The Common Tables, The Free Cities, The Roll of
    Scholars, The Palace Schools, The Round City and The City Architects;
  · Learned Commissions becomes Learned Foundations under the same id:
    +25% toward empire buildings in a Library town, and its two riders
    for a first empire building of each kind are gone;
  · Enduring Institutions pays +25% production and no happiness;
  · The Quiet Faculties reads a worked Academy, not any great person's
    work, and pays +25% food and +20% production.

**A v162 save is refused and does not replay.** A Scientific seat's pools
now hold nine more cards, so its hands differ, and three live cards pay
different figures. The branch migrates nothing, for the reason given under
v119.

v164 (branch `decks`; Scientific batch S8, `docs/plans/scientific-build-
triage.md`): **great people and the great houses.** No field joins the
state. The rules that change:

  · a rider may grant a great person (`WindfallGrantSpec.greatPerson`),
    dealt as a commission's is, and a completion rider may name an any-of
    filter (`anyOf`);
  · the great-person price reads the empire's cards (`renownThreshold`
    takes the state; the `scholarLadderStep` rule);
  · `buildsEverywhere` may lift the one-to-a-realm limit for a counted
    number of copies of every great house, in the towns a scope admits, and
    a queue being replaced counts its own building rows for it;
  · `unlocksBuilding` may open a row in some towns only, and the University
    is a row a card may open early;
  · a commission may count the Academies inside the borders
    (`academyHexes`);
  · eleven Scientific Orders come live: The Forward Plans, The Dedications,
    The Royal Readers, The Invitations, The Second Seat, The Doctorate, The
    Royal Academies, The Queen of Cities, The Humanists, The Walls of
    Learning and The Lynx-Eyed Academy.

**A v163 save is refused and does not replay.** A Scientific seat's pools
now hold eleven more cards, so its hands differ. The branch migrates
nothing, for the reason given under v119.

v165 (branch `decks`; Expansionist batches E7 and E8, `docs/plans/
expansionist-themes-triage.md`): **the Expansionist themes sheet, the
retirements, ten cards changed in place and five new Orders.** The two
batches were built as 163 and 164 on their own branch and merged after S7
and S8 together, so they share one number. No field joins the state.

The rules that change in E7 (the sheet, the retirements and ten cards
changed in place):

  · fifteen Expansionist rows are retired: The Pyramid Builders, The
    Beating of the Bounds, The Prospectors, The Garden Frontier, The
    Builders' Levy, The Plough Teams, The Polis, The Landscape Garden, The
    Common Domain, The Woodwrights, Public Works, The Manors, The Assay
    Office, The Managed Wild and The Land's Great Work. No draft deals them
    again, and a seat that already holds one keeps it and its effects;
  · ten Expansionist Orders change in place. The Rope Stretchers pays
    science for the improved tiles in a town. The Milestones pays gold and
    culture, and The Teeming Realm science and culture. The Measure of the
    Land pays science, at most +10. The Mother City gives the capital +5%
    production and culture for each town founded. Plenty pays five times
    the new population. The Staked Claims moves to Tier II. Six Gardens,
    The Wide Country and The Domesday Survey now leave an institution, and
    the Domesday goal falls to 120 hexes and 40 tiles;
  · five Orders change type to civic, and The Two Harvests (still
    deferred) to wildcard.

The rules that change in E8 (five new Orders in shapes that already
existed):

  · The Founding Furrow (Tier 0): founding a town grants culture equal to
    five times the number of towns you hold, the new town included;
  · The Horrea (Tier 0): each Granary you hold gives +1 authority;
  · The Land Hunger (Tier I): while a met empire holds more towns than you,
    your towns build settlers 25% faster and your settlers gain +1
    movement;
  · The Many Hands (Tier II): your towns build empire buildings 3% faster
    for each town you hold, at most +36%;
  · The Capitolia (Tier III): each empire building you hold gives each of
    your towns +1 culture.

**A v164 save is refused and does not replay.** An Expansionist seat's
pools lose fourteen cards and gain five, and five of its cards fit other
chairs, so its hands and its councils differ. The branch migrates nothing,
for the reason given under v119.

v166 (branch `decks`; Scientific batch S9, `docs/plans/scientific-build-
triage.md`): **the army and the Opus.** Two optional fields join the state:
`Unit.unsupplied` and `GameState.closedBook`. The rules that change:

  · nine Scientific Orders come live: The Field Refits, The Strategikon,
    The Armoury Patterns, The Model Army, The Great Instrument, The
    Foundation Stone, The Closed Book, The Breaching Batteries and The
    Prototype Works; and one shared Order, The Soldier-Scholars (Dominion
    and Scientific);
  · an upgrade from research may heal the piece fully (`upgradeHeals`), or
    go past the strategic resource gate for a piece on the board
    (`upgradeIgnoresResource`). A piece upgraded that way holds no copy
    (`Unit.unsupplied`), and the copies ledger skips it;
  · a unit filter may ask for the owner's newest age (`newestAge`), and
    `unitMatches` takes the owner's age;
  · two strength conditions: `nearLearning` (your great people of named
    families, or a named work in your borders, within some hexes) and
    `standingInOwnTown` (the piece stands in its own empire's town, in
    attack and in defence);
  · a siege blow on a town raising the Magnum Opus may remove a share of
    the production banked toward it (`opusBreach`);
  · the Opus may open early to one empire (`opusEarly`), and then waits for
    that empire to know the technology before it may finish;
  · completing the Opus's technology first may close the Opus to the other
    empires for some turns (`closedBook`, `GameState.closedBook`);
  · a commission may pay production toward the Opus by a share of its cost
    (`opusCost`, `toOpus`), and a row may refuse to be dealt to a seat that
    knows a technology (`notDealtKnowing`);
  · the rows of the current research may be built at a premium
    (`prototypes`), a labelled cost line; a queued row whose research moved
    on, or whose opening card left, waits for its technology before it may
    finish, and stays legal in its town's queue.

**A v165 save is refused and does not replay.** A Scientific seat's pools
now hold nine more cards, and a Dominion or Scientific seat's one more, so
their hands differ. The branch migrates nothing, for the reason given under
v119.

v167 (branch `decks`; Expansionist batches E9 and E10, `docs/plans/
expansionist-themes-triage.md`): **the land (marks, ages and tended
fields), and the militia and the trades.** The two batches were built as
165 and 166 on their own branch and merged after S9 together, so they
share one number. No field joins the state, but `Tile.marks` may now hold
three more ids (`burned`, `marl`, `marlSecond`).

The rules that change in E9 (the land: marks, ages and tended fields):

  · The Burning Season: a worker may burn a grassland or plains hex that
    holds an improvement. The improvement stays and the hex is marked
    `burned` (+1 food while improved). A hex is burned once;
  · The Marl Pits (a new Tier I Order): finishing a mine or quarry marks
    each farm or pasture beside it, inside your borders, with marl (+1
    food), and a second time with a second marl, at most;
  · Commission: Break the Sod now leaves an institution: your works count
    as ten turns older for your cards. The timed food and the worker go;
  · The Two Harvests is built and dealt: your farms, mines and lumber
    mills also count as tended land for your cards, the Six Gardens goal
    included;
  · The Mountain Schools: towns with at least two mountains in their
    borders gain +15% science.

The rules that change in E10 (the militia and the trades):

  · Veteran Colonies: a military unit retired in one of your towns gives
    that town one citizen, in place of food equal to its cost. A unit raised
    for free gives nothing. The citizen comes with no growth riders and
    counts toward the town's largest size (a `citizens` grant on the
    disband moment);
  · Watch and Ward (a new Tier II Order): units a levy raised gain +5
    strength in your own territory, attacking and defending (`levied` on
    `combatLine`);
  · The Burghers (a new Tier II Order): towns of twelve citizens or more
    fill their guild bar half again as fast (the `guildInflow` rule, one
    line of `explainGuildInflow`).

**A v166 save is refused and does not replay.** An Expansionist seat's
pools hold four more cards, a worker's build can do a new thing, and a
retired soldier now pays a citizen, so its hands, its land and its towns
differ. The branch migrates nothing, for the reason given under v119.

v168 (branch `decks`; Expansionist batches E11 and E12, `docs/plans/
expansionist-themes-triage.md`): **public works, empire buildings and The
Cura Aquarum.** The two batches were built as 167 and 168 on their own
branch and merged together after S11, S12 and S13, so they share one
number. No field joins the state.

The rules that change in E11 (public works and empire buildings). Six
building rows carry a new marker, `publicWork` (the Granary, Aqueduct,
Watermill, Harbour, Public Bath and Cistern):

  · The Aediles (a new Tier I Order): +2 production in the capital and +2
    culture, and +1 of each for every public work finished while it is
    seated (the `publicWorkCompleted` tally, written in `realiseItem`);
  · The Public Good (a new Tier IV Order): +1% science and culture for each
    public work you hold, at most +25% (the `publicWorks` count);
  · The Topping Out: finishing an empire building, in place of a wonder,
    grants each of your towns production equal to five times its own
    population (Scientific batch S6's per-town grant), in place of twenty
    times the finishing town's.

The rule that changes in E12 (The Cura Aquarum). A new city rule,
`holdsBuilding`, says that the towns its scope admits hold its building:

  · The Cura Aquarum (a new Tier III Order): every town joined to the
    capital by road counts as having an Aqueduct. The town gains what an
    Aqueduct does (its growth, its water) and counts as having one for every
    card that asks. It does not count for what was built: score, upkeep,
    triumphs, wagers, buying, the build list or finishing one.

The one reading of what a town holds is `townBuildings`
(`statecraft/evaluator.ts`). With no such card seated it is the town's own
list, so a game with no seat holding the card plays as it did.

**A v167 save is refused and does not replay.** An Expansionist seat's
pools hold three more cards, and The Topping Out pays different towns for
a different building, so its hands and its towns differ. The branch
migrates nothing, for the reason given under v119.

v169 (branch `decks`; Commerce batch T1, `docs/plans/commerce-themes-
triage.md`): **the Commerce sheet of record.** No field joins the state.
The rules that change:

  · the deck is sorted: every Commerce row that `docs/decks/commerce.md`
    lists carries a type, so it fits only a chair of that type or a
    Wildcard chair. Four shared rows gain a type too (Pilgrim Markets, The
    Tithe, Travelling Players and The Cosmopolitan Court);
  · eleven rows are retired: Coastal Estates, Bought Swords, Frontier
    Investment, Ore Caravans, Venture Routes, The Caravanserai Network,
    Patrons Abroad and The Merchant Dynasties (all live), and The
    Consulate, The Post Riders and The Embargo (all deferred);
  · four rows move from the Commerce file to the shared file, with their
    ids, texts and tiers: The Merchant Shrines, The Waqf and The Silk Road
    Monks (shared with Devotion) and The Brokers' Redraw (shared with
    Magisterial);
  · fifteen cards change in place. Private Patronage pays +40% gold. The
    Market Writ, The Factors' Houses and Caravanserai Cities lose their
    gold percentage. The Carters' Guild becomes +25% production toward
    buildings in towns a domestic trade route reaches. Corner the Market
    leaves an institution: +2 happiness for each luxury held twice or more.
    The Customs Houses pays science and culture for each customs house in a
    town's borders. Established Routes asks for twenty turns. The
    Strongroom asks for 1,500 gold. Bought and Paid For pays a percentage
    for each building bought with gold. Money at Work pays every town
    science for its treasury. Six cards change tier;
  · the shared The Escorted Roads, Pilgrim Markets, The Grain Exchange and
    Travelling Players move to Tier II, and The Exchange of Discoveries to
    Tier I;
  · the deferred The Return Leg, Export Guilds and The Treaty Ports take
    their new text, tier and rarity, and stay out of every pool.

**A v168 save is refused and does not replay.** A Commerce seat's pools and
chairs hold different cards, and so do the pools of a seat whose deck
shares a moved card. The branch migrates nothing, for the reason given
under v119.

v170 (branch `decks`; Commerce batch T2, `docs/plans/commerce-themes-
triage.md`): **the new Commerce cards that need no new shape.** No field
joins the state. The rules that change:

  · eight Commerce cards are new and dealt: Market Day and The Emporia
    (Tier 0), The Grain Banks and The Market Halls (Tier I), Names in
    Stone, The Hanse and Bills of Exchange (Tier II), and The Grain Barges
    (Tier IV);
  · the shared Merchant Scholars (Commerce and Scientific) moves from Tier I
    to Tier III. Its foreign routes now gain +2 science for each Academy in
    the origin city, in place of +5 science from a city with a Library.

**A v169 save is refused and does not replay.** A Commerce seat's pools
hold eight more cards, and a Commerce or Scientific seat is dealt Merchant
Scholars at a different tier. The branch migrates nothing, for the reason
given under v119.

v171 (branch `decks`; Commerce batch T7, `docs/plans/commerce-themes-
triage.md`): **the pair cards.** No field joins the state. The rules that
change:

  · a new windfall moment, `cardDrafted`, is paid each time a card enters
    an empire's collection from an Order draft, a charter included. A pass,
    a Doctrine and a belief do not count;
  · the shared The Art Dealers (Commerce and Magisterial, Tier I, common) is
    new and dealt: each card you draft grants 15 gold;
  · The Standing Army moves from the Dominion file to the shared file,
    shared by Dominion and Commerce, with its id, text, tier and type.

**A v170 save is refused and does not replay.** A Commerce or Magisterial
seat's pools hold a new card, a Commerce seat's pools hold The Standing
Army, and the order of the rows in a Dominion seat's pools changes. The
branch migrates nothing, for the reason given under v119.

v172 (branch `decks`; Commerce batch T3, `docs/plans/commerce-themes-
triage.md`): **routes and posts.** No field joins the state. The rules that
change:

  · a new windfall moment, `postEstablished`, is paid once for each trading
    post of an empire that becomes established, at home or abroad, with the
    post's town and its citizens. A sweep in the `roadJoinings` phase pays
    it; it writes nothing, so a game where no card pays the moment is
    unchanged;
  · a new rule, `homeRoutesPayOrigin`, makes a domestic route pay its origin
    a copy of what it pays its destination, at step 6 of the town's fold;
  · the rule `postsWaiveSeaRouteRange` is renamed `postsWaiveRouteRange`,
    and it now waives the range of any route, by land or sea, whose
    destination holds the sender's paying post;
  · two new counts (the citizens of the foreign towns holding your paying
    post, and every live route in the world), `population` narrowed by a
    town scope, and a periodic boon that passes that scope to its count;
  · The Fondaci, The Champagne Fairs and The Lingua Franca are new Commerce
    cards; The Return Leg is dealt; The Foreign Factor and The Admiralty of
    Trade (now uncommon) take their new text.

**A v171 save is refused and does not replay.** A Commerce seat's pools
hold four more cards, The Admiralty of Trade is drawn at a different
rarity, and a seat holding The Foreign Factor or The Admiralty of Trade is
paid and gated differently. The branch migrates nothing, for the reason
given under v119.

v173 (branch `decks`; Commerce batch T4, `docs/plans/commerce-themes-
triage.md`): **the trade commissions.** No field joins the state. The rules
that change:

  · two new commission figures: your towns that the goal's town scope
    admits (`citiesAdmitted`, with the scope on the goal as `admits`), and
    the other empires your trade routes reach (`tradePartnerEmpires`);
  · a new commission reward, `postsInPartnerCapitals`, writes your trading
    post in the capital of each empire your routes reach, dated a full
    route term back so it is established at once. It goes through a third
    writer of `City.posts`, `writeEstablishedPost` (`trade.ts`), which pays
    the moment a post is established once for each post it writes;
  · Commission: The Great Fair is a new Commerce card (four towns that a
    domestic route arrives at; two more trade routes for the rest of the
    game). The World's Fair takes its new goal (routes to four other
    empires) and reward (the posts), and loses its timed bonus.

**A v172 save is refused and does not replay.** A Commerce seat's pools
hold one more card, and a seat holding The World's Fair is paid
differently. The branch migrates nothing, for the reason given under v119.

v174 (branch `decks`; Commerce batch T5, `docs/plans/commerce-themes-
triage.md`): **goods and deals.** No field joins the state. The rules that
change:

  · two new counts read the deal register: the luxury copies an empire
    lends in its live deals (`copiesLent`), and the empires it holds a live
    deal with (`dealPartners`);
  · a new amplifier target, `lentLuxuryCopies`, keeps a share of each lent
    copy for its lender. The luxury counts and Corner the Market's figure
    add the share of the lent copies, rounded down, and a kind held only
    through lent copies pays at the share. The deal gate does not change;
  · a new behaviour rule, `postsLendLuxuries`: each foreign town holding
    the empire's paying post lends it one luxury, after the routes'
    loans, at the Silk Road's share;
  · an amplifier row may carry `yieldsOnly`, which narrows the
    `luxuryDuplicates` share to a luxury's flat yields;
  · the `tilePurchase` moment carries the price and the hex, a windfall
    rider may ask a tile test of the hex (`on`), and a scaled grant may be
    rounded down (`whole`);
  · Export Guilds and The Treaty Ports leave `deferred`; The Commenda, The
    Capitulations and The Casa da Índia are new Commerce cards; Land
    Speculation pays culture for a hex with a resource on it, in place of
    its gold and its unhappy capital.

**A v173 save is refused and does not replay.** A Commerce seat's pools
hold five more cards, and a seat holding Land Speculation is paid
differently. The branch migrates nothing, for the reason given under v119.

v175 (branch `decks`; Commerce batch T6, `docs/plans/commerce-themes-
triage.md`): **the purse and the hoard.** No field joins the state; an
existing field, `Unit.timed`, gains a new writer. The rules that change:

  · a new action rule, `buysOnCredit`, with a `credit` figure on the row:
    purchases with gold (buildings, units, caravans, hexes and great-person
    drafts) may take the treasury down to minus the credit, and the
    creditors take no unit until the treasury falls below the same floor.
    The gold gates ask one helper, `spendableGold`, and so does the Trade
    screen. Gold poured into a wonder or the Opus and a gold reroll keep
    their own checks;
  · a new tally occasion, `treasuryHeld`, raised once a turn for every real
    empire after the yields bank, with the treasury as its fact. A `tally`
    row may carry `minTreasury`, the least treasury a turn must end with to
    be counted;
  · a route rider may carry `family`, which narrows its `guildsmen` count
    to one trade;
  · a unit stamp may carry `timed`: effects hung on the unit at its birth
    for a number of turns, written to `Unit.timed` by `createUnit`. A hung
    upkeep waiver is a give-back line in the upkeep fold, and no other
    rebate or surcharge reaches the waived unit;
  · Letters of Credit, The Strongbox and The Merchant Guilds are new
    Commerce cards, and the shared Mercenary Contracts leaves `deferred`
    with its new text (a military unit you buy costs no upkeep for twenty
    turns).

**A v174 save is refused and does not replay.** A Commerce seat's pools
hold three more cards, and a Commerce or Dominion seat may be dealt
Mercenary Contracts. The branch migrates nothing, for the reason given
under v119.

v176 (branch `decks`; Devotion batch DV1, `docs/plans/devotion-themes-
triage.md`): **the Devotion sheet of record.** No field joins the state.
The rules that change:

  · the deck is sorted: every Devotion row that `docs/decks/devotion.md`
    lists carries a type, so it fits only a chair of that type or a
    Wildcard chair. Two shared rows gain a type too (Sacred Commissions and
    Sacred Patronage);
  · four rows are retired: Pastoral Shrines, The Consolation and The Alms
    Roads (all live), and Consecrated Ground (deferred);
  · seven rows move to the shared file, with their ids, texts and tiers:
    The Holy Spring and The Ambarvalia (shared with Expansionist; The
    Ambarvalia comes from the Expansionist file), The Priest-Astronomers
    and The Monastic University (shared with Scientific), and The Painted
    Chapels, The Festival Calendar and The Penitents' Roll (shared with
    Magisterial);
  · five cards change in place. Lay Offerings pays on pastures too. The
    Settled Faith pays +15% science and culture in devout towns, and loses
    its happiness and its rite. The Mission pays 300 culture and The
    Conversion of Kings 500. The Great Commission leaves an institution
    (+3 faith and +3 culture in devout towns) in place of its faith and its
    thirty turns;
  · six cards change tier: The Second Prophet, The Living Hymnal, The
    Mission and Sacred Commissions move to Tier II, and The Conversion of
    Kings and The Pious Masons to Tier III;
  · the deferred The Interdict takes its new text, and stays out of every
    pool.

**A v175 save is refused and does not replay.** A Devotion seat's pools
and chairs hold different cards, and an Expansionist, Scientific or
Magisterial seat may now be dealt the moved cards. The branch migrates
nothing, for the reason given under v119.

v177 (branch `decks`; Magisterial batch MG1, `docs/plans/magisterial-
themes-triage.md`): **the Magisterial sheet of record.** MG1 ran beside
Devotion batch DV1 (v176), and the two merged. No field joins the state.
The rules that change:

  · the deck is sorted: every Magisterial row that `docs/decks/magisterial.md`
    lists carries a type, so it fits only a chair of that type or a
    Wildcard chair. Two shared rows gain a type too: Sacred Commissions
    (Economic) and Sacred Patronage (Civic);
  · 64 rows are retired: 50 live and 12 deferred Magisterial rows (the cards
    the old sheet cut on 2026-10-06, and The Performers' Treasury), and the
    shared The Imperial Examinations (live) and Triumphal Arches (deferred);
  · four cards change in place. Civic Granaries pays +1 food and +1
    production for a Monument. The Honoured Dead moves to Tier II and pays
    +2 science and +4 production for each great person spent while it is
    seated, at most fifteen times. The Living Canon pays +4% food and
    production for each family, at most five, in every town. The Masters'
    Domain pays +3 food and +3 production on a great-person work and loses
    its gold percentage;
  · the deferred The Golden Age, The Magister's Court and The Last
    Commission take their new text and tier, and stay out of every pool.

**A save of v176 or earlier is refused and does not replay.** A
Magisterial seat's pools and chairs hold different cards, and so do the
pools of a Dominion seat. The branch migrates nothing, for the reason given
under v119.

v178 (branch `decks`; Devotion batch DV2, `docs/plans/devotion-themes-
triage.md`): **the new data-only Devotion cards, the word "devout" and the
shared Scientific rows.** No field joins the state. The rules that change:

  · seven Devotion cards are new and dealt: The Deaconries, The Lives of
    the Saints and The Martyrology (Tier II), The Consecration Feast, The
    Pilgrim Towns and The Holy Summons (Tier III), and The Work of God
    (Tier IV);
  · four shared cards are dealt: The Shrine Guards (new, with Dominion),
    The Blessed Forges and The Schoolmen's Charter (new, with Scientific),
    and The Monastery Libraries, which leaves `deferred` with its new text;
  · a new charter technology, Scholasticism (`scholasticism`), which only
    a seat holding The Schoolmen's Charter may research. Knowing it opens
    the Cathedral and the Apostle before Theology, so both rows carry
    `unlockedByCard`. A unit that only a purchase brings (the Apostle) may
    be bought before its technology when a card has opened it early;
  · the describers print a town that follows a religion its owner is paid
    by as "devout". Only the printed words change.

**A v177 save is refused and does not replay.** A Devotion, Dominion or
Scientific seat's pools hold more cards, and the technology list is longer.
The branch migrates nothing, for the reason given under v119.

v179 (branch `decks`; Magisterial batch MG2, `docs/plans/magisterial-
themes-triage.md`): **the data-only Magisterial cards of Tiers 0 and I.**
No field joins the state. The rules that change:

  · six Tier 0 cards are new and dealt: The Prytaneion, The Polemarch, The
    Court Painter, The Cornerstone, The Repertory and The Second Reading;
  · eight Tier I cards are new and dealt: The Nomarchs, The Workshop at
    Olympia, The Overseers of Works, The Siting Masters, The Keepers of
    Wonders, The Ceremonial Guard, The Unveiling and The Encyclopedia;
  · The Court Painter is the first row to ride the moment a card is
    drafted since batch R1 changed The Art Dealers;
  · two describer sentences change their words only. The reroll rule
    says "the first reroll of each hand", which Ibn Battuta's Rihla prints
    too, and a grant that goes to the capital names the capital before
    the age.

**A v178 save is refused and does not replay.** A Magisterial seat's pools
hold more cards. The branch migrates nothing, for the reason given under
v119.

v180 (branch `decks`; Devotion batch DV3, `docs/plans/devotion-themes-
triage.md`): **the engine's shapes.** One field joins the state:
`Player.faithSpent`, the faith an empire has spent this game, raised by
the new `spendFaith` wherever faith leaves the bank. The rules that change:

  · four Devotion cards are new and dealt: The Gifts of the Faithful (Tier
    0), The Sacred Precincts (Tier I), The Book of Life (Tier II) and The
    Offering Chests (Tier III). The shared The Rising Nave (with
    Magisterial, Tier III) is new and dealt too;
  · The Creed counts the gods an empire holds before it founds a religion:
    the `beliefsHeld` count is the empire's own gods, and the follower and
    enhancer beliefs of the religions it is paid by;
  · two counts are new: `faithSpent`, and `frontRowTenths` (how far a
    town's current build has come, in tenths);
  · four fields are new: `buildingCategory` on a rule (faith buys only one
    category of building), `currency` on a purchase rider (the rider
    reaches only one bank), `category` on a counted city stat, and
    `building` on the town scope `queueHolds`.

**A v179 save is refused and does not replay.** A Devotion or Magisterial
seat's pools hold more cards, and The Creed pays a different figure. The
branch migrates nothing, for the reason given under v119.

v181 (branch `decks`; Magisterial batch MG3, `docs/plans/magisterial-
themes-triage.md`): **the data-only Magisterial cards of Tiers II to IV.**
No field joins the state. The rules that change:

  · six Tier II cards are new and dealt: The Prefects, The Symposium,
    Letters Patent, The Quarter of Masters, The Gazetteers and The Seven
    Sights. The Quarter of Masters has a new id,
    `magisterialTheQuarterOfMasters`, because the retired Expansionist row
    of that name keeps `theQuarterOfMasters` (the triage's reading 45);
  · three Tier III cards are new and dealt: The Boule, The Roll of Masters
    and The Garden Courts;
  · two Tier IV cards are new and dealt: The Privy Council and The Bulwark
    of Marvels;
  · The Golden Age (Tier II) and The Magister's Court (Tier IV) leave
    `deferred` and are dealt;
  · one field is new: `within: 'empire'` on a counted city stat, so a
    town's defence can count every wonder the empire holds, not only the
    wonders in that town (The Bulwark of Marvels). A row without it counts
    in the town, as every row before it did.

**A v180 save is refused and does not replay.** A Magisterial seat's pools
hold more cards. The branch migrates nothing, for the reason given under
v119.

v182 (branch `decks`; Devotion batch DV4, `docs/plans/devotion-themes-
triage.md`): **rites are seasons.** No field joins the state. The rules
that change:

  · a rite started is a season (the triage's reading 9). The `riteStarted`
    tally and the `rite` occasion are raised for a rite with no `atOnce`
    alone, so the Votive Offering and the Restoring of the Host raise
    neither. A prophet's rite over the realm raises both once in each town
    it reaches, in `state.cities` order. The Founding Vows counts these
    seasons only;
  · the `rite` occasion carries the town it started in and that town's
    citizens (`townId`, `population`);
  · one effect kind is new: `productionToCulture`, the second line of step
    14 of a town's yields (`explainProductionMoved`). While a town keeps a
    rite that carries it, all of the town's production for the turn becomes
    culture, and the basket gains none of it;
  · one rite is new: the Rite of the Sabbath (`riteOfTheSabbath`), which
    carries that kind;
  · three Devotion cards are new and dealt: The Rogations (Tier 0), the
    charter The Sabbath Laws (Tier II), which opens the Rite of the
    Sabbath, and The Psalter (Tier III).

**A v181 save is refused and does not replay.** A Devotion seat's pools
hold more cards, and The Founding Vows counts different rites. The branch
migrates nothing, for the reason given under v119.

v183 (branch `decks`; Magisterial batch MG4, `docs/plans/magisterial-
themes-triage.md`): **the collection and the wonder commissions.** No
field joins the state. The rules that change:

  · two counts are new: `ordersHeld`, every Order in the collection, seated
    or not (the triage's reading 7), and `decksHeld`, the different decks
    among those Orders, where a card two decks share counts for both and
    the cards of no deck count as one more (reading 8). A `pays` row may
    carry `seated` to make `decksHeld` count the seated cards alone;
  · one commission figure is new: `ordersHeld`, read through the same walk
    as the count;
  · two tally occasions are new: `wonderCompleted`, written in
    `claimWonderFor` for the town's owner when it completes a world wonder
    (readings 3 and 4), and `wonderProduction`, written in `collectYields`
    with the production a town puts into a front-row world wonder or the
    Magnum Opus (reading 35);
  · five Magisterial cards are new and dealt: Commission: The Eighth Wonder
    (Tier 0), Commission: The Roll of the Senate (Tier I), Commission: The
    Wonder of the Age (Tier III), The Universal Library and The Polymath's
    Study (Tier IV);
  · the shared Travelling Players pays +2 culture on each foreign route
    from a town with a Monument for each different deck among the seated
    cards, where it paid +2 once (reading 46).

**A v182 save is refused and does not replay.** A Magisterial seat's pools
hold more cards, and Travelling Players pays a different amount. The branch
migrates nothing, for the reason given under v119.

v184 (branch `decks`; Devotion batch DV5, `docs/plans/devotion-themes-
triage.md`): **the faith's reach.** No field joins the state. The rules
that change:

  · the `found` occasion carries the citizens the new town is founded
    with (`population`), and a windfall grant's `pressure` may be scaled
    by the moment's measure (`fromOccasion`), as a yield or renown grant
    may;
  · `foundCityAt` hands `payWindfallGrants` a presser, so a lump paid on
    the founding presses each religion the founder is paid by through
    `pressLump`, which now has three callers (the triage's reading 21);
  · one behaviour rule is new: `followersShareSight`. Under it every town
    of another empire that follows a religion this empire is paid by is
    a sight source for it, at the base city sight (reading 22);
  · one goal field is new: `every` on a `citiesAdmitted` goal, which
    counts the admitted towns only while every town the empire holds is
    admitted (reading 23);
  · three Devotion cards are new and dealt, all at Tier II: The Parishes,
    Commission: The State Church and The Confessors.

**A v183 save is refused and does not replay.** A Devotion seat's pools
hold more cards. The branch migrates nothing, for the reason given under
v119.

v185 (branch `decks`; Magisterial batch MG5, `docs/plans/magisterial-
themes-triage.md`): **the draft's price.** One field joins the state:
`OrderOffer.price`, the culture the seat paid for the Order hand on the
table. The rules that change:

  · `settleDraft` writes the price on the hand it deals, a reroll keeps the
    price of the hand it replaces, and a free hand carries none (the
    triage's reading 11);
  · the `cardDrafted` and `draftPassed` occasions carry the price as a fact
    (`handPrice`), read before the pick or the pass removes the hand, and a
    grant may be scaled by it (the `handPrice` measure);
  · one rule is new: `draftCost`, a percentage on the price of an Order
    hand, read in one place (`draftCostFor`). `nextDraftCost`, `planDraft`
    and `draftSettledBy` take the state, and every screen and bot that
    prints or plans the next price reads the discounted figure (reading
    12);
  · three Magisterial cards are new and dealt: The Open Door (Tier I), and
    The Accessions Register and The Unwritten Chapter (Tier II).

**A v184 save is refused and does not replay.** A Magisterial seat's pools
hold more cards, and a hand on the table carries a field the old build
never wrote. The branch migrates nothing, for the reason given under v119.

v186 (branch `decks`; Devotion batch DV6, `docs/plans/devotion-themes-
triage.md`): **a conversion as a moment** (feature F). One field joins the
state: `City.convertedOn`, the last turn the town turned to each religion
as a foreign town. The rules that change:

  · one windfall moment is new, `townConverted`. It is paid to the empire
    a religion pays when a town it does not hold turns its majority to
    that religion, with the town (`townId`), its citizens (`population`),
    and `firsts` with `conversion` the first time the town turns to that
    empire's faith (the triage's reading 3);
  · the moment is queued where the town turns and paid when the pressing
    that turned it ends: after the tide's sweep, or at the end of a lump
    (`drainConversions`). A lump paid at a moment can turn more towns,
    which join the end of the queue. A town queues the moment at most once
    a turn for each religion (`City.convertedOn`), so a chain always ends
    (reading 4);
  · `pressLump` has a fourth caller, the presser `drainConversions` hands
    `payWindfallGrants`, and a proclamation's report says where each town
    stands after the moments are paid;
  · two Devotion cards are new and dealt, both at Tier III: Pentecost and
    The Mass Baptisms (readings 25 and 26).

**A v185 save is refused and does not replay.** A Devotion seat's pools
hold more cards, and a town that turned carries a field the old build never
wrote. The branch migrates nothing, for the reason given under v119.

v187 (branch `decks`; Magisterial batch MG6, `docs/plans/magisterial-
themes-triage.md`): **the hand.** No field joins the state. The rules that
change:

  · one action rule is new: `noOrderReroll`. `rerollError` refuses the
    reroll of an Order hand while the empire holds it. A Doctrine hand, a
    great-person hand and a belief hand are not refused (the triage's
    reading 13);
  · an `offerRider` may carry `count`, `per` and `max`, as a `routeRider`
    does. `explainOfferSize` reads them through `countOf` and `helpings`,
    one line labelled with the helpings, and the cap on a hand still holds
    (reading 13);
  · `OrderDef.onDraft` takes the `greatPerson` arm of `CompletionGrant`
    beside the unit arm. `raiseOnDraft` pays it through
    `grantGreatPersonOffer`: an offer when the seat may call great people
    and none waits, and otherwise the renown still needed for the next one
    (reading 15);
  · three Magisterial cards are new and dealt: The Wandering Muse (Tier I),
    Officials by Merit (Tier III) and The Hall of Wonders (Tier IV).

**A v186 save is refused and does not replay.** A Magisterial seat's pools
hold more cards. The branch migrates nothing, for the reason given under
v119.

v188 (branch `decks`; Devotion batch DV7, `docs/plans/devotion-themes-
triage.md`): **the holy sites, the Opus and the authority capstone.** No
field joins the state. The rules that change:

  · `chargeCostOf` takes the empire, and one action rule is new:
    `chargePrice`, which sets the price of one act of the clergy in
    charges (`CardRuleEffect.verb` and `value`). Every reader of a price
    asks it of the empire: the refusal (`agentProblem`), the spending
    (`spendCharge`), the words (`chargeCostWords`), the unit sheet and the
    city panel (the triage's reading 27);
  · one action rule is new: `apostlesPlantHolySites`. Under it an apostle
    may raise a further holy site, as a prophet does, for an empire that
    has founded a religion, at the planting price (reading 28);
  · one behaviour rule is new: `opusInterdict`, read by `explainOpusGate`
    after the siege. A rival's town that follows a religion the holder is
    paid by makes no production while it builds the Magnum Opus (reading
    29);
  · three Devotion cards are new and dealt: The Anchorites (Tier II), and
    The Caliphate and The Abbeys (Tier III). The Interdict (Tier IV) leaves
    `deferred` and is dealt.

**A v187 save is refused and does not replay.** A Devotion seat's pools
hold more cards. The branch migrates nothing, for the reason given under
v119.

v189 (branch `decks`; Magisterial batch MG7, `docs/plans/magisterial-
themes-triage.md`): **the council's moments.** No field joins the state.
The rules that change:

  · one windfall moment is new, `governmentAdopted` (feature G). It is
    paid in `adoptGovernmentAt` through `payOccasionRiders`, at the
    capital, after the council is re-seated and the Triumph is awarded,
    and before the Doctrine offer is drawn. So only a card in a chair of
    the new council pays (the triage's reading 17). The Triumph of the same
    name in `occasions.ts` is unchanged;
  · one count is new, `doctrinesHeld`: the Doctrines the empire holds, of
    any deck (reading 20);
  · one commission figure is new, `councilInOrder`: 1 when every Military,
    Economic and Civic chair holds a card that counts as the chair's type
    (`countedTypeOf`), a chair a malice holds left out (reading 18);
  · one commission reward is new, `doctrineOffer`. It opens a Doctrine
    offer of the current government's tier through `openDoctrineOffer`
    (`cities.ts`), the helper a building's `doctrineDraft` grant now calls
    too. While no such offer can open, the commission waits in its chair
    (`commissionRewardWaits`; reading 19 and question 3's recommended
    answer);
  · three Magisterial cards are new and dealt: The Sed Festival (Tier II),
    and The Pandects and Commission: The Golden Bull (Tier III).

**A v188 save is refused and does not replay.** A Magisterial seat's pools
hold more cards. The branch migrates nothing, for the reason given under
v119.

v190 (branch `decks`; Devotion batch DV8, `docs/plans/devotion-themes-
triage.md`): **the two largest rule-breakers.** One field joins the state:
`PlayerStatecraft.sidesTurned`, the last turn each card turned an enemy
soldier. The rules that change:

  · one behaviour rule is new: `faithfulKillsConvert`, read in
    `applyCombat` beside `barbarianKillsConvert`. The holder's attack that
    kills a land military unit of an empire it is at war with, on a land
    hex owned by a town that follows a religion the holder is paid by, and
    not in a town, hands the unit over through `captureUnit` at full
    health. It pays no kill or death riders and writes no kill or loss
    tallies, and the loser's war record counts it. At most once a turn for
    each card, by an absolute stamp (the triage's reading 30);
  · one action rule is new: `twoRites`. A town of an empire that holds it
    may keep two different rites (`ritePlacesFor`). The rite gate refuses
    a rite the town already keeps, or a town whose places are all taken. A
    prophet's rite over the realm takes a free place, or the place of the
    town's older rite (`ritesDisplacedBy`). The readers that ask whether a
    town keeps any rite are unchanged, so they do not pay twice (reading
    31);
  · two Devotion cards are new and dealt: The Turning of Swords (Tier III)
    and The Double Feast (Tier IV).

The rites a town keeps are still the rite entries of `City.timed`, so no
stored shape of a town changes. With one place a town's rites are placed
exactly as before.

**A v189 save is refused and does not replay.** A Devotion seat's pools
hold more cards, and a seat that turned a soldier carries a field the old
build never wrote. The branch migrates nothing, for the reason given under
v119.

v191 (branch `decks`; Magisterial batch MG8, `docs/plans/magisterial-
themes-triage.md`): **great people spent.** No field joins the state. The
rules that change:

  · one windfall moment is new, `greatPersonSpent`. It is paid in
    `spendGreatPerson` (`greatPeople.ts`), the one place a person is spent,
    through `payOccasionRiders`, at the capital, once for each person, by
    an act or a work. It comes after the legacy, the tally and the piece's
    removal, and it carries the work if one was laid (the triage's reading
    21);
  · one rider filter is new, `whileRaisingOpus`: the rider pays only while
    one of the empire's towns has the Magnum Opus at the front of its
    queue (`opusCityOf`), so a `toOpus` grant is never banked for later;
  · one meta rule is new, `legaciesCountTwice`. It is read at
    `liveEffects`' legacy source, off the effects already walked, and each
    legacy that is not revoked is pushed that many times (reading 22);
  · one commission figure is new, `workFamilies`: the families of the
    great-person works on hexes the empire owns (`workFamiliesHeld`,
    `commissions.ts`; reading 32);
  · two Magisterial cards are new and dealt, The Immortals (Tier IV) and
    Commission: The Patron's Gallery (Tier II), and two rows leave
    `deferred`: The Last Commission (Tier IV) and the shared Sacred
    Patronage (Tier III).

**A v190 save is refused and does not replay.** A Magisterial or Devotion
seat's pools hold more cards, and a great person spent now pays the cards
that ride the moment. The branch migrates nothing, for the reason given
under v119.

v192 (branch `decks`; Magisterial batch MG9, `docs/plans/magisterial-
themes-triage.md`): **works on the land, and the wonder towns.** No field
joins the state. The rules that change:

  · the work-laid moment (`improvementBuilt`, paid by `payWorkLaidRiders`)
    carries its hex when the row now stands on it, so a rider's tile test
    can ask what stands there. A burn that marks an improved hex names no
    hex;
  · one windfall grant is new, `claimBeside`: the unowned hexes beside the
    moment's hex join the empire's nearest town (`claimUnownedBeside`,
    `cities.ts`), which is re-seated and whose empire's map is redrawn.
    It is entry 32 of the register of mid-turn yield changes (the
    triage's reading 29);
  · one combat condition is new, `standingOnWork`: the piece stands on a
    great-person work, whoever owns it (reading 30);
  · one commission figure is new, `oneTownWorksWorked`, with a goal floor,
    `wondersAtLeast`: the most great-person works one town works among the
    towns holding that many wonders. `commissionGoalTown` names the first
    town in founding order that meets both (`worksTownFor`,
    `commissions.ts`; reading 33);
  · one action rule is new, `wonderHammersMoveOn`: in
    `refundBeatenWonders`, a town of the holder that lost a wonder race to
    a rival keeps its hammers toward its new front row in place of the
    gold, and settles through `settleProductionWindfall`. A refund that
    moved names the row (`WonderRefund.movedTo`) (reading 34);
  · four Magisterial cards are new and dealt: The Landmark Bounds (Tier
    I), The Custodians and The Envious Eye (Tier II) and Commission: The
    Ideal City (Tier IV).

**A v191 save is refused and does not replay.** A Magisterial seat's pools
hold more cards. The branch migrates nothing, for the reason given under
v119.

v193 (branch `decks`; Magisterial batch MG10, `docs/plans/magisterial-
themes-triage.md`): **the light capstones.** No field joins the state. The
rules that change:

  · one rider filter is new, `paidHand`: the rider pays only when the Order
    hand on the moment cost culture, read off the moment's `handPrice`
    fact. A free hand has no price, so passing it pays nothing (the
    triage's reading 16);
  · an amplifier's share of a card's hex line keeps the line's own
    multipliers (`hexMultipliers`): a line paid for each neighbour that
    passes a test, or for each peak beside the hex, is raised by the same
    count and cap. Before, the share was paid once on the hex (reading 26);
  · three Magisterial cards are new and dealt: The Grand Vizier (Tier II),
    the first live row of `slotPosition`, and The Divine Proportion and
    The Second Sitting (Tier III).

**A v192 save is refused and does not replay.** A Magisterial seat's pools
hold more cards. The branch migrates nothing, for the reason given under
v119.

v194 (branch `decks`; Magisterial batch MG11, `docs/plans/magisterial-
themes-triage.md`): **Magnificence.** No field joins the state. What
changes:

  · culture is a third bank of the purchase verb (`PurchaseCurrency`, now
    declared in this module). Under the new action rule
    `cultureBuysWonders`, a town may buy the world wonder at the front of
    its queue with culture from the draft pool, never the Magnum Opus. The
    price is one culture (`production.culturePerHammer`) for each hammer
    the wonder still needs, and the hammers already banked are used, not
    refunded (the triage's reading 36). `purchaseError` and
    `explainPurchaseCost` gate and price it, and `spendCulture` takes it;
  · `City.buildingBanks` may now record `culture` for a building bought
    with culture, so a count of bought buildings that names no bank counts
    it, and a count of buildings bought with gold does not;
  · one Magisterial card is new and dealt: Magnificence (Tier III).

**A v193 save is refused and does not replay.** A Magisterial seat's pools
hold more cards. The branch migrates nothing, for the reason given under
v119.

v195 (branch `decks`; Magisterial batch MG12, `docs/plans/magisterial-
themes-triage.md`): **The Mixed Constitution.** No field joins the state.
What changes:

  · one action rule is new, `cardsFitAnyChair`: while a card holding it
    sits in a chair, every card of its holder fits every chair. The fit is
    read in one place, `chairFitFor` (`statecraft/draft.ts`), which the slot
    refusal, the re-seating, the council screen, the bots and the card stamp
    ask; `orderFitsSlot` stays the plain rule (the triage's reading 24);
  · an adoption re-seats the council by the fit the old council granted,
    and the re-seating has a fifth pass that seats any card left in the
    first free chair that fit admits. Under the plain rule it seats nothing;
  · when the fit narrows (the card is unseated, a malice takes its chair, it
    finds no chair at an adoption, or a council shrinks under it), the
    council is re-seated at once by the plain rule (`settleCouncilFit`): a
    card that fits its chair keeps it and its seal, the rest move to free
    chairs that fit them with their seals lifted, and a card that fits none
    returns to the collection (question 2's recommended answer);
  · one Magisterial card is new and dealt: The Mixed Constitution (Tier
    III).

**A v194 save is refused and does not replay.** A Magisterial seat's pools
hold more cards. The branch migrates nothing, for the reason given under
v119.

v196 (branch `decks`; Magisterial batch MG13, `docs/plans/magisterial-
themes-triage.md`): **The Universal Genius.** One optional field joins the
state: `Unit.acted`, a great person that has acted and is still on the
board. The rules that change:

  · one action rule is new, `actThenWork`, read in `greatPersonActAt` when
    the person acts. While it holds, the act pays and its riders pay, and
    the person stays on the board, marked `Unit.acted`. The act does not
    use the person's movement (the triage's reading 23);
  · `greatPersonActError` refuses a person marked as having acted, so a
    person acts once. The work does not read the mark: a marked person
    lays its work, even after the card has left its chair, and the work
    spends it through `spendGreatPerson`. So the legacy, the
    `greatPersonSpent` tally and the `greatPersonSpent` moment come once,
    when the work is laid (reading 21). A person that lays its work first
    is spent as before;
  · one Magisterial card is new and dealt: The Universal Genius (Tier
    III).

The field is absent on every piece that has not acted under the rule, so
a game without the card writes the same units as before.

**A v195 save is refused and does not replay.** A Magisterial seat's pools
hold more cards, and a person that acted under the card carries a field
the old build never wrote. The branch migrates nothing, for the reason
given under v119.

v197 (branch `decks`; Magisterial batch MG14, `docs/plans/magisterial-
themes-triage.md`): **the boons.** No field joins the state. The rules
that change:

  · `OrderDef.onDraft` takes two new arms. `windfall` pays a yield once
    when the card is drafted, for each item a count finds: the card's
    windfall arms are composed into one payout (`onDraftPayout`) and paid
    through `payWindfallGrants` (the triage's reading 38). `foreignCard`
    hands over a random card from a deck the seat does not hold, drawn
    from `state.rng` rarity first with no pity (`drawForeignCard`); an
    empty bag draws nothing and uses no randomness (reading 37);
  · a grant's count may name the hexes a `tilesInBorders` count asks
    about (`GrantCount.tile`);
  · every way a card enters the collection ends in one tail,
    `settleCardTaken` (`cities.ts`): its on-draft grants, the law dropped
    for a charter, and the `cardDrafted` moment last. The pick of an
    Order hand and the granted card both go through it, so a granted
    card pays the draft moment with no hand price. The pick's own order
    is as before;
  · two Magisterial cards are new and dealt: The Cabinet of Curiosities
    (Tier III) and The Grand Retrospective (Tier IV).

**A v196 save is refused and does not replay.** A Magisterial seat's pools
hold more cards. The branch migrates nothing, for the reason given under
v119.

v198 (branch `decks`; Magisterial batch MG15, `docs/plans/magisterial-
themes-triage.md`): **arrangements on the hex grid.** No field joins the
state. The rules that change:

  · one tile test is new, `workLine`: the hex's great-person work stands
    on a straight line of at least `length` works, along one of the three
    hex axes, with no gap and every work of the line in the asking
    empire's borders. The lines are found once for the board, in tile
    index order, by `workLinesOf` (`statecraft/evaluator.ts`), remembered
    on the economy clock and handed to the test through `groundFactsFor`
    (`GroundFacts.workLine`). A work on two lines counts once (the
    triage's reading 39);
  · one commission figure is new, `worksBesideWork`: the most hexes
    beside one great-person work in the empire's borders that carry a
    great-person work or a tended work. `commissionGoalHex` names the
    first such work in map order that meets the goal (`gardenWorkFor`,
    `commissions.ts`; reading 41);
  · one commission reward is new, `claimWithin`: every unowned hex within
    that many hexes of the goal's work joins the empire's nearest town.
    It claims through `claimUnownedBeside` (`cities.ts`), the routine The
    Landmark Bounds' grant uses, which now takes a radius. The town is
    re-seated (entry 32 of the register of mid-turn yield changes) and
    the empire's map redrawn;
  · two Magisterial cards are new and dealt: Commission: The Paradise
    Garden (Tier III) and The Processional Way (Tier IV).

**A v197 save is refused and does not replay.** A Magisterial seat's pools
hold more cards. The branch migrates nothing, for the reason given under
v119.

v199 (branch `decks`; Magisterial batch MG16, `docs/plans/magisterial-
themes-triage.md`): **The Pull of the Masters.** No field joins the state.
The rules that change:

  · one action rule is new, `worksPullRivalHexes`. It is read in one
    place, `pullRivalHexesToWorks` (`cities.ts`), which `expandBorders`
    calls at the end of the borders phase, so the phase list keeps its
    length. Each holder in `realPlayers` order walks its great-person
    works in tile order, and each work takes the first hex beside it, in
    ring order, that a rival's town owns and does not work, that is not a
    town centre and carries no great-person work, and that lies within
    `cities.claimRadius` of the holder's nearest town. A hex moves at most
    once a sweep, so when two holders' works reach for the same hex, the
    first in that order takes it (the triage's reading 40);
  · one writer of a hex's town is new, `seizeTile` (`cities.ts`), beside
    `claimTile` and `takeTile`: it moves a hex from a rival's town and
    drops that town's pin there. After each take both towns are re-seated
    (entry 33 of the register of mid-turn yield changes) and both
    empires' sight is redrawn;
  · one Magisterial card is new and dealt: The Pull of the Masters (Tier
    IV). Its text now says "Each turn" in place of "At the start of each
    turn", because the hexes move at the end of the turn.

**A v198 save is refused and does not replay.** A Magisterial seat's pools
hold more cards. The branch migrates nothing, for the reason given under
v119.

v200 (branch `decks`; batch R2a, `docs/plans/devotion-review-2026-10-28.md`):
**two religion rules.** One optional field joins the state:
`Player.ritesStarted`, the rites this empire has started. The rules that
change:

  · a rite costs `rite.costBase` (20) plus `rite.costPerRiteStarted` (5)
    for each rite the empire has started, so 20, 25, 30 and on. The
    research age no longer sets the price, and `rite.costByAge` is gone.
    The count is raised where the `riteStarted` tally is paid, by one
    helper (`countRiteStarted`): once for a town's rite with no `atOnce`,
    and once for each town a prophet's rite reaches. `riteCostFor` stays
    the one reading;
  · a pantheon god is no longer one per world. `beliefPool` leaves out
    only the gods this empire holds, so two empires may hold the same
    god. Follower and enhancer beliefs keep their rules.

The field is absent until an empire's first rite starts, so a game in
which nobody starts a rite writes the same players as before.

**A v199 save is refused and does not replay.** Every rite is charged a
different price, and a god a rival holds can now be dealt, so a v199 log
replays into different banks and different hands. The branch migrates
nothing, for the reason given under v119.

v201 (branch `decks`; batch R2b, `docs/plans/devotion-review-2026-10-28.md`):
**a building's package.** No field joins the state. The rules that change:

  · a building's package is its row plus every line a card or a luxury puts
    on it in the town (`explainBuildingPackage`): a flat town line whose
    scope names it, the building's own flat line, a town line counted by
    its kind or its category inside the town, and a luxury's
    `buildingCategoryYields` helping. Every live source counts but a rite.
    Step 9's building shares are taken over the package, so a share now
    reaches the counted lines and the luxury helpings, and no longer reaches
    a rite's line;
  · a building supplies a voice when its category is that voice or its
    package pays it (`buildingSupplies`). The `hasBuildingYielding` scope
    reads this, so a faith building with no faith of its own now admits a
    town for faith;
  · a new count, `buildingsSupplying`: the buildings that supply the row's
    `voice`, in the town with `within: 'city'` or across the realm.

**A v200 save is refused and does not replay.** A town holding a building
share beside a counted line or a luxury helping on the same building banks
a different figure, so a v200 log replays into different banks. The branch
migrates nothing, for the reason given under v119.

v202 (branch `decks`; batch R2c, `docs/plans/devotion-review-2026-10-28.md`):
**the Devotion cards of the user's review.** No field joins the state. The
rules that change:

  · three Devotion cards are retired: The Old Gods Remain, The Sacred
    Precincts and The Monastic Builders;
  · four cards move from Tier 0 to Tier I: The Founding Vows, The
    Rogations, The Gifts of the Faithful and the shared The Shrine Guards;
  · three Devotion cards are new and dealt: The Tithe Barns and The Royal
    Cult (Tier 0), and The Temple Storehouses (Tier I);
  · Scholasticism, The Schoolmen's Charter's technology, no longer opens
    the Cathedral and the Apostle before Theology. Both rows lose their
    `unlockedByCard` marker. It opens a new religious building, the
    Cathedral School (`cathedralSchool`): +2 science for each building in
    its town that supplies faith (`buildingsSupplying`), and +2 more for
    each while the town keeps a rite.

**A v201 save is refused and does not replay.** A Devotion or Dominion
seat's Tier 0 and Tier I pools hold different cards, and a seat holding
the charter opens a different shelf. The branch migrates nothing, for the
reason given under v119.

v203 (branch `decks`; batch BR1, `docs/plans/barbarians-2026-10-28.md`):
**barbarian camps keep two guards and send raiders at the players.** No
field joins the state. The rules that change:

  · a new camp starts with one or two units, a roll on `state.rng` made
    right after the camp is placed (`rules.barbarians.campStartUnitsMin`
    and `campStartUnitsMax`). The first stands on the camp and digs in. The
    band does not move on the turn it appears;
  · each camp keeps `maxUnitsPerCamp` guards: the warden and a second guard
    (`barbarianRoles`, a new `guard` role, derived each turn). A guard stays
    within `campUnitRadius` of its camp;
  · every other soldier is a raider, and a raider with nothing to fight in
    reach marches on the nearest town of a real player it can walk to;
  · a camp with all its guards still musters, and the unit is a raider,
    while the world holds fewer than `raidersPerCamp` raiders for each camp.

**A v202 save is refused and does not replay.** A camp founded in a v202
log raises a band and draws one more number from the generator, so every
roll after the first camp moves. The branch migrates nothing, for the
reason given under v119.

v204 (branch `decks`; batch R2d, `docs/plans/devotion-review-2026-10-28.md`):
**"supplies" means one thing across the game.** No field joins the state
(a renown row may now carry `voice`, a data field). The rules that change:

  · a building's own counted lines join its package beside its own flat
    lines (the Cathedral School's science, the Bazaar's gold, the
    Mausoleum's gold, Angkor Wat's faith). A building share of step 9
    reaches them;
  · the `pays` selector of a building share asks `buildingSupplies`: every
    building of the voice's category, and every building whose package
    pays the voice. Before, the row alone answered. Aristotle and al-Jazarī
    reach more buildings;
  · the `scienceBuildings` count is retired. Maimonides, Āryabhaṭa, The
    Royal Tutors and The Common Tables count `buildingsSupplying` with the
    science voice, so a science building with no science of its own counts,
    and so does a building a card makes pay science;
  · al-Khwārizmī's faith purchase asks `buildingSupplies`, so a science
    building with no science on its row may be bought with faith.

**A v203 save is refused and does not replay.** A town holding one of these
cards beside a building that changed its answer banks a different figure,
so a v203 log replays into different banks. The branch migrates nothing,
for the reason given under v119.

v205 (branch `decks`; batch R3, `docs/plans/scientific-review-2026-10-28.md`):
**the Scientific cards of the user's review.** No field joins the state.
The rules that change:

  · The Scribes' Hall, The Long Study and The Sky Watchers move from Tier 0
    to Tier I;
  · The Prize Essay is retired;
  · three cards are new and dealt at Tier 0: The Kept Secret and The
    Curators of Works (Scientific), and The Mountain Observatories (shared
    by Expansionist and Scientific);
  · a new empire condition, `knowsUniqueTech`: the empire knows a
    technology no other real player knows, charter technologies left out
    (The Kept Secret's gate);
  · a town line counted by the public works in the town (`publicWorks`
    with `within: 'city'`) is in each public work's package, one helping on
    each, so a building share of step 9 reaches it.

**A v204 save is refused and does not replay.** A Scientific or
Expansionist seat's Tier 0 and Tier I pools hold different cards, so its
draws move. The branch migrates nothing, for the reason given under v119.

v206 (branch `decks`; batch DT1, `docs/plans/doctrines-build-triage.md`):
**Dominion's Doctrines after the user's review of 2026-11-05.** Two fields join
the state: `City.foundedTurn`, written in `createCity`, and
`PlayerStatecraft.doctrineTurns`, written in `settleDoctrineChoice`. The rules
that change:

  · The Steppe Confederacy, The Soldiers' Share, Centurions and The Universal
    Monarchy do what their new text says;
  · The Consular Roads moves to Tier II and The Strategoi to Tier III;
  · Weight of Numbers and Total Mobilisation are retired;
  · a new combat condition, `targetWounded`, a new town scope, `foundedSince`,
    and `rank` on `upkeepRebate`;
  · the founding preview reads the `cityCost` rows a town not yet founded can
    answer (`cardProspectCityCost`).

**A v205 save is refused and does not replay.** A Dominion seat's Doctrine
pools hold different cards, so its draws move. The branch migrates nothing, for
the reason given under v119.

v207 (branch `decks`; batch DT2, `docs/plans/doctrines-build-triage.md`):
**Expansionist's first Doctrines, the eleven that need no new shape.** No field
joins the state. The rules that change:

  · Bound to the Soil, The Gift of the River, The Commanderies, Synoecism, Crop
    Rotation, The Contented City, Empire Without End, The Physiocrats, The
    Cathedral Lodges, The High Towns and The Mandarinate are dealt;
  · an Expansionist seat now sees a Doctrine offer when it adopts a government
    of tier 4, 10, 18 or 26, and the offer blocks End Turn until it is answered.

**A v206 save is refused and does not replay.** An Expansionist seat's Doctrine
bags are no longer empty, so its draws move. The branch migrates nothing, for
the reason given under v119.

v208 (branch `decks`; batch DT3, `docs/plans/doctrines-build-triage.md`):
**Commerce's and Scientific's first Doctrines, the fifteen that need no new
shape.** No field joins the state. The rules that change:

  · The Apoikia, The Delian League, The Sogdian Colonies, The Year and a Day, The
    Turnpike Trusts, The Peace of Lodi and The Monte di Pietà are dealt to a
    Commerce seat;
  · The Pythagorean Brotherhood, The Removal to Xianyang, The Workshops of
    Syracuse, The Jixian Academy, The Academy of Gondishapur, The Pandidakterion,
    The Universitas and The Volley Fire are dealt to a Scientific seat;
  · a production bonus may leave out the rows that grant a bead (`skipsBeadRows`);
  · `buyRoute` now charges the price the purse check asks, which is the origin
    town's, so a rider on a caravan's price is really paid;
  · the bots price a hex line's `wholePercent` over what the hexes pay, so they
    score The Nizamiyya, Crop Rotation and The Cathedral Lodges differently.

**A v207 save is refused and does not replay.** These seats' Doctrine bags are no
longer empty, so their draws move. The branch migrates nothing, for the reason
given under v119.

v209 (branch `decks`; batch DT4, `docs/plans/doctrines-build-triage.md`):
**Magisterial's and Devotion's first Doctrines, the ten that need no new shape.**
No field joins the state. The rules that change:

  · The Choregia, The Periclean Works, The Magnaura, The Barmakids, The Bourgs,
    The Kitabkhana and The Escorial are dealt to a Magisterial seat;
  · The Theoric Fund, The Rites of Zhou and The Saint Peter's Indulgence are
    dealt to a Devotion seat.

**A v208 save is refused and does not replay.** These seats' Doctrine bags are no
longer empty, so their draws move. The branch migrates nothing, for the reason
given under v119.

v210 (branch `decks`; batch DT5, `docs/plans/doctrines-build-triage.md`):
**The gates on the Doctrine offer, and the six rows that need only them.** No
field joins the state. The rules that change:

  · a Doctrine row may carry `needsTendedWork` or `needsReligion`, and
    `doctrineBagFor` leaves it out while the seat fails the gate;
  · The Garden Peoples is dealt to an Expansionist seat with a tended-work
    charter;
  · The Patrimony of Peter, The Imarets, The Canons of the Holy Sepulchre, The
    Martyr's Crown and The Two Sanctuaries are dealt to a Devotion seat that
    holds a religion.

**A v209 save is refused and does not replay.** These seats' Doctrine bags change,
so their draws move. The branch migrates nothing, for the reason given under v119.

v211 (branch `decks`; batch DT6, `docs/plans/doctrines-build-triage.md`):
**Eleven Doctrines that each need one small new field or test.** No field joins
the state. The rules that change:

  · The Highland Clans, The Curator of Waters and All Roads Lead to Rome are dealt
    to an Expansionist seat;
  · The Laurion Leases and The Muda are dealt to a Commerce seat;
  · The Peripatetic School, The Directorate of Arms and The Külliye are dealt to a
    Scientific seat;
  · The Carroccio and The Gobelins are dealt to a Magisterial seat;
  · The Paean is dealt to a Devotion seat;
  · the card rules gain a tile test (`townCentre`), a town scope (`notConnected`),
    two combat scale counts (`wonders`, `beliefsHeld`), an empire condition
    (`noMetEmpireAhead`) and a behaviour rule (`foreignTradersUnplunderable`), and
    a production bonus, a rate, a renown share and a limit lift each gain a
    narrowing (`publicWork` and `tile`, `tile`, `of`, `skipsBeadRows`).

**A v210 save is refused and does not replay.** These seats' Doctrine bags change,
so their draws move. The branch migrates nothing, for the reason given under v119.

v212 (branch `decks`; batch DT7, `docs/plans/doctrines-build-triage.md`):
**Five Doctrines that refuse something.** No field joins the state. The rules
that change:

  · The Inward Roads is dealt to an Expansionist seat;
  · The Forbidden Silks, The Flying Money and The Sea Ban are dealt to a Commerce
    seat;
  · Canossa is dealt to a Devotion seat that holds a religion;
  · the card rules gain `noForeignRoutes` (`gateRoute`), `noLuxuryLending`
    (`dealSideError`), `buysOnlyInScope` (`clausesBeforeTheBank`) and
    `faithfulPeace` (`declareWarError`);
  · a route abroad under `noForeignRoutes` no longer renews, and `setAutoResend`
    refuses to turn its renewal on.

**A v211 save is refused and does not replay.** These seats' Doctrine bags change,
so their draws move. The branch migrates nothing, for the reason given under v119.

v213 (branch `decks`; batch DT8, `docs/plans/doctrines-build-triage.md`):
**Three Doctrines that change a price.** No field joins the state. The rules that
change:

  · The Opera del Duomo is dealt to a Commerce seat, The Court of Rudolf II to a
    Scientific seat and The Capitulary of Herstal to a Devotion seat;
  · the card rules gain `goldContribution` (`contributionRate`), `techPrice`
    (`explainTechCost`, through `cardTechPriceLines`) and `riteCost`
    (`riteCostAhead`).

**A v212 save is refused and does not replay.** These seats' Doctrine bags change,
so their draws move. The branch migrates nothing, for the reason given under v119.

v214 (branch `decks`; batch DT9, `docs/plans/doctrines-build-triage.md`):
**Four Doctrines on chairs and second readings.** No field joins the state. The
rules that change:

  · The Arthashastra, The Council of Ten and The Union of Lublin are dealt to a
    Magisterial seat, and The Serapeum to a Devotion seat;
  · taking a Doctrine now refits the council (`applyChooseDoctrine`), so a chair
    it opens is there at once;
  · `slotPosition` gains `whole` and the position -1. `buildLiveEffects` reads the
    card in that chair again, and `runPeriodicBoons` pays its boon again;
  · the meta rules gain `godsCountTwice` and `governmentsOfTier`, both read in
    `buildLiveEffects`.

**A v213 save is refused and does not replay.** These seats' Doctrine bags change,
so their draws move. The branch migrates nothing, for the reason given under v119.

v215 (branch `decks`; batch DT10, `docs/plans/doctrines-build-triage.md`):
**Two Doctrines that change what an Order hand deals.** No field joins the state.
`OrderOffer.positions` gains the kind `foreign`. The rules that change:

  · The Hospitium and The Jinshi are dealt to a Magisterial seat;
  · the card rules gain `thirdCardForeign` (`drawHandPositions`, which writes a
    `foreign` third position) and `rareWeight` (`cardRareWeight`, read by
    `drawOrderOffer`);
  · `rarityOdds` and the draws that read it take the rare rung's rise.

**A v214 save is refused and does not replay.** These seats' Doctrine bags change,
so their draws move. The branch migrates nothing, for the reason given under v119.

v216 (branch `decks`; batch DT11, `docs/plans/doctrines-build-triage.md`):
**Scutage.** No field joins the state. The rules that change:

  · Scutage is dealt to a Magisterial seat;
  · the card rules gain `collectionPays`, read by `buildLiveEffects`, which pushes
    a labelled copy of each flat or counted line an Order off its chair pays;
  · a `slotRider` may close chairs: `cardExtraChairs` no longer stops at nought,
    `chairCount` stops at the government's typed chairs, and `slotTypesOf` trims
    its layout to the council;
  · `refitSlots` returns a card to the collection when a malice moves into its
    chair.

**A v215 save is refused and does not replay.** These seats' Doctrine bags change,
so their draws move. The branch migrates nothing, for the reason given under v119.

v217 (branch `decks`; batch DT12, `docs/plans/doctrines-build-triage.md`):
**the land.** No field joins the state. The rules that change:

  · The Georgics, The Wildwood Compact, The Planted Towns and Arcadia are dealt to
    an Expansionist seat, the Compact and Arcadia only with a tended-work charter;
  · `workAge` may carry a `factor`, and `standingSince` compares
    `age * factor + bonus`;
  · the card rules gain `tendedWorksFree` (`workChargeCost`, read by the gate on a
    build and by its spending), `trainedSettlerCostsCitizen` (`realiseItem`) and
    `tendedCountsImproved` (`improved` and `unimproved`, through the ground facts);
  · `workedUnimprovedTiles` hands the tile test its ground facts;
  · the commission figure `improvedOnlyTilesWorked` counts tended works under
    Arcadia.

**A v216 save is refused and does not replay.** These seats' Doctrine bags change,
so their draws move. The branch migrates nothing, for the reason given under v119.

v218 (branch `decks`; batch DT13, `docs/plans/doctrines-build-triage.md`):
**town counts on a hex, and the census.** No field joins the state. The rules that
change:

  · The Hydraulic Empire, The Builder Kings and The Censors are dealt to an
    Expansionist seat;
  · `pays` gains the pair hex/count: `countedHexRows` asks the count of the town
    working the hex, and `hexRows` leaves such a row out for every other producer;
  · the count `censusesLed` reads `state.census.taken`, narrowed by
    `CardPaysEffect.sinceDoctrine`;
  · a grant of `citizens` with `toEveryTown` pays every town the field admits, so
    a census can pay it.

**A v217 save is refused and does not replay.** These seats' Doctrine bags change,
so their draws move. The branch migrates nothing, for the reason given under v119.

v219 (branch `decks`; batch DT14, `docs/plans/doctrines-build-triage.md`):
**a permanent strength.** No field joins the state. The rules that change:

  · The Nassau Reforms is dealt to a Scientific seat, and The Ribats to a Devotion
    seat that holds a religion;
  · `createUnit` gains `bornIn`, which `realiseItem` and `payGrants` pass, so a
    stamp scoped to a town reaches a unit raised beside that town. The live rows
    with such a stamp (the Tophane, the Terracotta Army, the War Hall, Naval Yards,
    The War Manuals, The Palace Schools and The Maritime Galleries) reach that unit
    now, and did not before;
  · the behaviour rule `upgradeStrength` adds to `Unit.stamp` in `upgradeUnits`;
  · a `pressure` grant may carry `majority`, which `pressLump` sizes to turn the
    town on the hex, past any Temple.

**A v218 save is refused and does not replay.** These seats' Doctrine bags change,
so their draws move. The branch migrates nothing, for the reason given under v119.

v220 (branch `decks`; batch DT15, `docs/plans/doctrines-build-triage.md`):
**the religion's limits.** No field joins the state. The rules that change:

  · The Seven Councils, The House of Worship and The Apostolic Camera are dealt to a
    Devotion seat that holds a religion;
  · `pantheonSlots` may name a `pool`, and `nextBeliefPool` reads the law of whoever
    holds the religion's holy city through `poolSlotsFor`;
  · a faith house may stand in a town a scoped `unlocksBuilding` row admits, as well
    as in a town whose beliefs open it;
  · the behaviour rule `followerBeliefsPayAbroad` adds lines at step 18 of
    `docs/yields.md`.

**A v219 save is refused and does not replay.** These seats' Doctrine bags change,
so their draws move. The branch migrates nothing, for the reason given under v119.

v221 (branch `decks`; batch DT16, `docs/plans/doctrines-build-triage.md`): **great
people.** One field joins the state: `Player.personDiscount`. The rules that change:

  · The Platonic Academy and The Peregrini are dealt;
  · the action rule `everyWorkIsAcademy` changes what `workOf` answers, so `workOf`
    takes the state;
  · the behaviour rule `workCheapensPerson` writes the discount in `greatPersonWorkAt`,
    `renownThreshold` applies it, and `settleGreatPersonChoice` deletes it. A work that
    brings the price within the pool opens the offer at once;
  · a work laid or lost re-seats the other towns on its ring while their owner's law
    pays a hex for the works beside it (`refreshRingDerived`, register entry 35).

**A v220 save is refused and does not replay.** These seats' Doctrine bags change,
so their draws move. The branch migrates nothing, for the reason given under v119.
