# War & Diplomacy — design worksheet

The last core system before playtest (ruled 2026-09-03). Vanilla Civ first.
Fill in the ▢ decisions; recommendations are marked (rec) and are yours to
overrule. What exists today: combat between empires is simply LEGAL (no war
state anywhere), capture works (three beats, courthouse, authority cost),
plunder/pillage/siege/ZoC all work, the bot defends but never attacks a real
player, the warmonger persona's aggression knob (brain v1, in flight) attacks
without any diplomatic frame. Barbarians are always hostile and stay so.

## 1. The war state

- A symmetric pair relation in the save: `wars: {a, b, declaredTurn}[]` —
  derived readers (`atWar(state, a, b)`), one writer per verb. Public to all
  seats (everyone hears a declaration). *(settled unless you object)*
- ▢ Does ANYTHING persist about a finished war (history, grudges)? (rec: v1
  records nothing beyond the truce timer; grudges arrive with opinions.)

## 2. Declaring war

- `declareWar { playerId, targetId }` — an ordinary command, announced to
  every seat. *(settled)*
- ▢ **Surprise war**: may you declare and attack in the same turn? (rec:
  yes — log order makes it deterministic; the defender's protection is the
  border rule below, not a timer.)
- ▢ Any cost or gate on declaring (authority, happiness hit, a casus-belli
  system)? (rec: free in v1; costs arrive with weariness/opinions.)

## 3. Borders at peace

- ▢ **The core spatial rule** — while at peace, foreign units:
  (a) may not enter your territory at all (Civ's closed borders; war is
      what opens ground) (rec);
  (b) may pass but never attack (today's movement, combat gated);
  (c) civilians pass, military blocked.
- ▢ Open Borders as a future treaty (v1 ships without deals)? (rec: yes,
  parked.)
- Interactions to rule once (a)/(c) chosen: routes THROUGH third-party
  territory; a unit standing inside when peace breaks the wrong way
  (rec: it is teleported-out/expelled to nearest legal hex, Civ's rule);
  religious pressure and the tide are UNAFFECTED by borders (the tide is
  not a unit).

## 4. Peace

- ▢ **The mechanism** under simultaneous turns:
  (a) standing offers — either seat raises a revocable peace offer; when
      both stand at turn end, peace resolves (rec);
  (b) unilateral white peace after N turns without combat between the pair;
  (c) negotiated deals (cede cities/gold) — not v1.
- ▢ Truce length after peace (no re-declaring the same pair): (rec: 10
  turns, absolute expiry per the timed-effect rule).
- ▢ May a war END any other way (elimination aside)? (rec: no.)

## 5. What war changes, system by system

- Combat vs a real player becomes ILLEGAL at peace and legal at war — the
  one big reversal from today. Refusals are player-plain ("You are not at
  war with the Crimson Banner").
- Trade routes between the two empires: ▢ cancel on declaration (rec) or
  persist-and-pillageable?
- City connections pathing through enemy territory: already refused
  (roads fill skips foreign ground) — no change.
- Capture aftermath: as today (authority cost, courthouse family). ▢ Add
  raze-or-keep on capture in v1? (unlocks Sanctuary's sacking and the
  Wall-Breaker quest) (rec: not v1 — one system at a time.)
- Pillage/plunder: as today; at peace they become illegal against real
  players by the combat rule above.
- ▢ Does anything happen at the WORLD level when war breaks out (a
  triumph, a bead-family hook, the chronicle)? (rec: a toast + the annal;
  content hooks come with the deed decks.)

## 6. War costs

- ▢ War weariness in v1: (a) none (costs are already real: upkeep, losses,
  captured authority) (rec); (b) flat −1 happiness per war from the data;
  (c) a real meter that grows with losses — later.
- ▢ Warmonger reputation / opinions: not v1 (there are no opinions without
  diplomacy AI). Confirm parked.

## 7. Diplomacy beyond war — the v1 cut line

- v1 ships: declare war · peace flow · truce · the border rule · UI below ·
  bot integration below. *(the cut, unless you widen it)*
- ▢ Anything else you want IN v1: open borders? gold-for-peace? a simple
  trade deal? denounce? (rec: none — every one is a fine v1.1.)

## 8. Bots at war

- All bots: handle being declared on (the threat machinery already reacts;
  peace-seeking is the new half).
- ▢ Warmonger declaration policy: declare when army advantage × aggression
  clears a threshold and a target city is in reach (all knobs in
  `data/ai.json`, terms visible in the spectate feed). (rec)
- ▢ Peace-seeking: a warscore (losses vs gains since declaration); offer
  peace below a floor, accept above one. All personas get it; the
  warmonger's floors are just lower. (rec)
- ▢ Do non-warmonger personas EVER declare? (rec: opportunistic declarations
  for wide (land grab) at high advantage; never for tall/zealot in v1.)

## 9. Interface

- ▢ Where does diplomacy live: a Diplomacy screen off the top bar (empire
  list, relation, declare/offer buttons, truce timers) (rec) — or seat
  strip popovers only?
- At-war indicators: seat strip badges, a war toast both sides, the annal.
- Combat refusals name the rule; the declare button carries a confirm.

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
