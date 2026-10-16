# Doctrines, governments and chairs (proposal)

**Status:** ruled on 2026-10-15 and 2026-10-16, apart from the open points below. Nothing here is built.

**Ruled, 2026-10-16: the user's third pass,** verbatim: *"lets revert chiefdom yeah. question answers: #1 the smaller reading, it should only affect orders. #2 yes #3 i remember now, tier 5 was meant for an age 5 that hasn't been implemented, just leave the last tier as unimplemented #4 lets have it count civic orders. Interior lines can be the same buff as the tech tree buff (50%) and keep the five citizen minimum town size."* The numbers answer the four questions in the reply before it: Double Time's yields, Wildcard cards, tier 10's Doctrines and Divine Mandate's count. So:
- **The Chiefdom** goes back to its old mix: one Military, one Economic and one Wildcard chair (section 4).
- **Double Time** repeats only what Orders do. An Order's effects that happen at the end of a turn or every few turns trigger twice, with any yields those effects pay. The empire's yields, and the yield lines cards add to towns every turn, are not doubled.
- **A Wildcard card fits only a Wildcard chair,** as the sort on the sheet assumed.
- **The fifth government tier was meant for a fifth age,** which the game does not have, and is left unimplemented. The tier-38 governments (The Empire, The Commonwealth and The Magisterium) get no chair mix. They are live today, offered from draft 38 with their old chairs and signatures, so the build that brings typed chairs retires them: their rows stay for saves, and nobody is offered them. The Commonwealth's great people bought with gold goes with it. Card Tier IV stays where it is: it opens at draft 38 (`docs/flags.md` (uuuuuu)), and its band already asks for the fourth age, "since there is no fifth age" (`docs/orders-and-doctrines.md`).
- **Doctrine tiers pair one to one with the four government tiers left** (read from #3, to confirm): tier 4 offers the Tier I Doctrines, tier 10 Tier II, tier 18 Tier III and tier 29 Tier IV. That is how they were paired before the decks rework, when each government tier had its own Doctrine pool (tiers 4, 10, 18, 29 and 45, commit `3ed74e82`), which is what "as before" in the ruling of 2026-10-15 asked for. It answers tier 10, and no Doctrine waits for a fifth age. Each Doctrine now arrives one card tier earlier than the sheet table it sits in: Tier II's at draft 10, while Tier I cards are still dealt. The other reading pairs by draft count, as the sheets did until now: tiers 4 and 10 both offer Tier I, and Tier IV's Doctrines wait for a fifth age with their governments.
- **Divine Mandate counts Civic Orders:** "+1 faith and +1 culture in your capital for each Civic Order you have in a slot". Its three Civic chairs and two Wildcard chairs hold at most five, the same cap as Imperium's and the Merchant League's counts.
- **Interior Lines** takes Machinery's road rule at Machinery's size: a step along a road costs 40% less movement. The user wrote 50%, but Machinery's discount is 40% (`data/techs.json`). Road discounts add up before the price is taken (`pathfind.ts`, where the move profile's road step is set), so with both a road step costs a fifteenth of a move instead of a fifth, and a unit covers three times the road it does under Machinery alone.
- **The merged levy keeps The Call to the Spear's floor:** only towns of at least five citizens may muster. The built The Muster of the Fields has no floor, so the shared card changes a built card.
- **Still open:**
  - The Doctrine pairing above.
  - How the Doctrine offer mixes the two decks. The reward hands dealt one card from each deck and a third from both, and the same rule would suit the offer.
  - The other five decks' Doctrines and card types.
  - Combined Arms' new clause and the three endless host Doctrines (section 2), proposed and not yet ruled on.
  - The other questions on the Dominion sheet.

