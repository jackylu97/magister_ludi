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

## 9b. Late rulings (2026-09-03, chat)

- AI escorts its settlers with military units (P3, bot brain).
- Puppets: production VISIBLE but uncontrollable; chosen by the bot's own
  appraisal, issued as logged commands by whichever client drives the seat
  (deterministic). Annex anytime (full costs, irreversible). Raze immediate;
  capitals never razeable (orchestrator default — overrule if wanted).
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

## Revisions

*(yours — edit away)*
