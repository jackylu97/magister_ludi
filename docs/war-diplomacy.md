# War & Diplomacy — design worksheet

The last core system before playtest (ruled 2026-09-03). Vanilla Civ first.
Fill in the ▢ decisions; recommendations are marked (rec) and are yours to
overrule. What exists today: combat between empires is simply LEGAL (no war
state anywhere), capture works (three beats, courthouse, authority cost),
plunder/pillage/siege/ZoC all work, the bot defends but never attacks a real
player, the warmonger persona's aggression knob (brain v1, in flight) attacks
without any diplomatic frame. Barbarians are always hostile and stay so.

on the backburner: some kind of diplomacy meter that affects trade deals. Probably not needed for now.

## 1. The war state

- A symmetric pair relation in the save: `wars: {a, b, declaredTurn}[]` —
  derived readers (`atWar(state, a, b)`), one writer per verb. Public to all
  seats (everyone hears a declaration). *(settled unless you object)*
- ▢ Does ANYTHING persist about a finished war (history, grudges)? nope. cannot declare war within 10 turns of a peace deal.

## 2. Declaring war

- `declareWar { playerId, targetId }` — an ordinary command, announced to
  every seat. *(settled)*
- ▢ **Surprise war**: may you declare and attack in the same turn? yes
- ▢ Any cost or gate on declaring (authority, happiness hit, a casus-belli
  system)? free in v1. maybe in the future: happiness toll from losing wars (more units lost than your opponent)

## 3. Borders at peace

- ▢ **The core spatial rule** — while at peace, foreign units:
  civilians pass, military blocked. (traders should be able to freely make routes)