**Ruled, 2026-10-16: the user's second pass,** verbatim: *"wait why are there 5 tiers, was that changed recently? what is the serried ranks, we can make it a rare. Lets change the second clause of combined arms. #3 is intentional. marian reforms should reflect your description, towns build military units at half speed. could you add a few endless host doctrines? lets have double time be offered in both tier 2 and tier 3 as a rare, is that possible? new governments should stop giving rare reward hands, just the doctrine selection. Please go ahead and assign chair mixes for all governments, and please sort the dominion deck into military,economic,civic and wildcard"*. The answers the user wrote on the Dominion sheet the same day are listed there, under "Open for your pass". So:
- **No reward hands.** A new government brings only its Doctrine offer. The reward hands were banked at the ladder's rungs (drafts 4, 18, 29 and 38), the same draft counts at which new governments come on offer, so this removes them: `REWARD_DRAFTS`, `PlayerStatecraft.rewardHands`, `openRewardHandAt`, the reward commands and `src/ui/rewardSheet.ts` go. That is a save-format change.
- **Drawbacks that a pair of Doctrines cancels are intended** (*"#3 is intentional"*): The Marian Reforms makes Centurions' extra upkeep free, and The Soldiers' Share makes The Universal Monarchy's founding cost moot. That is the reward for committing to a build.
- **The Marian Reforms:** towns build military units at half speed, instead of the units costing twice as much. Buying is unaffected, because the price is read from the full cost. The halving should apply after the military production cards: they are city-stage `productionBonus` lines, so the halving belongs at the empire stage of Entry XVII. They then soften it without cancelling it: with The Standing Army and War Foundries (+68%), a town builds military units at 84% of its usual speed.
- **Double Time** is rare and dealt in Tiers II and III. Today a card row has one tier, and `eligibleFor` (`src/sim/statecraft/draft.ts`) deals a row only in the seat's current band. One optional field on the row, its last tier, makes this work, with one line in the deal, the Compendium's printed tier and the sheet test. A held card is not dealt again, so taking it in Tier II spends it.
- **The Serried Ranks** is rare. **Combined Arms** gets a new second clause, proposed on the sheet.
- **The endless host** gets three Doctrines, in section 2.
- **Chair mixes and card types** are assigned in section 4, and every Dominion card is sorted on its sheet.
- **Still open** after this pass: answered or carried forward in the third pass above. The list as it stood:
  - **Tier 10.** There have been five government tiers since 2026-08-28 (commit `3ed74e82`, from the user's master list, which put governments IV and V at 29 and 45; the last rung moved to 38 on 2026-10-15). The card tiers came later, with the decks rework, and open at four of those five rungs. Tier 10 is the only government rung with no card tier, and its governments have the same five chairs as tier 4. Options: deal the Tier I Doctrines again (recommended: Dominion has five there, so a second pick has room), give tier 10 its own set, offer none at tier 10, or drop the rung.
  - **Wildcard cards fit only Wildcard chairs.** This is the reading the sort uses, as in Civilization VI, where purple cards fit only purple slots. To confirm.
  - **Divine Mandate** pays for each seated "wildcard Order". The count reads the card's own type (`slottedOrdersOfSlot`), and before the rework the untyped cards were the science, culture and faith ones, which are Civic now. Recommended: count Civic Orders, or the ability pays only for the few Wildcard cards.
  - **How the offer mixes the two decks.** The reward hands dealt one card from each deck, then a third from both. The same rule would suit the Doctrine offer.
  - **The other five decks' Doctrines and card types.**
  - The questions on the Dominion sheet, among them Double Time's yields and Combined Arms' new clause.

**Ruled, 2026-10-15: the user's answers to section 5,** verbatim: *"doctrines offered with the government, as before. Show a combination of the two deck's doctrines. #2 answered with the doc. #3 governments are like they were before, just with an extra civics category"*. So:
- **When Doctrines are offered:** on adopting a government, as before the decks rework. The offer holds Doctrines of the government's tier, drawn from both of the seat's decks. Before the rework this was `drawDoctrineOffer` (`src/sim/statecraft/draft.ts`): a Doctrine already held is not offered again, and the offer's size is `offerSize`'s. The reward hands are not replaced and stay as they are.
- **Which Doctrines:** Dominion's are the thirteen on its sheet, `docs/decks/dominion.md`, which replaces the fifteen candidates in section 2. The user kept and rewrote eight (The Marian Reforms, The Soldiers' Share, Centurions, The Plunder Economy, The Universal Monarchy, now at Tier III, Total Mobilisation, The Fortress Empire and The Scourge of God), dropped seven (all three at Tier 0, Conscription, The Tribute of Nations, Terror and Clementia), and added five (The Steppe Confederacy, The Consular Roads, The Strategoi, Combined Arms and The Landsturm). There are no Tier 0 Doctrines.
- **Governments:** as before, with Civic added as a chair type. Each government has its own mix of Military, Economic, Civic and Wildcard chairs, as it had of Military, Economic and Wildcard before the rework, and keeps its signature ability. Section 3's option of replacing the abilities with council rules is not taken.
- **Still open:** see the third pass of 2026-10-16 above. The reward hands named here were removed that day.

