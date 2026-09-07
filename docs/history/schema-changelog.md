# The schema changelog — entries 3 through v78

Every bump of `SAVE_SCHEMA`/`SCHEMA_VERSION` from Milestone 3 to v78, moved out
of `src/sim/state.ts` when it had grown to 1443 lines of docblock (batch H4,
`docs/audit/dead-code.md` §2.2). The text is the original, verbatim; only the
comment prefix was stripped.

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