- ▢ Open Borders as a future treaty (v1 ships without deals)? yes, add this as an option at writing. Both players need writing to exchange open borders
- Interactions to rule once (a)/(c) chosen: routes THROUGH third-party
  territory; a unit standing inside when peace breaks the wrong way
  (rec: it is teleported-out/expelled to nearest legal hex, Civ's rule);
  lets say: once war starts, units are not expelled, but they are expelled after a peace deal.
  religious pressure and the tide are UNAFFECTED by borders (the tide is
  not a unit).

## 4. Peace

- ▢ **The mechanism** under simultaneous turns:
  (c) negotiated deals (cede cities/gold) — not v1.
  negotiated deals, we can use some dumb logic for now for evaluating peace based on the difference in units/cities lost as well as the difference in military strength (sum of combat strength of all units)
- ▢ Truce length after peace (no re-declaring the same pair): 10 turns
- ▢ May a war END any other way (elimination aside)? no

## 5. What war changes, system by system

- Combat vs a real player becomes ILLEGAL at peace and legal at war — the
  one big reversal from today. Refusals are player-plain ("You are not at
  war with the Crimson Banner"). great, keep this.
- Trade routes between the two empires: cancel on declaration
- City connections pathing through enemy territory: city connections should only apply to your own cities (the gold modifier). You can still use roads during war, they should become strategically important to control.
- Capture aftermath: as today (authority cost, courthouse family). Let's keep the puppet mechanic in civ 5. You can choose to raze: cities are razed immediately, puppet: city becomes a puppet city, costs 1 less authority and 75% happiness (check civ 5's numbers), annex (full authority and happiness cost)
  - **As built since batch WC1:** a town kept as a puppet or annexed is also in
    unrest until it is pacified, and a razed town leaves nothing to pacify. See
    §5c.
- Pillage/plunder: as today; at peace they become illegal against real
  players by the combat rule above.
- Pillaging a tile should heal the unit and give gold (i think this is already in)
- ▢ Does anything happen at the WORLD level when war breaks out (a
  triumph, a bead-family hook, the chronicle)? definitely a notification for players that have met both players at war. What is an annal?
- **Who is in the way** (as built, 2026-09-15, `docs/flags.md` (ooooo)): a war
  is what makes a piece a *wall* and what makes it hold ground. At peace a
  foreign piece is walked through (never rested on) and exerts no zone of
  control; at war it blocks transit and its picket charges the toll. Both read
  `atWar` — the wild is at war with everybody — and the rules are in the README's
  movement section.

## 5b. Combat — the waterline and the taking of a town (as built, batch N1, schema 107)

Ruled 2026-09-09 (`docs/flags.md` (ppp)). Every rule below is a clause of
`planCombat` in `src/sim/combat.ts` — one evaluator, so the attackable tint, the
forecast card and the reducer refuse and price as one. The three new numbers are
in `data/rules.json` under `rules.naval`.

**Across the waterline**

- A **land piece that closes** (melee, mounted, the scout) may not attack a
  target on a water hex at all — refused in `attackTargetAt`, one sentence:
  "Warrior cannot strike at the water". A land **bow** or **siege engine** still
  shoots at the water within its range.
- An **embarked piece** — a land unit standing on water — may not attack a ship,
  whether it would close or shoot: "Spearman is afloat and cannot fight a ship".
  It may still attack a **land** target, exactly as before.
- A **land bow or horse-bow** fights a naval target at
  `rules.naval.landRangedVsShipPercent` (−50); a **land siege engine** at
  `rules.naval.landSiegeVsShipPercent` (+50). Attacker-side percentages — the
  ledger's one allowed kind — printed as one named line, "Against a hull −50%",
  in the forecast's `attackerLines`. Read off `modelClass` / `category`, never a
  unit name.
- A **ship attacking an embarked piece** takes `rules.naval.embarkedCounterPercent`
  (50) of the counter-blow, named on the forecast's `counterPercents` as
  "Boarding at sea".
- That last one **composes with** `rules.naval.atSeaPenalty` and does not replace
  it: the at-sea penalty is a *strength* line on the defender (making the
  passenger both easier to kill and weaker in return, and cancelled by a light
  hull escort); the boarding share then halves what counter is left. Two labelled
  prices, either dialable to nothing without touching the other.
- ▢ The three figures are first cuts for the user's balance pass.
- **The scale everything here is measured on is the strength ladder** (batch U9,
  `docs/flags.md` (ttt); re-cut at the user's own figures by U9b, (yyy), which
  also raised every hull): every `combatStrength` and `rangedStrength` is Civ 6's
  magnitudes, and so is every flat line beside them — the ground, the trench, the
  general's aura, the walls, the naval column, the at-sea penalty. `docs/units.md`
  is the roster and the figures table; nothing in this file prints one of them.

**The taking of a town**

- The beats are still **walls → garrison → capture**, in that order, and the
  walls still come first wherever walls stand (`cityAttackPhase`).
- At the **garrison** beat, a **melee or mounted** blow that kills the defender
  **takes the town in the same blow**: the town changes hands through
  `captureCity` and the winner advances into it through `arriveOnTile`, the one
  "came to rest here" seam. The forecast promises it as `capturesCityOnKill` —
  conditional on the kill, which is the one beat a die decides.
- A **ranged** kill of the garrison takes no town: it empties the gate and leaves
  the **capture** beat for somebody who can walk in.
- The wild never takes a town, at either beat. A winner that dies to the counter
  takes nothing.
- ▢ The user may have meant the walls too (one blow from full health to taken);
  as built the walls beat is unchanged, so this shortens a siege from three blows
  to two and never from two to one.

## 5c. Unrest in a taken town (as built, batch WC1, schema 125)

The first of the three costs of war ruled on 2026-10-14 (`docs/flags.md`
(rrrrrr) part 1). The code is `src/sim/unrest.ts`; every figure is in
`data/rules.json` under `rules.war.unrest`.

**Who enters unrest**

- A town taken by force (`captureCity`) enters unrest, whether its captor keeps
  it as a puppet or annexes it. The record is `City.unrest`, absent on every
  town not in unrest.
- A town retaken by the empire that founded it enters unrest too.
- A town taken again while still in unrest starts a fresh unrest for its new
  owner: a new target, an empty basket, and the rebel count back at nothing.
- Annexing a puppet neither restarts nor ends its unrest. Razing leaves nothing
  to pacify.
- A town handed over at a treaty table is not taken by force: the handover
  neither starts nor ends unrest, and a town ceded while in unrest keeps its
  record as it stands.

**While in unrest**

- The town makes no production, science or culture. This is the unrest gate,
  step 13 of `docs/yields.md`, applied after both percentage stages so no
  percentage can bring a voice back. Food, gold and faith are untouched.
- Its borders do not grow: nothing banks toward the next tile (`borderGrowth`),
  and neither the phase nor a border windfall claims a hex for it.
- Buying things there works as it always does, and a puppet still buys nothing.
- It raises no production blocker: nothing it queued would move, so End Turn is
  not held on its empty queue.

**Pacification**

- A basket filled each turn, compared against a target; when it reaches the
  target the record is deleted and the town works again.
- The target is `targetPerCitizen` (2) × the town's population at the moment it
  was taken.
- The rate is a labelled list (`explainPacification`, rule 5):
  - `baseRate` (1) every turn;
  - `garrisonRate` (1) while a military unit of the owner stands in the town
    (`isFieldSoldier`: a scout or a ship does not count);
  - `generalRate` (1) while a great general of the owner stands in the town or
    within `generalReach` (1) hexes of it;
  - `buildingRate` (1) for each building carrying the `easesUnrest` marker (the
    Courthouse).
- The `unrest` phase runs after `resetMovement` and before `wakeSleepers`: after
  every phase that reads unrest (the yields, the borders) and every phase that
  moves a piece, so the turn a town is pacified is still a turn of unrest, and
  the town panel's "turns left" counts the End Turns with nothing made.

**Rebels**

- A town still in unrest at the phase with no military unit of its owner inside
  counts the turn as unguarded (`CityUnrest.unguarded`). A turn with a soldier
  inside adds nothing and takes nothing away.
- On every turn that count reaches a multiple of `rebelEveryTurns` (3), a rebel
  rises: a barbarian of the kind a camp standing on the town's hex would raise
  that turn (`barbarianUnitType`), on a free hex beside the town drawn with
  `state.rng`. None rises when no hex is free or the world has no wild seat.
- The phase fills the basket before it counts the turn, so a town pacified on
  the turn a rebel was due raises none.
- From the moment it stands, a rebel is an ordinary barbarian.

**Interface**

- The town panel's unrest card: the bar, the reasons with their figures, the
  turns left, and a warning while an unguarded town will raise a rebel before
  it settles. The yields hover prints the gate as one line under the stages;
  the band carries an "In unrest" badge; the borders row says "in unrest".
- The 3D banner flies a torch under its fly (`CityLook.unrest`; the yoke hangs
  under the hoist), and the DOM banner carries the same mark beside the name.
- The capture sheet says the town is in unrest under both answers that keep it,
  with the turns it will take. The owner hears a toast when a rebel rises and
  when a town is pacified.

**Bots**

- A town in unrest is owed `military.unrestGarrison` (1) soldiers, or
  `garrisonPerCity` if that is more; an empty one is garrisoned before an empty
  ordinary town, and the soldier holding one strikes nothing in close quarters,
  since a kill would carry it out of the gate.
- The declaration multiplies a candidate's score by
  `1 − war.unrestDrag × turns` the target would sit in unrest once garrisoned.
- A town of the bot's own in unrest is razed when no soldier of its stands in
  it or within `war.razeReach` hexes and it would sit in unrest at least
  `war.razeUnrestTurns` more turns.

## 6. War costs

- ▢ War weariness in v1: (a) none, defer for later after playtesting if needed
- **Ruled 2026-10-14:** three costs of war, in this order: unrest in captured
  towns (built, §5c), war weariness from net losses (built, §6a below), and unit
  ranks (built, §6b below). The spec is `docs/flags.md` item (rrrrrr).
- ▢ Warmonger reputation / opinions: not v1 (there are no opinions without
  diplomacy AI). Confirmed

## 6a. War weariness (as built, batch WC2, schema 126)

The second of the three costs of war ruled on 2026-10-14 (`docs/flags.md`
(rrrrrr) part 2). The code is `src/sim/weariness.ts`; every figure is in
`data/rules.json` under `rules.war.weariness`.

**What counts as a loss**

- A unit of yours that another empire destroys or captures, military or
  civilian. That includes a laden caravan plundered by a blow or by a piece
  marching onto it, a unit killed by a ranged blow, and an attacker killed by
  the counter-blow of a unit or of a city's walls.
- A town of yours that another empire takes by force (`captureCity`).
- Not a loss: anything involving the barbarians, on either side (rebels are
  barbarians); a town handed over in a peace deal (`handOverCity` from a
  treaty); a unit you disband yourself or one the creditors take; a settler,
  worker, prophet or great person spending itself.

**The record**

- `Player.warLosses`: one entry per loss, `{turn, by, kind}`, where `kind` is
  `unit` or `town`. Absent until the first loss.
- `recordWarLoss` is the only writer. It ignores a loss to oneself and any loss
  involving the barbarians. Its callers are pinned by a source test
  (`test/sim/weariness.test.ts`): three in `applyCombat` (a caravan plundered,
  a defender killed, an attacker killed by the counter-blow), one in
  `captureCity`, and two in `arriveOnTile` (a caravan plundered, a civilian
  captured).
- Nothing counts down. A loss counts while `state.turn − turn <
  windowTurns`, so a loss on turn `t` counts on turns `t` to `t + 19`.
- The `settleDiplomacy` phase prunes losses that have left the window, beside
  the truce broom. Deleting them changes no reading.

**The rule**

- Weariness against one enemy is the points you lost to it inside the window
  minus the points it lost to you inside the window, never below zero. A unit
  is `unitLoss` (1) point and a town is `townLoss` (8) points.
- A war you are winning, or an even one, costs nothing.
- Peace does not erase losses. They keep counting until they leave the window.
- Each point costs `happinessPerPoint` (1) happiness. Total weariness is the
  sum over enemies.

**What it costs**

- One cost line per enemy in the happiness list (`explainHappiness`,
  `meters.ts`), labelled with the enemy's name ("War weariness · the Inca"),
  after every town's line. An enemy you have no weariness against has no line.
- Nothing else. Lower happiness slows growth and can cost the bonus a happy
  empire gets, but weariness never touches a unit's strength or any combat
  figure.
- The meters are remembered on the economy clock (`slate.ts`). `recordWarLoss`
  moves that clock after it writes, and the turn change moves it, which is when
  a loss leaves the window. `Player.warLosses` is a row of the slate register
  (`test/sim/slateRegister.test.ts`).

**Interface**

- The happiness hover and ledger on the top bar print the line per enemy.
- The foreign courts screen prints "War weariness −N happiness" under the
  status in that empire's table head, whatever the relation, because a peace
  does not erase recent losses.
- The Compendium has a concept entry, "War weariness".

**Bots**

- Every peace decision reads `explainPeaceScore` (`src/ai/diplomacy.ts`): the
  warscore less `war.wearinessWeight` (1) points per point of happiness this
  seat's own weariness costs, and `war.unhappyWearinessWeight` (2) more per
  point of that weariness that sits below nought. The terms are printed, and a
  seat with no weariness reads the bare warscore.
- The readers are the sue arm and its tribute (`peaceDecision`), the answer to
  a paper (`answerPeaceOffer`), and the table's counter (`counterRefusal`,
  `counterTerms`). So a weary seat sues sooner (`war.sueFloor`), stops reading
  as winning sooner (`war.acceptCeiling`), owes more for a peace and so signs a
  worse paper, and offers more coin when it sues.
