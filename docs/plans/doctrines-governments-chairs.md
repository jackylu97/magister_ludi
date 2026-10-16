# Doctrines, governments and chairs (proposal)

**Status:** proposal, 2026-10-15. One part is ruled (below); the rest waits for the user. Nothing here is built.

**Ruled, 2026-10-15: typed chairs are option B** (section 4). The user: *"I think B makes sense."* Every card is Military, Economic or Civic, and every government has a mix of the three plus Open chairs. The user then asked how a card should show all three things it now carries, before ruling on the other questions: *"How should we display the cards? Right now they're colored based on deck type, ideally we have some design that incorporates the deck affinity, chair type, and rarity. Please do a couple design proposals (remembering, we're going for an occult, tarot inspired card design). I'll take a look at your proposals and respond to your ruling questions after"*. The three proposals are on the canvas at https://claude.ai/artifact/B6Nyi6ZKCjHtXcSZTNrDoB (private to the user), with their source in `docs/plans/mockups/card-faces/`: A · Suits (`Main.dc.html`), B · The Great Work (`Alchemy.dc.html`) and C · Niches (`Niches.dc.html`).

The user, verbatim:

> *"i miss doctrines. We should have permanent, strong bonuses in the game. Could we create 3 candidates for each tier in the dominion tree based around our builds? They should be somewhat game-warping like before. I think we also need to rework the government abilities, either change them up or remove them entirely, what do you think? How could we create better differentiation between the government types? I somewhat miss the dynamic of having different types of chairs (military, economic, wildcard), do you have any ideas about how that could be implemented?"*

Background: the decks rework (D1a, `docs/plans/decks-rework.md`) retired all 48 Doctrines, replaced them with reward hands (an extra hand of rare Orders at drafts 4, 18, 29 and 38), and made every chair a wildcard. `docs/decks/deck-design.md` (2026-10-13) left *"Doctrines and government effects need a rework, to be taken up later."*

## 1. The recommendation in one view

Give each layer one job:

| Layer | Its job | How long it lasts | Where it sits |
|---|---|---|---|
| **Orders** | the pieces of a build | until replaced | a chair |
| **Doctrines** | the direction of the empire: strong, permanent, often with a drawback | the whole game | no chair |
| **Governments** | the shape of the council: which chairs you have, and one rule about how they work | until the next government | — |

Today the governments mostly hand out small flat yields, which is the same job the Orders do, only weaker. Once Doctrines return as the strong permanent layer, a government that is also a bonus has no job of its own. Giving governments the chairs, and nothing else, makes the choice of government a choice about which of your two decks can lead.

## 2. Doctrines

### When a Doctrine is offered

**Recommended:** one Doctrine per band, offered as the band opens: Tier 0 with the first draft, then at drafts 4, 18, 29 and 38. The Doctrine offers take the place of the reward hands at those four draft counts.
- **The offer** shows three of the seat's candidates for that tier, drawn from both of its decks. A seat with Dominion and a partner deck has six candidates per tier, three from each deck, so it sees a different three each game and cannot force a particular Doctrine.
- **No chair, never lost.** A Doctrine is held for the whole game. The government does not change it.
- **Pass:** allowed. A pass is also a choice: no drawback, no bonus.

Other ways it could work:
- **Beside the reward hands,** not instead of them. That gives more strong picks per game, and the reward hands keep feeding rare Orders.
- **On adopting a government,** as before the rework. That ties Doctrines to governments, but governments are offered at tier 10 as well, which no band opens at.

### Dominion's candidates: three per tier

The text of each card is written for the deck sheet's voice. Each one changes how the empire plays, and most pay for it with a drawback, as the old Doctrines did (Blitz: units that kill may move again, but cannot fortify). Each tier's three serve three different builds. Over the five tiers, the drilled legions, the steppe raiders and the conqueror get four each, and the endless host gets three.

**Tier 0** (offered with the first draft)

| Doctrine | Build | Text | What it does to a game |
|---|---|---|---|
| **The Agoge** | drilled legions | Your units earn twice the experience. Your towns grow 20% more slowly. | Sparta's training. Ranks arrive early (barbarian fights still stop at Veteran), and the empire stays small. |
| **The Comitatus** | endless host | When one of your units dies, your nearest town gains production equal to half its cost. Your units cannot fortify. | The war band sworn to die with its lord. A loss becomes half of the next unit, so throwing units at camps is cheap; the host never digs in. |
| **The Grass Sea** | steppe raiders | Your mounted units cross every land hex as if it were open ground. Your borders grow half as fast. | The steppe. Riders reach anything, and the empire claims little land of its own. |

**Tier I** (draft 4)

