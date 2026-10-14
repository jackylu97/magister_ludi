# Diplomacy design prototype

Review route: `/flair.html?review=diplomacy`.

Original review route: **isolated prototype**, requested September 15, 2026.
The approved integration is now in the main game (see below). This original
route still imports only its own styles and fixture module; it runs no simulation. All quantities, treasury
values, dates and responses on this page are sample data.

## Towns in peace terms — review addition

User direction: towns may be added to deals **only while at war**. The prototype
shows both empires’ towns in the peace composer, with multiple selection,
population, and a clear permanent-transfer warning. Seats of government remain
unavailable, matching the existing game reader. Peace negotiations can combine
towns, luxuries and gold; an empty offer requests peace without concessions.
Changing courts or resetting clears the town draft. Sample peace responses stay
scripted refusals, so no town changes hands in this prototype.

## What to review

- A compact list of known courts, with paired heraldic colors and explicit
  peace/war states. No invented approval score, relationship meter, or military
  intelligence.
- One selected audience. Leader dialogue occupies a short passage above the
  negotiation rather than competing with every treaty and inventory row.
- Your stock and their stock side by side. Each shows distinct kinds, total
  copies, and per-resource copies held. “1 spare” means one can be offered while
  retaining another; “Last copy” warns about losing access. A selected row offers
  **one copy**, never the whole holding.
- A separate offer summary: **You give / You receive**, duration, then a primary
  proposal action and a secondary counteroffer question. Desktop places it
  beside the inventories; narrower layouts stack it below.
- Agreements have their own view with quantities, signing turn and expiry.
  Signing the sample offer updates the sample copy counts and agreement list.
- “Preview war alert” opens an interrupting declaration with the aggressor's
  name and immediate consequences. Acknowledging it leaves a persistent notice
  and war status in the roster. “Review diplomacy” selects that court. It has
  no timeout, and never implies a declaration can be declined.
- Declaring war yourself has a separate confirmation, default focus on keeping
  the peace. Incoming declarations require acknowledgment, not confirmation.

## Dialogue direction

Separate personality from facts. One short voiced sentence, followed by one
plain explanation telling the player what changed or how to revise the offer.
Avoid fabricated grudges or intentions unsupported by game state.

| Situation | Voiced sentence | Explanation |
| --- | --- | --- |
| Opening | “There is room for both our ambitions. Let us begin with trade.” | Choose a luxury on either side to add one copy to the offer. |
| Last-copy refusal | “I will not part with our last pearls. Ask for something we can spare.” | Mithridates VI has only 1 copy of Pearls. Choose another luxury or ask for a counteroffer. |
| Insufficient offer | “You ask more than you offer. Bring me something I can use.” | Your offer does not cover what you are asking for. Add something to the offer, or ask for revised terms. |
| Counteroffer | “Your cotton for our silk. Would that suit you?” | The proposed terms are on the table. You can edit them before agreeing. |
| Accepted | “A fair exchange. My merchants will see it done.” | Agreed: 1 Cotton for 1 Silk. Review the terms in Agreements. |
| Peace refused | “Not yet. I am not ready to end this war.” | Peace declined. You remain at war; your draft is kept below. |
| Incoming war | “The time for bargaining is over.” | **Mithridates VI has declared war on you.** Hostilities begin immediately. Units already inside your borders can attack. |

These are authored sample responses, not a replacement evaluator. The prototype
exercises luxury exchanges, lump-sum gold and editable peace offers with towns.
Peace responses are scripted refusals; submitted town terms remain in the draft. It does
not implement every valid deal or price trades like the production AI.

## Integration seams after approval

1. Extend `DealChoice` / `dealSide` in `src/ui/diplomacyScreen.ts` with explicit
   copy counts. The existing reader already calls `resourceCopies`, but only
   exposes a `spare` note. Preserve its handling of copies committed elsewhere.
   Distinguish net access from exportable copies if the underlying reader does.
2. Keep `metDiplomacyRows`, `dealPanel`, command error readers and the modal
   shell. Restyle their results rather than maintaining a second rules model.
3. Replace raw `EnvoyAnswer.sentence` AI summaries with structured outcomes
   and reason data at the audience adapter. Author voice variants for acceptance,
   last-copy refusal, poor terms, invalid terms and peace outcomes; interpolate
   actual resource names. Keep debugging scores out of the leader's dialogue.
4. At the real incoming-war event, queue an urgent notification for the affected
   local player. It must survive another open menu, route to a usable war view,
   and leave a history entry after acknowledgment. Coalesce duplicate event
   delivery, not separate attackers. Loading an existing war must restore its
   status without replaying an old declaration as new. Preserve the ordinary
   met-seat notification policy for declarations between other empires.
5. Feed the consequence list from actual canceled deals/routes; do not claim
   specific losses when none existed. Continue to state that attacks are legal
   immediately and that peace is negotiated.
6. Carry over production open borders, recurring gold, truce
   countdowns, pending proposals, withdrawals and peace terms. Wire the prototype’s wartime town choices to the existing city-term reader
   and validation, including its seat-of-government restriction. Other terms are outside
   this fixture's interaction scope, not proposed removals.
7. Use production heraldry and leader names; the colored seals here illustrate
   the visual hierarchy. All sample counts and fixed dates must disappear.

## Review controls

**Reset** restores the opening Cotton-for-Silk offer. **Try a refusal** asks for
the court's last Pearls. **What would you agree to?** substitutes a sample spare
exchange. **Propose exchange** signs it locally; **Agreements** shows the result.
**Preview war alert** demonstrates the declaration and retained war notice.
Reloading discards all prototype interactions.

**Try peace terms** opens the town composer directly; its link is
`/flair.html?review=diplomacy&scenario=peace`. Towns are hidden at peace.
Choose multiple towns on either side, optionally add gold/luxuries, then
**Propose peace**. The sample refusal keeps the draft and transfers nothing.

Validation: browser checks cover multiple town selection, deselection, the
seat-of-government restriction, clearing/switching courts, mixed gold/luxury
terms, and the absence of town choices in peacetime.

## Approved main-game integration

User approved integration as a modal on September 15, 2026. Retain the existing
`createModalShell` lifecycle and all command-backed deal/peace controls. Move the
approved court roster, voiced audience, side-by-side inventories and offer rail
onto those readers. Preserve pending agreements, recurring gold, open borders,
truce and peace withdrawal/acceptance; town choices remain wartime-only with the
seat-of-government restriction. Display actual luxury copies and population.
Incoming declarations against the local player receive a queued urgent dispatch
in addition to the existing chronicle entry, with a route to the relevant court.
Only fresh command reports enqueue alerts; loading a save must not replay wars.

### Incoming proposals beside End Turn

User requested a nonblocking pending-deal notification on September 15, 2026.
Place an envelope and offer count directly above End Turn. A single incoming
proposal opens that court's proposed terms; multiple proposals open a compact
chooser. Include incoming peace offers, but exclude the local player's outgoing
papers. Read the current state so accepting, declining, withdrawal, loading and
seat changes cannot leave stale badges. Never add offers to turn blockers, move
focus automatically, or interrupt the player with this indicator. Reserve HUD
space above the button while it is visible.

Integration validation: typecheck and production build pass; core suite passes
6,834 tests across 259 files. Browser checks exercised the production modal's
close/Escape behavior, nested war confirmation, real luxury exchange and refusal,
wartime town choices and retained peace draft, incoming war dispatch, and the
pending-offer button opening/accepting/declining actual proposals. The review
fixture is `/flair.html?review=diplomacy-game`; the playable path is `/`.