- **Only the weary side is moved.** The enemy's weariness never counts for a
  seat, so a winner facing a weary enemy reads exactly the war it read before
  WC2 and is never harder to make peace with. Weariness ends wars sooner, never
  later.
- **The warscore itself is unchanged**: six lines, an exact mirror between the
  two empires. It also decides whether a seat campaigns (`campaignEnemy`,
  `bot.ts`: a seat under its `sueFloor` stops campaigning), and weariness must
  not change that. A first version put weariness inside the warscore and broke
  the slow war loop (`aiWar.slow.test.ts`): the loser's one point of weariness
  put it one point under its floor, it stopped campaigning, the counter-attack
  that evened the exchange never came, and the winner, still ahead on the
  exchange, never signed.

## 6b. Unit ranks (as built, batch WC3, schema 127)

The third of the three costs of war ruled on 2026-10-14 (`docs/flags.md`
(rrrrrr) part 3): ranks make a unit worth keeping alive, so losing one costs
more than the hammers. The code is `src/sim/ranks.ts`; every figure is in
`data/rules.json` under `rules.combat.ranks`.

**Experience**

- `Unit.experience`, absent until a unit's first award. `awardExperience` is
  the only writer, and `applyCombat` (step 5b, after everything else in the
  fight) is the only caller; both are pinned by a source test
  (`test/sim/ranks.test.ts`).
- A blow is a **fight** when it is struck at a unit that is not a civilian, or
  at a town whose walls still stand. Taking a civilian, plundering a caravan and
  walking into a beaten town with nobody in the gate are not fights and pay
  nothing.
- Each side that lives through a fight earns `survive` (1), or `kill` (2) in
  its place when it destroyed the unit it fought. Attacking and defending are
  paid alike. A ranged attacker that takes no counter-blow has still survived a
  fight, and so has the unit it shot.
- A town never earns experience, and neither does a garrison standing behind
  walls that took the blow in its place.
- A barbarian beaten under Blood Brothers counts as a kill for the unit that
  beat it, though it joins rather than dies. So does an enemy soldier that
  changes sides under The Turning of Swords (Devotion batch DV8).
- Experience stays with the unit through an automatic upgrade (the type changes
  in place) and through a change of owner (`captureUnit` changes only the
  owner).

**The barbarian cap**

- A fight with the barbarians raises experience up to the threshold of
  `barbarianCap` (Veteran) and no further, and a unit already at or past it
  gains nothing from one, so a camp that keeps respawning cannot be farmed.
- Fights with empires have no cap: a Veteran made on barbarians goes on to
  Elite against an empire.
- *Choice made in the build:* barbarian units earn no experience at all, so a
  raider or a camp guard does not grow stronger the longer it lives.

**Ranks**

- Derived from experience on every read (`rankOf`), never stored. Veteran from
  `ladder.veteran.experience` (4), Elite from `ladder.elite.experience` (10).