**Ruled, 2026-10-15: typed chairs are option B** (section 4). The user: *"I think B makes sense."* Every card is Military, Economic or Civic, and every government has a mix of the three plus Open chairs. The user then asked how a card should show all three things it now carries, before ruling on the other questions: *"How should we display the cards? Right now they're colored based on deck type, ideally we have some design that incorporates the deck affinity, chair type, and rarity. Please do a couple design proposals (remembering, we're going for an occult, tarot inspired card design). I'll take a look at your proposals and respond to your ruling questions after"*. The three proposals are on the canvas at https://claude.ai/artifact/B6Nyi6ZKCjHtXcSZTNrDoB (private to the user), with their source in `docs/plans/mockups/card-faces/`: A · Suits (`Main.dc.html`), B · The Great Work (`Alchemy.dc.html`) and C · Niches (`Niches.dc.html`).

**The user on the card faces, 2026-10-15:** *"i like A and C. Could we try a version of A where the suit corresponds to deck type and colour corresponds to military/economic/civic/wild. Could we do C with some other sillouettes? It's reading too middle eastern currently."* A second round adds three boards: A with one suit per deck and one colour per chair type, and C with two other silhouette sets (banner tails and corner cuts) in place of the arches.

**On round two, 2026-10-15:** *"A2 is great. I was about to mention the rare frame yellow too, could we make the ornamentation for rare an entirely separate color, lets try black? Let's rename the open to 'wildcard' and have it be purple. Also, it feels kind of superfluous to have the icon in the center and the corners. The three pips for salt tithes feels a bit awkward, it can just be one big coin."* The direction is A2: the suit shows the deck, and the colour shows the chair type. The changes go on a new board, A3:
- the rare ornament is black, not gilt;
- Open chairs are called **Wildcard** and drawn in purple;
- one large suit symbol in the centre, with no corner indexes;
- a common card shows its suit once, not as pips.

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

**Ruled, 2026-10-15:** on adopting a government, the last option below, with the offer drawn from both decks (see the top of this file). The recommendation that follows was not taken.

**Recommended:** one Doctrine per band, offered as the band opens: Tier 0 with the first draft, then at drafts 4, 18, 29 and 38. The Doctrine offers take the place of the reward hands at those four draft counts.
- **The offer** shows three of the seat's candidates for that tier, drawn from both of its decks. A seat with Dominion and a partner deck has six candidates per tier, three from each deck, so it sees a different three each game and cannot force a particular Doctrine.
- **No chair, never lost.** A Doctrine is held for the whole game. The government does not change it.
- **Pass:** allowed. A pass is also a choice: no drawback, no bonus.

Other ways it could work:
- **Beside the reward hands,** not instead of them. That gives more strong picks per game, and the reward hands keep feeding rare Orders.
- **On adopting a government,** as before the rework. That ties Doctrines to governments, but governments are offered at tier 10 as well, which no band opens at.

### The endless host's Doctrines (proposal, 2026-10-16)

The endless host had no Doctrine before Tier III, and the user asked for more (*"could you add a few endless host doctrines?"*). Three are on the sheet, `docs/decks/dominion.md`. Each does something no card does, and each pays for it, as the user's Doctrines do.