| Doctrine | Build | Text | What it does to a game |
|---|---|---|---|
| **The Marian Reforms** | drilled legions | Your military units cost no upkeep. You may hold at most two military units for each town. | A paid professional army. Small and free; the cap is the warp. |
| **Conscription** | endless host | Military units cost a citizen of the town that raises them instead of production. | Every unit is a levy. Production goes to buildings, citizens become soldiers, and every card that reads levied units (The Feudal Obligation, The Legions' Labour) reads the whole army. |
| **The Soldiers' Share** | conqueror | Capturing a town fully heals every unit of yours within three hexes and raises each by one rank. Towns you capture stay in unrest twice as long. | Booty for the army. Every capture sends the army on stronger, and holding what it took is harder. |

**Tier II** (draft 18)

| Doctrine | Build | Text | What it does to a game |
|---|---|---|---|
| **Centurions** | drilled legions | Each Elite unit gives +3 strength to your units beside it. Units with no rank cannot attack. | Officers raised from the ranks. Recruits defend until they are blooded, so every army is built around its Elites. |
| **The Plunder Economy** | steppe raiders | Pillaging a hex pays ten turns of its yield at once, to your nearest town. Your own buildings cost 25% more. | Raiders live on what others built, and build little themselves. |
| **The Universal Monarchy** | conqueror | Towns you capture cost no authority. Towns you found cost twice as much. | Width comes only by conquest. A seat holding it has no use for The Proconsuls. |

**Tier III** (draft 29)

| Doctrine | Build | Text | What it does to a game |
|---|---|---|---|
| **Total Mobilisation** | endless host | While at war, each town of six or more citizens raises the best melee unit you can build every five turns, for a citizen. While at peace, your towns grow 25% faster. | The towns grow at peace and march at war, without being asked. |
| **The Tribute of Nations** | steppe raiders | An empire you pillaged in your last war with it pays you a tenth of its gold and culture every turn of the peace that follows. You cannot declare war on an empire that pays you. | Raid once, then live on tribute. It rewards a peace kept, which also answers Danegeld's risk of war-and-peace cycling. |
| **Terror** | conqueror | Capturing a town throws every rival town within five hexes into unrest. An empire you take a town from will not make peace with you for twenty turns. | Assyria. One capture stops the province around it, and the war cannot be ended early. |

**Tier IV** (draft 38)

| Doctrine | Build | Text | What it does to a game |
|---|---|---|---|
| **The Fortress Empire** | drilled legions | An Elite unit garrisoned in one of your towns cannot be killed, so that town cannot be taken. Your units cannot attack outside your territory. | Build the Magnum Opus behind walls nobody can take, and fight nowhere else. |
| **The Scourge of God** | steppe raiders | Improvements you pillage can never be rebuilt. Towns you capture are razed. | Attila. A rival's land, above all around its Opus town, is ruined for good. |
| **Clementia** | conqueror | A rival town that has been in unrest beside your territory for three turns joins you without a fight. | Caesar's clemency. Unrest (Terror, The Harrying, The Soldiers' Share) wins towns without a siege. |

### What they need