- Each rank is **one flat strength line** on the combat ledger, on whichever
  side the unit fights: "Veteran +3" or "Elite +6". The Elite figure is the
  total, so an Elite unit prints one line, never a Veteran line beside it.
  Because the damage curve reads the difference between two strengths, the
  same flat edge is worth the same in every age.
- Nothing else: no extra health, no movement, no choices.
- A town defending its walls has no rank line, whatever stands in it.
- *Choice made in the build:* a card's birth stamp of strength (Professional
  Soldiers, the Terracotta Army) used to print as "Veteran" on the forecast. It
  is now "Training", so "Veteran" means only the rank.
- *Choice made in the build:* the strength a battle rider scales by
  (`fallenStrength`, Songs of the Fallen) is still the roster's strength plus
  the stamp, without the rank.

**Interface**

- **The board:** a ranked piece's badge carries a boss at its upper-left corner,
  one chevron for a Veteran and two for an Elite, on a parchment disc
  (`src/art/rankMarks.ts`, traced into the tile atlas by `drawRankCell`). The
  worker's charge digit takes the other corner. The boss's size and place are
  `badges.rankDiameter`, `rankOffsetX`, `rankOffsetY` and `rankNudge` in
  `data/view3d.json`. A walking copy carries the boss too. The rank, not the
  experience, is a member of the piece fingerprint (`signUnits`).
- **The garrison row** on a city banner shows the same chevrons as a chip at the
  roundel's corner, since a piece in a town gives its badge to the row, and the
  hover names the rank ("Veteran Swordsman").
- **The unit panel:** the rank and its mark under the unit's name ("Veteran ·
  Rome"), an Experience figure toward the next rank ("5/10", or the total at
  Elite), and the rank's strength in the notes ("+3 Veteran").
- **The combat forecast** prints the rank line under the unit's strength, with
  every other line.
- **The Compendium** has a concept entry, "Unit ranks", and the combat entry
  points to it. The flair cabinet lists both marks, has a stall for the boss
  with knobs on its numbers, and ranks two pieces of its garrison row.

**Bots**

- A ranked piece below `military.veteranCautionBelow` (0.75) of its own health
  refuses a blow that is not decisive when the counter-blow's worst roll could
  kill it, or when the blow deals no more than it takes. Neither the seat's
  appetite nor the siege appetite loosens it. A decisive blow (a kill, a
  capture) is still taken. The refusal is printed on the candidate.
- Every blow a bot weighs is read off the combat forecast, so the rank's
  strength is already in each exchange. Nothing else in the bots reads ranks:
  the army strength a declaration weighs is unchanged, and the rest and
  withdraw thresholds are the same for every piece.

**Not built**

- A message when a unit earns a rank.
- Cards, buildings or wonders that read ranks or grant experience.

## 7. Diplomacy beyond war — the v1 cut line

- v1 ships: declare war · peace flow · truce · the border rule · UI below ·
  bot integration below. *(the cut, unless you widen it)*
- ▢ Anything else you want IN v1: open borders, trade cities/resources/gold/gpt, these can all be used in peace deals or normal trades
- trade deals: ai players should accept trades for 1:1 luxuries for copies that it has duplicates of. Figure out a good baseline for gpt/gold for luxuries. Other types of trades can come later.
- sidebar: Should resource access from other players happen through trade routes? civ 7 has an interesting take on this but i don't want to build their whole resource slotting system.

## 8. Bots at war

- All bots: handle being declared on (the threat machinery already reacts;
  peace-seeking is the new half).
- ▢ Warmonger declaration policy: declare when army advantage × aggression
  clears a threshold and a target city is in reach (all knobs in
  `data/ai.json`, terms visible in the spectate feed). confirmed
- ▢ Peace-seeking: a warscore (losses vs gains since declaration); offer
  peace below a floor, accept above one. All personas get it; the
  warmonger's floors are just lower. confirmed
- ▢ Do non-warmonger personas EVER declare? (rec: opportunistic declarations
  for wide (land grab) at high advantage; never for tall/zealot in v1.)
  give higher threshold for non-warmongers, this should be a tunable parameter

## 9. Interface

- ▢ Where does diplomacy live: a Diplomacy screen off the top bar (empire
  list, relation, declare/offer buttons, truce timers) (rec) — or seat
  strip popovers only? 
  - Lets have it be a new menu, it can sit alongside the statecraft/religion icons.
- At-war indicators: seat strip badges, a war toast both sides, the annal.
- units that belong to players you're at war with should glow red. Please use a red thats different from the current crimson player type.
- Combat refusals name the rule; the declare button carries a confirm.
  - declare war should be an option in the diplomacy screen.

## 9a. The screen, as built (2026-09-03 playtest ruling)

- **Only empires you have met.** A seat joins the roster once you have seen
  its land, its town or its pieces — or signed anything with it.
  `hasMetSeat` (`src/sim/diplomacy.ts`) reads the **stored** register first
  (`Player.metSeats`), then the four board clauses: a standing relation (war
  row, truce, running bargain, paper on the table), a remembered town
  (`citySightings`, which carries `ownerId`), an explored hex their towns own
  now (what `TerritoryLayer` already draws), or one of their pieces visible
  this instant. `metSeats`/`metDiplomacyRows` are the drawn register;
  `diplomaticSeats` stays the whole world.
- **A UI gate only**, like `localPlayerId`: no verb refuses on met-ness
  (`declareWarError` has no such clause), so a bot may act on what a human
  has not scouted. The relation clause is load-bearing — a seat declared
  upon by an empire it never scouted must still be able to sue for peace.
- **A meeting is permanent** (ruled 2026-09-04, schema 64 — closing the gap
  this section used to name). `Player.metSeats` is a sorted per-seat register
  written by `recordMeetings` (`visibility.ts`) off the same `lit` set the fog
  and the city memory are folded from: sight a rival's piece or a rival's
  ground once and the meeting stands for ever. The four derived clauses stay
  as the backfill for a game that began before the field existed. **The wild
  is never met**, in either direction — it is on no roster.
- **Layout**: Civ's trade-table shape in the specimen language — a roster
  column of met empires (relation, clocks, counted marks) beside the chosen
  empire's table: your side | the paper being written | their side, with
  declare/peace over it and the standing papers and running bargains under
  it. All verbs and gates unchanged; layout and information design only.