| Doctrine | Tier | Text | What it does to a game |
|---|---|---|---|
| **The Servian Reforms** | I | Your military units are 25% cheaper to build and to buy. Your units never gain experience. | Rome's citizen levy, armed by census class, which the Marian Reforms replaced. Offered beside The Marian Reforms, it is the choice Rome made: many cheap soldiers or a few professionals. Every unit is cheaper, which feeds The Gathering Host, The Art of War and Muster Rites. The cost is the drilled legions' engine: no unit earns a rank by fighting or drilling. Ranks that cards grant still come (The Drill Masters, The Mural Crown). |
| **Weight of Numbers** | II | Your units gain +3 strength for each attack your units have already made on the same target this turn, at most +12. Your units cannot fortify. | Numbers win fights. The first wave wears a wall or a line down, and every later wave hits harder, so throwing five units at one target is a plan rather than a waste. Songs of the Fallen, The Funeral Games and Valhalla pay for the units the first waves lose. The host never digs in, which costs it The Fortress Empire, The Castra and The Farming Garrisons. |
| **The Laws of Lord Shang** | II | While a town builds a military unit, its surplus food goes into the unit instead of into growth. | The Qin reform that rewarded only farming and fighting. Grain becomes soldiers: every food card on the sheet (Martial Law, The Grain Tribute, Muster Rites, Stockpiles, Walled Towns, The Cattle Raid) becomes military production while a town trains. The cost is growth, and the levies need big towns, so a player alternates growing and training. |