They lean on the shape families the user approved for the builds (ranks and experience, pacification and unrest, "this game" counts, the end of a war), so most need no family of their own:
- **Ranks:** an experience multiplier (The Agoge), a rank granted on an event (The Soldiers' Share), a rank test for a strength aura and an attack ban (Centurions), an Elite garrison that cannot die (The Fortress Empire).
- **Unrest:** unrest thrown by an event (Terror, shared with The Harrying), longer unrest (The Soldiers' Share), a town that changes hands from unrest (Clementia).
- **The end of a war:** the record of what a war took, shared with Danegeld and War Reparations (The Tribute of Nations), plus a tribute and a bar on declaring war.
- **New rules of their own:** an army cap (The Marian Reforms), units paid in citizens (Conscription), a movement rule (The Grass Sea), a pillage paid from the hex's yield (The Plunder Economy), improvements that cannot be rebuilt and forced razing (The Scourge of God), war mobilisation (Total Mobilisation).
- **Existing shapes:** growth, border and authority percentages, upkeep rebates, production costs.
- A Doctrine is a card row read by the same evaluator, as the old ones were. The 48 retired rows stay for saves.

The other five decks would need their own fifteen once Dominion's direction is settled.

## 3. Governments

### What they do today

- Sixteen governments: the Chiefdom, then three at each of tiers 4, 10, 18, 29 and 38. Each tier has a martial, a civic and a sacred one (for example War Chief, Council of Elders and Priest-King).
- Since the decks rework every government at a tier has the same number of chairs, so the only difference between the three is the signature ability. Most of these are small flat yields (+3 happiness, +2 faith in every city, +4 strength).
- **The tier-18 three are broken by the wildcard chairs.** No card carries a chair type any more, so:
  - Merchant League's "+2 gold for each economic Order" pays nothing;
  - Imperium's "+1 production for each military Order" pays nothing;
  - Divine Mandate's "+1 faith and +1 culture for each wildcard Order" pays for every seated card, about +8 of each at that rung, which makes it much the strongest of the three.

### Options

1. **Remove the abilities.** Governments become the chair ladder and nothing more. Simple, but adopting a government stops being a choice.
2. **Keep them as yields and rebalance.** Cheap, but it keeps the overlap with Orders and Doctrines, and the choice stays a small number.
3. **Recommended: change them into the shape of the council.** A government is its chair mix (section 4) plus **one rule about its council**. It says nothing about yields. The three governments at each tier keep their lines:
   - **martial:** more Military chairs, and a war rule;
   - **mercantile:** more Economic chairs, and a rule about gold or the draft;
   - **civic or sacred:** more Civic chairs, and a rule about culture, faith or the draft.

   Examples of council rules, one per government:
   - **The war chair** (War Chief, Imperium): one Military chair makes the card in it 50% stronger.
   - **No seals** (Council of Elders, Republic): cards may be moved between chairs freely.
   - **A wider hand** (Merchant League): every hand shows one more card.
   - **Faith rerolls** (Priest-King, Theocracy): asking for a fresh hand costs half, paid in faith.
   - **The long oath** (Tyranny): seals last twice as long, and the council has one more chair.
   - **A wider Doctrine offer** (The Curia, The Magisterium): Doctrine offers show one more candidate.

## 4. Typed chairs

The old dynamic: Orders were military, economic or neither, and each government had its own mix of Military, Economic and Wildcard chairs (War Chief had 3 / 1 / 1, Council of Elders 0 / 2 / 3). A military card fitted a Military or a Wildcard chair, an economic card an Economic or a Wildcard chair, and any other card only a Wildcard chair. The code for this is still in the game (`orderFitsSlot`, the slot-order contract, `SLOT_WORDS`), and so are the old mixes on every government row; only `slotLayout` now returns all wildcards.

### Four ways to bring it back

- **A. The old three, revived.** Every card is military, economic or neither; governments keep their old mixes, cut to the new chair counts.
  - For: the cheapest, since most of the code exists. It is what the user remembers.
  - Against: science, culture and faith cards (most of Devotion, Scientific and Magisterial) would all compete for the Wildcard chairs.
- **B. Three types plus Open (recommended).** Every card is **Military**, **Economic** or **Civic**, by what it mainly does:
  - Military: combat, units, war;
  - Economic: food, production, gold, land, growth;
  - Civic: science, culture, faith, happiness, authority, great people.

  Every government has a mix of the three plus some **Open** chairs that take anything. Every deck leans one way but has cards of each type. A Dominion seat under a civic government seats Dominion's science and culture cards (Honours of the Legion, The Veterans' Roll), so the government steers which half of the seat's two decks leads.
  - For: six decks pay three kinds of thing, and each kind gets a home.
  - Against: every card needs a type. That means a column on each deck sheet and a sync test, a third chair type in the code, and a save format change.
- **C. Signature chairs.** Chairs stay open, but each government has one or two named chairs with a property: the war chair, an unsealed chair, an altar whose card also pays faith.
  - For: no card typing at all. It moves each government's ability into something the player plays around.
  - Against: it gives less of a seating puzzle than A or B.
- **D. Old-guard chairs.** Each government has one or two chairs that take only cards from an earlier band.
  - For: it gives every build's carried scaler (The Veterans' Roll, Spear-won Land) a home, and makes "only the current band is dealt" a puzzle rather than a loss. No typing needed.
  - Against: it is a less familiar idea, and less flavourful than military and economic.

**Recommendation:** B for the chair mix, with C as each government's one rule. A government is then "three Military chairs, one Economic, one Open, and the war chair". The choice between the martial, mercantile and civic government at each tier becomes a choice about which deck leads and how the council plays, which is the differentiation that is missing today.

**Risks, and what limits them:**
- **A card with no chair it fits** (the classic dead draw). Limited by Open chairs on every government, by showing each card's type in the hand, and by the fact that adopting a government re-seats everything.
- **A seat that leans hard into one type,** for example a Dominion seat with mostly Military cards under a mercantile government. That is the decision working as intended, as long as every tier offers a martial government.
- **Bots** must seat by type again; they did before the rework.

## 5. Questions for the user

1. **When Doctrines are offered:** as each band opens, in place of the reward hands (recommended); beside the reward hands; or on adopting a government, as before?
2. **The fifteen Dominion candidates:** which to keep or change? Are the drawbacks the right size?
3. **Governments:** remove the flat abilities, and make each one a chair mix plus one council rule (recommended)? Or remove the abilities with nothing in their place, or rebalance them as yields?
4. **Typed chairs:** A (the old three), B (three types plus Open, recommended), C (signature chairs only) or D (old-guard chairs)? B, C and D can also be combined.