## 9b. Late rulings (2026-09-03, chat)

- AI escorts its settlers with military units (P3, bot brain).
- Puppets: production VISIBLE but uncontrollable; chosen by the bot's own
  appraisal, issued as logged commands by whichever client drives the seat
  (deterministic). Annex anytime (full costs, irreversible). Raze immediate;
  capitals never razeable (orchestrator default — overrule if wanted).
- **A puppet spends nothing**: no unit, no building, no ground (schema 58) and
  **no contribution** (ruled 2026-09-04, schema 64) — three clauses in one
  voice, `purchaseError` / `tilePurchaseError` / `contributeError`. Annexation
  is the verb that opens the purse.
- Peace proposals may carry deal terms; empty proposal = white peace.
- City trading in PEACE DEALS ONLY (v1).
- Deal durations: 20 turns, absolute expiry, auto-cancel on declaration.
- No route-based resource access (the Silk Exchange order owns that space).
- Losing-war happiness toll: parked in flags.

## The milestone — three phases

- **P1 (war core, spawns now — no src/ai)**: wars state + atWar + declareWar
  · borders (civilians pass, military blocked at peace; traders free) ·
  combat/pillage/plunder gated on war · expulsion at PEACE (not declaration)
  · routes cancel on declaration · capture → puppet default / annex / raze ·
  diplomacy screen (hud dock) + toasts + red glow for enemies · white-peace
  proposal command (bots answer in P3) · schema 56.
- **P2 (deals)**: open borders (both need Writing) · luxury / gold / gpt
  trades · peace terms incl. cities · lent-access clause in openedResource ·
  the deal state (20-turn expiry).
- **P3 (bots at war, after brain v1 merges)**: declaration policy + warscore
  peace + trade acceptance (1:1 duplicate luxuries, gold baselines) · puppet
  auto-production wiring · settler escorts · spectate terms for all of it.

## 10. What this un-defers (the payoff shelf)

Pax Magistri (no-declare clause) · The Levée en Masse (border-crossing
muster) · Religious Mandate (permanent war) · the warmonger persona's real
frame · Frontier Forts/Border Wardens' full meaning · The Taken/Conqueror-
class deeds · Sea Peoples (with its movement rule) · war-scoped Orders
throughout the proposed pools.

## 11. Engine notes (the orchestrator's, not decisions)

Schema bump (new state + a legality reversal — old logs with peacetime
attacks must refuse). `atWar` reads everywhere combat/entry is gated:
`combatError`, `canAdvanceOnto`/`canStopOn`, pillage/plunder gates, route
verbs — each a one-clause addition to an existing refusal, never a parallel
gate. The expulsion rule (if chosen) runs at declaration through
`arriveOnTile`'s seam. Bot work lands AFTER brain v1 merges (same files).

## 12. The audience — a paper answered at once (2026-09-07)

The user: *"rework the diplomacy screen to more closely match civ. We should
have a peace proposal like in civ, where the ai have to respond immediately,
with an option for 'what would make this work?' for the items on the deal
table."* Marginalia here are rulings; (rec) is the orchestrator's default and
flies unless overruled.

What exists: a proposal is a standing paper the bot answers at its next
sitting (`driveBots`, after the human ends the turn); a peace is two flags
closed by `settlePeace` at the turn's end; the screen already has the
trade-table shape (9a). The bot's valuation of a paper is `explainPaper`
(`src/ai/diplomacy.ts`): coin, tribute at the seat's own rate, a seam at
`luxuryGoldBaseline` if the receiver lacks the kind, a town at the city
weight, a right of way at zero; the warscore prices a peace.

- **The answer is the bot's own command, dispatched at once.** When a seat
  proposes to a bot seat *this client drives*, the client asks the bot's
  answer arm straight away and dispatches the bot's command through the
  driver's funnel (`answerAudience(game, …)` in `src/ai/driver.ts`, beside
  `driveBots`): `acceptDeal` / `declineDeal` for a bargain; for a peace, a
  bare `proposePeace` (sign) or the new `declinePeace`. Determinism holds
  because the answer is a pure function of the state and lands in the log as
  the bot's command — a replay replays it. A human seat (hot-seat, remote)
  is answered as today: the paper stands. Bot-to-bot papers are unchanged
  (answered at the sitting).
- ▢ **A refused peace comes off the table** (rec): new command
  `declinePeace {playerId, targetId}` — the asked seat clears the other's
  offer and its terms (the envoy is sent home). Today declining a peace is
  not a command and a refused offer stands for ever. Schema.
- ▢ **A peace both sides have signed closes at once** (rec), inside the
  second signature's command: the pair's settlement (`settlePeace`'s body
  for one war row — terms, close, truce, expulsions, in that order) runs
  from the reducer, and the end-of-turn phase remains for the human-vs-human
  case. Civ's rule: a player who signed is at peace now, not at the turn's
  end. *Alternative:* keep the end-of-turn close and say so on the sheet.
- **"What would make this work?"** — a pure read, `counterTerms(state,
  botSeat, askerSeat, give, take)` → `{give, take, appraisal} | null`, in
  `src/ai/diplomacy.ts`. The bot's own reading says by how much the paper is
  short from its side; the counter fills the gap on the **asker's** side in
  a fixed order — coin from the asker's treasury, then coin a turn at the
  seat's own rate, then (a peace only, ▢ rec yes) a town of the asker's
  nearest the bot's ground, since towns are a peace paper's term (9b) — each
  capped by what `dealSideError` would allow. A gap that cannot be filled
  answers `null`, and the sheet says the bot's own sentence ("Nothing you
  hold would make this work"). Its mirror, **"What would you give for
  this?"**: the asker offers and asks nothing, and the counter fills the
  **bot's** side down to even — coin, then coin a turn, then a duplicate
  seam the asker lacks (never a last copy, `asksOurLastCopy` stands).
  A war the bot is winning (warscore over `acceptCeiling`) has no counter:
  "The Crimson will not treat while the war goes their way."
- ▢ **A markup** (rec): `war.counterMarkup` 0.1 — a counter asks a tenth
  over even, so it is never a paper the bot merely tolerates. ▢ **A right
  of way gets a price** (rec): `war.openBordersPrice` 60 coin, both ways —
  today it is priced at zero, so a counter could neither ask for it nor
  sell it. Both knobs in `data/ai.json` (the arena panel walks the sheet).