- **Sizes:**
  - The Servian Reforms' 25% off is worth about +33% production toward every unit, in every town, and the same off every purchase. War Foundries gives +38%, but only in towns with a Barracks.
  - Weight of Numbers' fifth attack on one target hits at +12, against Total War's +5 on every attack at Tier III (the user's revision of 2026-10-16).
  - The Laws of Lord Shang adds a town's food surplus, often 5 to 10 at Tier II, to the unit it is training.
- **Shapes:**
  - The Servian Reforms: a cost line on a unit class, and the experience multiplier of the ranks family set to zero.
  - Weight of Numbers: a count of attacks made on a target this turn, read by a combat line, and a rule that bars fortifying.
  - The Laws of Lord Shang: surplus food moved into production toward a unit, a new transfer between channels.
- **Coverage after these:** drilled legions 4, conqueror 4, endless host 5, steppe raiders 3.

### Dominion's candidates: three per tier

**Superseded, 2026-10-15:** the user's list on `docs/decks/dominion.md` replaces these. They are kept here as the first draft, with the notes on what each does to a game.

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

**Ruled, 2026-10-15:** governments stay as they were before the decks rework, with Civic added as a chair type, and keep their signature abilities (see the top of this file). None of the options below was taken as written.

### What they do today

- Sixteen governments: the Chiefdom, then three at each of tiers 4, 10, 18, 29 and 38 (the three at 38 are left for a fifth age, ruled 2026-10-16). Each tier has a martial, a civic and a sacred one (for example War Chief, Council of Elders and Priest-King).
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

### Assigned, 2026-10-16: the four card types, and every government's chairs

The user asked for both (*"Please go ahead and assign chair mixes for all governments, and please sort the dominion deck into military,economic,civic and wildcard"*). Both are proposals for the user's review. The Chiefdom's mix, the Wildcard rule, Divine Mandate's count and the tier-38 governments were ruled on 2026-10-16 (the third pass, at the top of this file).

**Card types.** Every card is Military, Economic, Civic or Wildcard. A card fits a chair of its own type or a Wildcard chair, and a Wildcard card fits only a Wildcard chair (confirmed by the user, 2026-10-16). The rules used to sort Dominion, which the other five decks can follow:
- A card is typed by what it pays or does, not by what it reads. Songs of the Fallen reads kills but pays science and culture, so it is Civic. Sword and Plough reads garrisons but pays mostly production, so it is Economic.
- **Military:** combat strength, movement and unit rules; ranks and experience; units gained (levies, free units, and production toward units, as Civilization VI's Agoge is a military policy); unit upkeep.
- **Economic:** food, production, gold, land and growth.
- **Civic:** science, culture, faith, happiness, authority, unrest and pacification, war weariness, renown and great people.
- **Wildcard:** commissions, whose chair is lent to a goal and empties when the goal is met, and cards that act on other cards (Double Time, Vae Victis, The New Code).
- **A mixed card** takes the type of the half that pays more. When the halves are even and one is Civic, the card is Civic: those are the cards a civic government is for, and they are a military deck's road to science and culture.
- A card that is never seated (a charter, an on-draft grant) still has a type, for its face. A shared card has the same type on both sheets.

**Dominion, sorted** (`docs/decks/dominion.md`): 50 Military, 26 Economic, 41 Civic and 9 Wildcard, and 10, 7, 7 and 1 of the 25 shared cards. Tier I is even (7, 8 and 8). Tier III had 21 Military cards of 29 and 2 Economic; after the user's pass of 2026-10-16 it has 12 Military, 2 Economic and 10 Civic of 25, so a Dominion seat under an economic government still leans on its partner deck for Economic cards there.

**The chairs:**

| Tier | Government | Leads | Military | Economic | Civic | Wildcard | Chairs |
|---|---|---|---|---|---|---|---|
| 0 | Chiefdom | — | 1 | 1 | 0 | 1 | 3 |
| 4 | War Chief | Military | 2 | 1 | 1 | 1 | 5 |
| 4 | Council of Elders | Economic | 1 | 2 | 1 | 1 | 5 |
| 4 | Priest-King | Civic | 1 | 1 | 2 | 1 | 5 |
| 10 | Tyranny | Military | 3 | 1 | 0 | 1 | 5 |
| 10 | Republic | Economic | 0 | 3 | 1 | 1 | 5 |
| 10 | Theocracy | Civic | 1 | 0 | 3 | 1 | 5 |
| 18 | Imperium | Military | 3 | 2 | 1 | 2 | 8 |
| 18 | Merchant League | Economic | 1 | 3 | 2 | 2 | 8 |
| 18 | Divine Mandate | Civic | 2 | 1 | 3 | 2 | 8 |
| 29 | The Sultanate | Military | 4 | 2 | 2 | 3 | 11 |
| 29 | The Estates | Economic | 2 | 4 | 2 | 3 | 11 |
| 29 | The Curia | Civic | 2 | 2 | 4 | 3 | 11 |

The tier-38 governments are left for a fifth age (ruled 2026-10-16) and get no mix.

How it was set:
- **One government per type at every tier.** The martial governments lead Military, as before. The Council of Elders, the Republic and the Estates keep the economic lead of their old mixes. The sacred and learned governments (Priest-King, Theocracy, Divine Mandate and the Curia) lead Civic, the new home of the faith, science and culture cards that used to fill their Wildcard chairs.
- **A rung that adds chairs gives a broad council, and a rung that adds none gives a specialist one.** Tiers 4, 18 and 29 add chairs, and every type has a chair there. Tier 10 adds none (5, as at tier 4), so its governments lean harder: one more chair of their lead type, and one type thin or missing. A seat that has committed has a reason to move up, and a seat that has not can stay.
- **Every government has a Wildcard chair,** so no card is ever left without a seat. The Chiefdom keeps its old mix of one Military, one Economic and one Wildcard chair (the user, 2026-10-16: *"lets revert chiefdom yeah"*), so in the first four drafts a Civic card needs the Wildcard chair.
- **The tier-18 abilities count seated Orders by type again:** Imperium's Military Orders and the Merchant League's Economic Orders, up to five each with their Wildcard chairs. Divine Mandate counts Civic Orders (ruled 2026-10-16), also up to five.
- The old mixes are still on every government row as `slots` (military, economic and wildcard). Building this replaces them with the four-type mix and a save-format change.

## 5. Questions for the user

1. **When Doctrines are offered:** as each band opens, in place of the reward hands (recommended); beside the reward hands; or on adopting a government, as before?
2. **The fifteen Dominion candidates:** which to keep or change? Are the drawbacks the right size?
3. **Governments:** remove the flat abilities, and make each one a chair mix plus one council rule (recommended)? Or remove the abilities with nothing in their place, or rebalance them as yields?
4. **Typed chairs:** A (the old three), B (three types plus Open, recommended), C (signature chairs only) or D (old-guard chairs)? B, C and D can also be combined.
