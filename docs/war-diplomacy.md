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
- Pillage/plunder: as today; at peace they become illegal against real
  players by the combat rule above.
- Pillaging a tile should heal the unit and give gold (i think this is already in)
- ▢ Does anything happen at the WORLD level when war breaks out (a
  triumph, a bead-family hook, the chronicle)? definitely a notification for players that have met both players at war. What is an annal?

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

## 6. War costs

- ▢ War weariness in v1: (a) none, defer for later after playtesting if needed
- ▢ Warmonger reputation / opinions: not v1 (there are no opinions without
  diplomacy AI). Confirmed

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

## Revisions

*(yours — edit away)*