- **The sheet**: under the paper being written, three verbs — *Propose*
  (the answer draws at once in the middle column as the envoy's sentence,
  carrying the bot's own reason: "it asks for the only silk this empire
  holds", "it costs more than it brings"), *What would make this work?*,
  *What would you give for this?* — the counter is written into the draft,
  editable, then proposed. At war the same table is the peace paper and an
  empty table is a white peace; *Propose peace* answers at once. ▢ (rec)
  **The envoy card**: a bot's paper put to you draws as a card at the
  turn's start (`onTurnHandedOver`'s moment, the turn card's sibling on
  `modalShell`) with accept / decline / *open the table*; the standing
  papers section keeps it meanwhile. Layout in the specimen language; every
  sentence from the simulation or the bot's own terms, no numbers in prose
  that the fold does not print.
- Multiplayer: the client driving the bot seat answers (the host under
  remote play; netcode later). Nothing about a human seat changes.

### As built (batch D1, 2026-09-08, schema 90)

- **`declinePeace {playerId, targetId}`** — the asked seat clears the *other*
  seat's standing offer and the paper it rode in on. Gate `declinePeaceError`
  (a war, and an offer of theirs to refuse); writer `refusePeaceOffer`
  (`wars.ts`, beside `setPeaceOffer`); no `CommandResult` field — what changed
  is a row the screen is already drawing.
- **A peace closes on the second signature**, inside that command:
  `settlePeacePair(state, war)` is `settlePeace`'s body for one row (terms →
  close → truce → row → expulsions, unchanged), called from `applyPeaceOffer`
  when `peaceIsSigned` reads true after the write, and reported on
  `CommandResult.peaces` so the toast and the envoy card can both say the war is
  over. The end-of-turn phase keeps the sweep for a pair whose flags met
  **without a command between them** — an older save, or a fixture using the
  register's own writers. Two human seats signing through commands now close the
  war on the second command like anybody else, which is the ruling read plainly.
- **`counterTerms`** (`src/ai/diplomacy.ts`, pure) — the reading and its filling
  order are `docs/bot-priorities.md`'s D1 section. `counterRefusal` is the
  separate one-sentence answer for the war a seat is winning, because a refusal
  has no terms to carry.
- **`answerAudience(game, {seatId, askerId, dealId?})`** (`src/ai/driver.ts`) —
  asks `answerProposal` or `answerPeaceOffer` about that one paper and
  dispatches the answer through the driver's funnel. Never ends the seat's turn,
  never runs another arm; `null` for a human seat, a seat that has ended its
  turn, or a paper that is not on the table.
- **The sheet**: *Propose* / *Propose peace* dispatch and then ask
  `askAudience`, and the envoy's sentence draws in the middle column with the
  bot's own reasons under it; *What would make this work?* and *What would you
  give for this?* write the counter into the draft, where it stays editable.
  Both are options handed in by `main.ts` — the sheet never imports the AI.
  `envoyLines` / `counterNote` / `counterLines` are the pure half, tested
  without jsdom. A peace paper somebody put to *you* also carries **Send them
  home** (`controls.declinePeaceFrom` → `declinePeace`), greyed with
  `declinePeaceError`'s own sentence: the command is the bot's answer and the
  player's alike, and a verb with no human surface is a verb half built.
- **The envoy card waits.** `onTurnHandedOver`'s moment is a *splash*
  (`announceTech`/`announceTurn`), not a `modalShell` sheet, and a card there
  would have to queue against the turn card and the bead news; that is a batch
  of its own rather than a contained addition. A bot's paper keeps its place in
  the standing papers, and the roster's own note ("A paper waits on the table.")
  still points at it.

## 13. The campaign — a war declared with a force, and fought (2026-09-07)

The user: *"right now the two of the ai have declared war on me, and they're
just being annoying. Not sending army to attack me but parking units near my
lands, a worker in my lands standing on a tile i want to improve. bots should
have something of a threshold to declare war, and when declaring war, should
send units to attack me."*

**Diagnosis** (the orchestrator's, verified in `src/ai/bot.ts` and
`src/ai/diplomacy.ts`):

- The declaration bar is an army **ratio** alone (`declareDecision`): a
  balanced seat declares at 4.5× the target's roster strength (wide 3.2,
  tall/zealot never), with any town of theirs within 12 hexes of any piece.
  One warrior against five is a ratio of 4.5, so a peaceful persona declares
  on an unarmed neighbour and nothing asks whether it has a force to send.
- The march on a rival is gated on `military.aggression > 0`
  (`soldierCommand`), which only the warmonger has. Every other persona at
  war swings only at what stands **next to** a piece; its soldiers near your
  border are the camp hunt and the garrison shuffle, not an invasion. The
  declaration policy and the prosecution policy disagree.
- The warmonger's `warMarch` walks each piece alone at the nearest enemy
  thing inside `huntRadius`; a lone piece beside walls fails the exchange bar
  and parks ("no operational plan — no siege stack, no line", its own words).
- Civilians have no war arm: a worker keeps working a hex inside your
  borders after the declaration (the settler has an escort clause; the
  worker has nothing).

**The rulings** — (rec) flies unless marked:

1. **Declaring needs a force, not a ratio alone.** Three printed clauses:
   the ratio-with-appetite as today; a **strike force** — at least
   `war.strikeForce` (rec 4) combat pieces beyond the garrisons
   `garrisonPerCity` asks for, of which at least one is ranged or siege;
   and a **road** — one of those pieces has a path to the target town
   (`findPath`). ▢ Persona bars stay (balanced 4.5, wide 3.2, warmonger
   1.4); the force clause is what stops a declaration on the unarmed.
2. **A seat at war campaigns, whatever its temperament.** The
   `aggression > 0` gate on the march goes; the war is the permission. A
   seat the warscore says is losing (under `sueFloor`) holds its towns and
   sues, as today; the appetite goes on loosening the exchange and nothing
   else.
3. **One target town per enemy, and a muster.** `campaignTarget` = the
   enemy town nearest this empire's towns (ties: weakest garrison, then map
   order); the **muster** = the hex `war.musterDistance` (rec 3) short of
   the target along the path from this seat's nearest town, on ground the
   seat may stand on. Redundant soldiers (`isRedundant`, `townsAreHeld` —
   the guards stand) march to the muster (`campaignMarch`, replacing the
   nearest-thing walk). When `war.strikeForce` pieces stand within
   `war.musterRadius` (rec 2) of it the force **pushes**: melee and mounted
   step adjacent to the target, ranged and siege to firing range, and blows
   on the town and on defenders adjacent to it clear the **siege exchange**
   (`war.siegeExchange` rec 0.7, the appetite reading for a push) — so a
   stack keeps hitting walls it is not out-trading blow for blow. Every
   step is a candidate with terms in the feed ("the campaign on Lutetia:
   5 of 4 mustered — pushing"). Stateless by construction: the target,
   the muster and "mustered" are re-read from the board every turn.
4. **Civilians at war flee.** A worker or settler standing in an enemy's
   borders, or within `war.escortRadius` of a sighted enemy combatant with
   none of ours adjacent, walks to the nearest own town (`civilianFlight`,
   the settler's danger clause made general). The worker on your hex goes
   home.
5. **The war economy.** While a war is on, the army wanted is the strike
   force plus the garrisons (`war.campaignArmy` joins `sightedArmyWanted`'s
   terms), so a seat that declared builds what the campaign needs.
6. Knobs in `data/ai.json` (the arena panel walks them); the feed carries
   every term; `docs/bot-priorities.md` gains the section; `test/sim/aiBot`
   core cases for each clause and a slow two-seat war where the attacker
   reaches and reduces a town, measured.

### As built (W1, 2026-09-08)

All six ruled, and two faults underneath them that the diagnosis had not found.
The declaration's two new clauses live in `explainDeclaration`
(`src/ai/diplomacy.ts`, split out of `declareDecision` so a target the force or
the road removed can be read when nothing is declared); the operational readings
— the force, the road, the target, the muster, who stands at it — are a fourth
leaf, `src/ai/campaign.ts`, because the declaration and the march both ask them
and `diplomacy.ts` may not import `bot.ts`. `campaignMarch`, `civilianDanger` /
`civilianFlight` and the war economy's term are `bot.ts`'. Knobs: `strikeForce`
4, `musterDistance` 3, `musterRadius` 2, `siegeExchange` 0.7. **No
`campaignArmy`**: the strike force is the figure the levy wants over its
garrisons, so what it takes to start a war, to press one and to build for one
cannot be tuned into disagreeing.

The two faults, both of them why the old bot "parked units near your lands":
**`warMarch` could not path at a town at all** — `canTransit` refuses a foreign
city's hex outright, so `findPath` to one answers `null` on every board, and the
arm meant to push at walls could only walk at a rival's column (every reading now
asks about the ring); and **a piece that stood down never asked for orders
again** — nothing but a march, a blow or a capture breaks a trench, and this bot
only hears about a piece through `firstBlocker`. The campaign therefore wakes its
own army (`wakeTheCampaign`), taking only a march or a blow, which is what keeps
it monotone. A third, found by measurement: an army ordered one piece at a time
in one turn handed several soldiers the same destination, and all but one were
left holding a march the stacking cap will never let them finish, invisible for
ever — so a hex somebody is already walking to is now claimed (`marchClaims`) and
a doomed march is a reason to be woken (`marchIsStalled`).

Measured (`aiBot.slow.test.ts`, the new siege arena — a balanced seat, eleven
soldiers put in the field, a war opened, forty turns): arrived at the walls on
**t5**, up to **nine** pieces within two hexes of them, the target's walls from
**100 down to 21** by t6. Before the batch the same board produced no arrival and
no damage. Known gaps are listed in `docs/bot-priorities.md`'s W1 section; the
two that matter are that **nothing sequences a capture** (the push takes walls
down and stops) and that a declaration is now a **conjunction** — measured on the
war arena's own board, the warmonger holds a strike force on 70 of 170 turns and
still never declares, because the ratio, the reach, the force and the road rarely
hold in the same turn. That arena's claim was reworked into the rule (no
declaration on a turn when the force is short) and the whole loop — declare,
fight, sue, sign, truce — moved to a flat bench where it runs in a second.

## 14. Too many wars, fought one piece at a time (2026-09-15)

The user, on a game in which every empire but one had declared on them: *"they
are just sending massive hordes of army lmao … i feel like i'm playing a wave
defense game. We should really tune its propensity to throw units into mine and
how aggressively it decides to declare war."* Ruled in `docs/flags.md` (nnnnn).

**Measured first** (six seats, standard, seat 0 held passive through a per-seat
tuning sheet — it never declares, never campaigns and garrisons what it builds —
a hundred turns, seeds 1–3):

- **Nobody declares on the passive seat at all.** Every declaration in three
  games came from the warmonger, and the peaceful bars (4.5, wide 3.2) never
  once cleared. The declaration problem is not *who* is declared on; it is how
  many wars one seat opens: **four declarations in a single turn** on seed 1
  (t51, on seats 1–4 at once), five over the game on seed 2, three of them still
  running at t100.
- **The conduct is the other half.** 159 and 174 attacks a game; 17 of them at a
  forecast loss (every one of those a *melee* blow), and 6–10 of those into a
  town or at a piece dug in on ground that pays it.

### The declaration, as built (`src/ai/diplomacy.ts`)

- **The ratio counts what could march** — `fieldedStrength(force)`, the field
  army's strength scaled by the share of it that is spare of the garrisons every
  town is owed. Which pieces stay home is not decided anywhere, so the share is
  an estimate and prints as one.
- **A second war costs more**: `war.secondWarMultiple` (2) raises the seat's own
  bar while any war with a real empire is on. The wild is not a war.
- **The dogpile**: a target already fought by `war.dogpileSeats` (2) empires is
  read at the strength it *raised* (`Player.unitsBuilt`, the warscore's own
  lifetime proxy) rather than at what is left standing — the same target, never
  a cheaper one.
- **The cost of the war** (`explainExpedition`): the marching strength against
  the target town's own strength — `cityBaseStrength` + `buildingCityStat`'s
  walls + `explainTerrainDefense`'s ground — dragged by `war.roadDragPerStep`
  (0.05) a step of the probe's own road, refused under `war.expeditionOdds` (1).
  Asked last, only for the candidate that cleared everything else, because it is
  the only clause that needs the road's length.

**The persona bars are untouched** (balanced 4.5, wide 3.2, warmonger 1.4, tall
and zealot out of reach). The measurement is why: no peaceful persona ever
cleared its bar in three games, so lowering one would be tuning against nothing
and raising one would change nothing. What was actually declaring too much was
one seat opening four wars in a turn, and that is the second-war multiple's.

### The conduct, as built (`src/ai/bot.ts`, `src/ai/campaign.ts`)

- **A blow in the field must be favourable**: `military.strikeFloor` (1) is the
  floor the seat's appetite may not loosen past. A warmonger's 0.6 used to turn
  *deal more than you take* into *deal more than four tenths of what you take*.
- **Melee never walks into a wall at a loss**: `military.hardTargetMargin` (1.2)
  refuses a melee blow on a town, or on a piece fortified on ground that pays
  it, that would not come off better — unless it kills, captures or takes the
  town. Bows and siege engines take no counter-blow and clear it by
  construction, which is *ranged and siege first, or wait*. `war.siegeExchange`
  is unchanged and still buys the other half of a push: the pieces screening the
  town.
- **A hurt piece in the field walks home**: `military.withdrawBelowHealth`
  (0.35), `fallBackAndHeal` — the deferral `restAndHeal` wrote down when it
  shipped, closed.
- **The rally**: `musteredNear` no longer counts the pieces *holding a town* as
  part of the column. A border town frequently stands nearer the target than the
  muster does, so its garrison counted as gathered, the plan read itself as
  mustered with one piece at the front, and the army arrived at the walls one
  soldier a turn. No knob of its own — the force the column waits for is
  `war.strikeForce`, which is already the figure the declaration cleared and the
  levy builds for.

**What the siege bench says about all four** (`aiWar.slow.test.ts`, the same
board as §13's): the force still arrives and still takes the walls down —
**nine** pieces within two hexes, the target from 115 hit points to 21 — and it
arrives on **t16** rather than on t5. That is the batch in one number: the same
siege, eleven turns later, because the column now waits for itself and the
swordsmen wait for the bows.

### The peace, as built (the addendum)

The user: *"the ai should have some idea of how many units it's lost to you vs
how many it's killed, and factor that into it's decision for peace."*

The simulation already counts the pieces — `Player.unitsKilled` and
`unitsLost`, written at the two seams in `applyCombat` where a piece leaves the
board, the wild excluded — and counts them as **careers**. A peace decision
wants the window since *this* war began, and nothing on the board carries one.
`src/ai/warLedger.ts` opens the window from the bot's side, the way the refusal
memory does (ruling (ggg)): a `WeakMap` on the live state, the career counts of
the first look becoming that war's zero, keyed by the pair and the declaration's
own turn. No schema, no save, no migration; a save loaded mid-war reads the
exchange as even for a turn and goes on from there. The towns need no baseline —
`City.capturedOn` is an absolute stamp, so a town taken on or after the
declaration and standing in one of the two hands is a town this war moved.

**If the exchange is ever wanted as a fact of the world** rather than as a
bot's reading — a war screen showing the butcher's bill, say — the field to
propose is a pair of counters on `WarState` (`killedA`/`killedB`, raised in
`applyCombat` beside the lifetime ones), which is a schema decision and
`src/sim/`'s to make.

The reading is `explainStanding` (`src/ai/diplomacy.ts`): the war's cost against
its takings, pieces and towns at the warscore's own weights
(`war.unitLossWeight`, `war.cityWeight`), as *ours over theirs* — above one is a
war going badly. Three clauses come off it, each printed:

- **it sues** when the exchange has run past `war.peaceExchange` (1.3; the
  warmonger asks at 2.2) **and** its army advantage no longer clears the bar it
  would have declared at (`explainAdvantage`, the declaration's own fielded
  ratio; the **base** bar, since the second-war multiple is about *opening* a
  war, **capped at `war.declareThreshold`**). The cap is the one place this
  reading is not the declaration's word for word, and the measurement is why: a
  peaceful seat's own bar means *I declare only at an advantage nobody could
  mistake for a fair fight*, and read as a peace bar it says *I have lost* about
  a war it is winning two to one — the siege bench's balanced seat, eleven
  soldiers against five, sued on turn three and the siege never happened. Both
  clauses at once, too: either alone is a seat that sues the moment it loses a
  skirmish;
- **it takes a peace** offered while the exchange is against it or the advantage
  is gone, whatever the paper is worth;
- **it sends the envoy home** while the exchange is running its way *and* it
  still out-arms them — a seat ahead on kills and behind on army is a seat whose
  luck has run out.

What the ledger cannot see is what the warscore could not: the counters are
against **all** empires, so a seat in two wars charges both for every piece it
loses. That is the three-way blur the warscore's own docblock names, narrowed to
a window.

## Revisions

*(yours — edit away)*

## Foreign courts UI (September 2026)

- Diplomacy opens in the shared modal shell; the roster uses live leader
  heraldry. The two inventories show actual luxury copy counts, spares,
  treasury and transferable town population. Town terms appear only at war;
  seats of government remain unavailable.
- Audience text presents acceptance, refusal and counteroffers in player-facing
  language. Internal AI appraisal scores remain in the decision data, not the
  leader's dialogue. Refused drafts remain editable.
- A fresh declaration against the local player queues an urgent dispatch, with
  acknowledgment and a link to that court. Existing wars loaded from saves do
  not replay dispatches; the ordinary chronicle retains the event.
- An envelope above End Turn shows incoming trade and peace offers. One opens
  its court directly; several open a chooser. The modal displays the actual
  proposed terms before acceptance. The count follows current state, including
  withdrawal and seat changes. Offers do not block ending the turn and do not
  automatically open a modal.
- `/flair.html?review=diplomacy-game` provides a separate command-backed fixture
  of the production UI; it does not write saves. The original design prototype
  remains at `/flair.html?review=diplomacy`.
