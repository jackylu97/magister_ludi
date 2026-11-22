# Wagers, the first age and difficulty: design options (2026-11-22)

Design options only. Nothing here is built, and no data changed. The review page for comments has the same text, one block for each option.

# Part 1: the wagers

The user, 2026-11-22: *"some of the wagers feel unintuitive, and i wish that there was more competition with the other players for wagers. I think the wagers is still the right format, but i think it needs to reward good play more. Once we decide on the right format, i'd like to do an optimization loop on the bots, and then decide the right numbers based on the bots."*

## Today: How a wager works now

1. Æra I deals nothing. A wager runs in Æra II, III and IV.
2. On the turn an age opens, the world is dealt three wagers. Every seat sees the same three.
3. Each wager is a bar: one figure to reach, set for that age in `data/wagers.json`.
4. Each seat stakes one of the three in secret. A seat cannot end the turn before it stakes.
5. A seat claims a bar on the turn it first meets it. Any number of seats can claim the same bar.
6. The staked wager pays 2 beads. Each of the other two pays 1. An age pays one seat 4 beads at most.
7. Every seat's progress against all three bars is public on the Abacus, ranked.
8. An age closes 10 turns after half the seats reach the next age, or after one seat is two ages ahead.
9. At the close, a seat that staked a wager and missed its bar takes a malice. A malice is a bad Order that holds a chair until the next judgement.
10. A seat needs 7 beads to begin the Magnum Opus. A few beads also come from grants: Chart the Stars, The Turning Heavens and The Codex.

### Why it reads as unintuitive

- **Most bars are sums the player cannot see.** "Everything the land worked by your seat of government pays you, added up over the age: 4500." No screen shows that total while it grows, except the Abacus. No single action moves it in a way the player can feel.
- **The bars are large figures with no meaning.** 4500, 9000 and 11000 tell a player nothing about what to do next turn. "Build 2 wonders" does.
- **The secret stake hides the only choice.** A rival cannot react to a choice it cannot see, so the stake is a private guess.

### Why it reads as uncompetitive

- **A bar is private.** If four seats reach it, four seats are paid. No rival can take a bead from you, and you cannot take one from a rival.
- **The progress is public but nothing depends on it.** The Abacus ranks the seats, but rank pays nothing.
- **The only loss is the malice.** The format punishes a miss and does not reward being better than a rival.

### The 24 wagers, sorted

Five wagers count things a player can see on the map or in a list. Nineteen are sums.

| Group | Count | Wagers |
|---|---|---|
| Things you can see and count | 5 | The Capital of the World (citizens, buildings, wonders in the capital) · The Wonder of the Age · The Marcher Lords (towns) · The Field of Glory (kills less losses) · The Taken Town |
| A computed figure on one turn | 5 | Bread and Iron (food surplus, army strength) · The War Chest (treasury, army strength) · The Observatory (science for each citizen) · The Builders (what all buildings pay) · The Harvest (deferred) |
| A sum of yields over the whole age | 14 | The Worked Land · The Caravanserai · The King's Roads · The Solvent Realm · The Academies · The Tithe · The Marvels' Pay · The Patronage · The Renowned · The Chronicle · The Deck · The Six Voices · The Contented Realm · The Arsenal (deferred) |

### What other games do

- **Terraforming Mars** is the closest model. A milestone is a race to a fixed bar: the first player to reach it claims it. An award is a ranking at the end: first and second place are paid. Format D borrows both.
- **Humankind** gives era stars for visible counts (districts built, units killed, population). The count is always on the screen. The rewritten list of wagers borrows this.
- **Civ VI** runs great-person races: every seat sees every other seat's points, and the first to the price takes the person. Format A borrows the public race.
- **7 Wonders** compares your army only with your two neighbours at the end of each age. Format E borrows the named rival.
- **Through the Ages** pays events to the strongest and punishes the weakest. Difficulty tier 13 in Part 3 borrows the second half.

## Format A: The race

The wagers are public and the same for every seat. The first seat to reach a bar takes its beads, and the wager closes.

### Rules

- Each age deals three wagers. Each is a count with a bar: "Build 2 wonders this age".
- The first seat to reach the bar takes 2 beads. The wager then closes for every seat.
- Every seat is told on that turn: "Genghis Khan takes The Field of Glory."
- There is no stake and no malice.
- If no seat reaches a bar before the age closes, the nearest seat takes 1 bead.
- One seat can win two of the three wagers in an age, and no more.
- A game of five or six seats deals four wagers.

### One age, four seats

Æra II opens on turn 48 and closes on turn 82. Four seats: you, Cyrus, Cleopatra and Genghis Khan. Dealt: The Wonder of the Age (build 2 wonders this age), The Marcher Lords (hold 6 towns), The Field of Glory (5 kills less losses).

(The review page draws this age as a time line of the four seats. Format A. A filled bead is a race won. The wager closes on that turn.)

1. **Turn 48.** The deal sheet shows three cards. Each has its bar and the four seats' counts under it. Towns: Cyrus 4, you 3, Cleopatra 3, Genghis 3. There is nothing to choose. You close the sheet.
2. **Turn 53.** Genghis is at war with Cleopatra. The Abacus shows "Genghis 3 of 5" on The Field of Glory. Cleopatra has finished one wonder.
3. **Turn 58.** Genghis reaches 5. Every seat sees a toast: "Genghis Khan takes The Field of Glory. 2 beads." The card turns face down on the Abacus.
4. **Turn 61.** You hold 5 towns and so does Cyrus. Your settler needs 6 more turns. You buy it with gold.
5. **Turn 64.** You found your sixth town one turn before Cyrus's settler arrives. You take The Marcher Lords and 2 beads. Cyrus founds his town and gets no bead.
6. **Turn 70.** Cleopatra finishes her second wonder and takes 2 beads. Your wonder is half built. It still pays you as a wonder.
7. **Turn 82.** The age closes. There is no judgement. The age card shows Genghis 2, you 2, Cleopatra 2, Cyrus 0.

- **What you do differently.** You watch one rival's count and time one push: buy the settler, move citizens to the mines, attack now and not later. You drop a race you cannot win and stop paying for it.
- **How it rewards good play.** Speed and planning win. The seat that prepares before the age opens (a settler ready, a wonder half built) wins the race.
- **Does the leader run away.** Yes, more than in any other format. The strongest seat is fastest at most counts. The brakes are the cap of two wins an age, and wagers from three different lines.
- **Far behind or at war.** A seat that is behind can still pick one race and put everything into it. A seat at war loses the peaceful races but is the favourite for the war ones. A seat that loses a race by one turn gets nothing, and that hurts.
- **Bots and the tuning loop.** A bot must compare its own rate with the best rival's rate and drop a lost race. That is one new knob (`wager.raceMargin`) beside `weights.bead`. The loop must set a bar for every wager and age: about 70 numbers. Each bar is a small whole number, so the target is clear: the first claim lands at 50 to 70% of the age in bot games.
- **Beads against the door of 7.** The world gets 6 beads an age and 18 in a game, for any count of seats. Four seats: an even share is 4.5. A leader that wins 4 of 9 races holds 8, plus 1 or 2 from grants, and passes 7 early in Æra IV. Six seats with four wagers: 24 beads, an even share of 4, and a leader with 4 of 12 races holds 8. The weakest seats hold 0 to 2 and never open the door. Today almost every seat can.
- **Cost to build.** Small. The register of first claims exists (`GameState.beads.claimed`). The deal sheet loses its stake step. The Abacus already ranks the seats. The bots need the race estimate.
- **Risk.** A lost race pays nothing, so the format is harsh for the second-best seat and makes the leader richer.

## Format B: The ranking

There are no bars. At the end of the age each wager pays the seats by rank.

### Rules

- Each age deals three wagers. Each is a count with no bar: "Towns you hold".
- The Abacus shows each seat's count, its rank and the gap to the seat above, on every turn.
- When the age closes, first place takes 2 beads and second place takes 1.
- Seats that tie both take the higher prize.
- A seat with a count of zero takes nothing.
- There is no stake and no malice.

### One age, four seats

Æra II opens on turn 48 and closes on turn 82. Four seats: you, Cyrus, Cleopatra and Genghis Khan. Dealt: The Wonder of the Age (wonders built this age), The Marcher Lords (towns held), The Field of Glory (kills less losses).

(The review page draws this age as a time line of the four seats. Format B. Nothing is paid before the close. The beads come by rank on turn 82.)

1. **Turn 48.** The deal sheet shows three cards with no bar. Under each is the ranking as it stands. Towns: Cyrus 4, you 3.
2. **Turn 55.** The Abacus shows you second in towns, one behind Cyrus. You queue a settler.
3. **Turn 63.** You found a town and tie Cyrus at 5. He answers with a settler of his own.
4. **Turn 72.** The top bar shows "10 left". Wonders: Cleopatra 2, Cyrus 1, you 1. Towns: you 6, Cyrus 6. Kills: Genghis 7.
5. **Turn 76.** Cyrus finishes a second wonder and ties Cleopatra for first. You buy a settler for the last push.
6. **Turn 81.** You found your seventh town with one turn left.
7. **Turn 82.** The judgement sheet. Towns: you first (2 beads), Cyrus second (1). Wonders: Cleopatra and Cyrus tie (2 each). Kills: Genghis first (2), and no other seat has a count above zero. Totals: Cyrus 3, you 2, Cleopatra 2, Genghis 2.

- **What you do differently.** You read the ranking and aim for the place you can reach. Second place in two wagers pays the same as first place in one. The last ten turns of an age become a sprint.
- **How it rewards good play.** It rewards being better than the others at the close, by any margin. It does not reward speed. A seat can pass a rival on the last turn.
- **Does the leader run away.** Less than in the race. Second place always pays, and a seat needs only a small lead in one count. A dominant seat can still take 5 of the 9 beads in an age.
- **Far behind or at war.** A weak seat can aim at second place in the wager the leaders ignore. A seat at war is paid by the war wager. Nothing is lost by coming last.
- **Bots and the tuning loop.** This format needs the fewest numbers: no bars at all. The loop tunes only the prize by rank (2 and 1), the count of wagers dealt, and one bot knob for how hard to chase a place (`wager.rankMargin`). The bots already rank themselves for the Abacus.
- **Beads against the door of 7.** The world gets 9 beads an age and 27 in a game. Four seats: an even share is 6.75. A leader with one first and one second place takes 3 an age, holds 6 after Æra III and reaches 7 with one grant as Æra IV opens. That is close to today. A dominant seat with 4 or 5 an age reaches 7 at the close of Æra III, so the door should move to 8. Six seats: the same 27 beads give an even share of 4.5, and a leader reaches 7 in the first half of Æra IV. The Opus also needs Alchemy, the last technology of Æra IV, so an early door does not end a game early.
- **Cost to build.** The smallest of the five. The judgement at the close exists. The Abacus ranking exists. The bars, the stake and the malice go away.
- **Risk.** Nothing happens until the close, so the middle of an age has no bead moments.

## Format C: The stake as a challenge

Each seat names one wager in the open. You win it by leading it at the close. A rival who leads it takes it from you.

### Rules

- Each age deals three wagers. Each is a count with no bar.
- On the deal turn every seat stakes one wager. The stakes show to all seats when the turn resolves.
- At the close, a seat that leads the wager it staked takes 2 beads.
- If a rival leads a wager that you staked, the rival takes 1 bead and you take nothing.
- A tie goes to the seat that staked.
- A wager that no seat staked pays nothing.
- There is no malice. A lost stake is the cost.

### One age, four seats

Æra II opens on turn 48 and closes on turn 82. Four seats: you, Cyrus, Cleopatra and Genghis Khan. Dealt: The Wonder of the Age, The Marcher Lords, The Field of Glory.

(The review page draws this age as a time line of the four seats. Format C. A flag is a stake, made in the open on the deal turn.)

1. **Turn 48.** You stake The Marcher Lords. The turn resolves and the sheet shows four flags: you and Cyrus on towns, Cleopatra on wonders, Genghis on kills.
2. **Turn 50.** You and Cyrus want the same card, and only one of you can win it. Cleopatra is alone on wonders. If you out-build her, you take 1 bead from her stake.
3. **Turn 60.** The Abacus: towns Cyrus 6, you 5. Wonders: Cleopatra 1, you 1.
4. **Turn 68.** Genghis attacks Cyrus, who has spent his production on settlers. Cyrus loses a town. Towns: you 6, Cyrus 5.
5. **Turn 74.** "8 left." Cleopatra has 2 wonders. Your second wonder needs 4 turns.
6. **Turn 80.** You finish it and tie her at 2. The tie goes to the seat that staked, so the wager stays hers. You needed three.
7. **Turn 82.** The judgement sheet. You lead your stake: 2 beads. Cyrus lost his: 0. Cleopatra kept hers: 2. Genghis kept his: 2.

- **What you do differently.** You read the table before you stake: who is strong at what, and who will stake the same card. During the age you defend your own card and choose one rival's card to attack.
- **How it rewards good play.** It rewards a correct reading of your own strength and of your rivals. It makes direct conflict: war on the seat that shares your stake is a fair move.
- **Does the leader run away.** A leader can keep its own stake and take one more, for 3 beads an age. Every seat can see the leader's stake and can work against it together. That is the brake.
- **Far behind or at war.** A weak seat stakes the card that nobody else wants and often keeps it. A seat at war stakes the war card. A weak seat that shares a stake with a strong one gets nothing.
- **Bots and the tuning loop.** No bars to set. The hard part is the bot's choice of stake: it must guess what the rivals will stake. A simple rule works for a first build: stake the wager where your lead over the second seat is largest. Knobs: `wager.commitMargin` (exists), a new `wager.stealMargin`, and the two prizes.
- **Beads against the door of 7.** Each staked wager pays 2 if its staker keeps it and 1 if a rival takes it. The world gets 3 to 6 beads an age and 9 to 18 in a game. Four seats: a leader that keeps its stake and takes one more has 3 an age, 6 after Æra III, and 7 with one grant as Æra IV opens. Six seats share the same pot, so the game should deal four wagers. This is the leanest format: the door could drop to 6.
- **Cost to build.** Medium. The stake exists but becomes public. The judgement needs the leader of each wager and the rule for a taken stake. The deal sheet needs the four flags. The bots need the most new thought.
- **Risk.** Two seats that stake the same card can both feel cheated, and bots that stake badly make the format easy to farm.

## Format D · recommended: Milestones and awards

Two kinds of wager in one deal, as in Terraforming Mars. A milestone is a race to a bar. An award is a ranking at the close. Each seat backs one card in the open.

### Rules

- Each age deals three cards: two milestones and one award. Five or six seats get two of each.
- A milestone is a count with a small bar: "Run 3 trade routes". The first seat to reach it takes 2 beads, and the milestone closes.
- An award is a count with no bar: "Towns you hold". At the close, first place takes 2 beads and second place takes 1.
- On the deal turn every seat backs one of the cards, in the open.
- A seat that takes first place on the card it backed takes 1 bead more.
- There is no malice. A backing that fails pays nothing.
- A milestone that no seat reaches pays 1 bead to the nearest seat at the close.

### One age, four seats

Æra II opens on turn 48 and closes on turn 82. Four seats: you, Cyrus, Cleopatra and Genghis Khan. Dealt: two milestones, The Caravanserai (run 3 trade routes) and The Wonder of the Age (build 2 wonders this age), and one award, The Marcher Lords (towns held at the close).

(The review page draws this age as a time line of the four seats. Format D. Two races end during the age. The award is judged at the close.)

1. **Turn 48.** The deal sheet shows two cards marked Race, each with a bar, and one marked Ranking. You back The Wonder of the Age. Cyrus backs The Marcher Lords, Cleopatra backs the wonders too, Genghis backs The Caravanserai. Four flags show on the cards.
2. **Turn 56.** Genghis starts his third trade route. Toast: "Genghis Khan takes The Caravanserai." He takes 2 beads and 1 more for his backing. The card closes.
3. **Turn 63.** You and Cleopatra have one wonder each. You move two citizens of your capital from farms to mines.
4. **Turn 69.** You finish your second wonder two turns before Cleopatra. You take 2 beads and 1 for your backing. Cleopatra's wonder still completes and pays her as a wonder.
5. **Turn 72.** "10 left." The award stands at Cyrus 6 towns, you 5, Cleopatra 4, Genghis 4.
6. **Turn 79.** You found a sixth town. Cyrus founds his seventh on the next turn.
7. **Turn 82.** The judgement sheet. Cyrus is first in towns: 2 beads and 1 for his backing. You are second: 1 bead. Totals: you 4, Cyrus 3, Genghis 3, Cleopatra 0.

Cleopatra put her age into one race and lost it by two turns. That is the sharp side of a race. A knob softens it: the second seat to reach a milestone takes 1 bead.

- **What you do differently.** Early in the age you race. Late in the age you watch the ranking. The backing is one clear choice with a clear prize, and every rival can see it and answer it.
- **How it rewards good play.** A milestone pays the seat that planned and moved first. An award pays the seat that is best at the close. The backing pays a seat that knows its own strength.
- **Does the leader run away.** Less than in the race alone. The award pays second place, and a milestone is gone after one win, so one seat cannot take everything. The cards come from three different lines, so one deck cannot be best at all three.
- **Far behind or at war.** A seat that is behind has two ways in: one milestone with a fixed bar that it can plan for, or second place in the award. A seat at war is the favourite when a war card is dealt, and it can still place in the award.
- **Bots and the tuning loop.** Bars are needed only for the milestones: about 12 rows by three ages, 36 small whole numbers. The loop sets each bar so that the first claim lands at 50 to 70% of the age, and it reports how often no seat claims. Awards need no numbers. Knobs: the bars, the three prizes (2, 2 and 1, plus 1), the mix dealt (two and one), `wager.raceMargin`, `wager.rankMargin`, `wager.commitMargin` and `weights.bead`.
- **Beads against the door of 7.** Four seats: two milestones pay 4, the award pays 3, and about 1.5 backings pay. That is about 8 beads an age and 25 in a game, an even share of about 6. A leader takes 3 or 4 an age, holds 6 to 8 after Æra III, and passes 7 at the turn of Æra IV with one grant. Today's leader is in the same place. Six seats, with two milestones and two awards: 4 + 6 + about 2 = 12 an age and 36 in a game, again an even share of 6. If the bots show the door opening an age early, move it to 8.
- **Cost to build.** The largest of the formats, but every piece is small and half exists. First claims: the register exists. Ranking at the close: the Abacus ranks today. The stake becomes the backing and turns public. The malice step goes away. The deal sheet needs two card frames (Race, Ranking) and the flags.
- **Risk.** Two kinds of card are more to learn than one, so the deal sheet must mark Race and Ranking very clearly.

## Format E · an addition: The named rival

A small duel that can sit on top of any format. Each seat is given one rival and one count.

### Rules

- On the deal turn each seat gets one duel card: "Hold more wonders than Cyrus when the age closes."
- Your rival is the seat one place above you on the bead rod. The leader's rival is the seat in second place.
- The game picks the count on which you two are closest, from the list of wagers.
- If you win the duel, you take 1 bead. If you lose, nothing happens.
- Your rival sees your duel card. Your rival has its own duel against another seat.

### One age, four seats

Æra II opens on turn 48 and closes on turn 82. Four seats: you, Cyrus, Cleopatra and Genghis Khan. The bead rod reads Cyrus 3, you 2, Cleopatra 2, Genghis 1.

(The review page draws this age as a time line of the four seats. Format E. Each seat has one duel against the seat above it.)

1. **Turn 48.** Under the three wagers, the deal sheet shows your duel: "More trade routes than Cyrus at the close." Cyrus has 2 routes and you have 2.
2. **Turn 52.** Cyrus sees the same card on his side: "You are named by one rival." His own duel is against you, on technologies.
3. **Turn 60.** You start a third route. The duel line on the Abacus turns to your colour: you 3, Cyrus 2.
4. **Turn 71.** Cyrus builds a Market for a route slot and ties you at 3.
5. **Turn 78.** Your trader is plundered by a barbarian. You are at 2. You buy a trader and start the route again on turn 80.
6. **Turn 82.** The close. Routes: you 3, Cyrus 3. A tie is not more. You take nothing. Genghis beat Cleopatra on soldiers and takes 1 bead.

- **What you do differently.** You have one named opponent and one number to beat. It gives a peaceful seat a reason to look at a neighbour.
- **How it rewards good play.** It pays a seat for passing the seat just above it, which is the fairest test of good play in that age.
- **Does the leader run away.** No. The leader can win 1 bead like every other seat, and it is the target of the second seat.
- **Far behind or at war.** This is the best format for a seat that is behind. Its rival is only one place above, and the count is the one where the gap is smallest.
- **Bots and the tuning loop.** No bars. A bot values its duel as one bead times its chance to win. The only knobs are the prize and how the count is picked.
- **Beads against the door of 7.** About half the duels are won: 2 beads an age at four seats, 3 at six. That is about 1.5 beads more for each seat in a game. If the duel is added to another format, move the door up by 1.
- **Cost to build.** Small. One card for each seat, one comparison at the close, one line on the deal sheet and the Abacus.
- **Risk.** It is one more thing on the deal sheet, and a duel on a count you do not care about is easy to ignore.

## Apart from the format: A list of wagers you can count

Every wager below counts things that the player can point at. The 24 ids stay. Nineteen names stay, most of them with a new count. Five get a new name because the old idea was a sum.

- **Six lines, four wagers each**: War, Land, Coin, Faith, Learning and State. Each line leans to one deck.
- **A hand takes three different lines.** So a hand of three never favours one deck only. The rule exists today (`rules.dealt`, three different lines) and only the lines change.
- **"This age" counts from the deal.** "At the close" counts what stands on the board. A race needs a bar. A ranking needs none.
- **The religion rows wait for Æra III**, as The Tithe does today.

| Id | Wager | Counts | Span | Best as | Favours | Before |
|---|---|---|---|---|---|---|
| `fieldOfGlory` | The Field of Glory | Rivals' soldiers killed, less your soldiers lost | this age | Race or ranking | Dominion | kept |
| `takenTown` | The Taken Town | Towns you took by force and still hold | this age | Race | Dominion · Expansionist | kept |
| `theArsenal` | The Arsenal | Soldiers you trained or bought | this age | Race | Dominion · Commerce | was a sum of production |
| `breadAndIron` | Bread and Iron | Soldiers you have in the field | at the close | Ranking | Dominion · Expansionist | was food surplus and army strength |
| `marcherLords` | The Marcher Lords | Towns you hold | at the close | Ranking | Expansionist · Dominion | kept, without the two meter clauses |
| `workedLand` | The Worked Land | Hexes with an improvement inside your borders | at the close | Ranking | Expansionist · Commerce | was a sum of the capital's hex yields |
| `capitalOfTheWorld` | The Capital of the World | Citizens in your capital | at the close | Race or ranking | Expansionist · Scientific | kept, one clause of three |
| `sixVoices` | The Public Works (was The Six Voices) | Public works standing in your towns | at the close | Race | Expansionist · Devotion | was a sum of all six yields |
| `caravanserai` | The Caravanserai | Trade routes you run | at the close | Race | Commerce | was a sum of route yields |
| `kingsRoads` | The King's Roads | Towns joined to your capital by road | at the close | Race | Commerce · Expansionist | was a sum of connection gold |
| `solventRealm` | The Solvent Realm | Gold in your treasury | at the close | Ranking | Commerce | was a sum of income |
| `warChest` | The Full Table (was The War Chest) | Kinds of luxury you hold | at the close | Race | Commerce · Expansionist | was treasury and army strength |
| `theTithe` | The Tithe | Towns that follow your religion, yours and rivals' | at the close | Ranking | Devotion | was a sum of religion yields |
| `theRenowned` | The Pilgrim Road (was The Renowned) | Rivals' towns that follow your religion | at the close | Race | Devotion · Commerce | was a sum of renown |
| `marvelsPay` | The Cloister (was The Marvels' Pay) | Faith buildings standing in your towns | at the close | Race | Devotion · Expansionist | was a sum of wonder yields |
| `contentedRealm` | The Contented Realm | Happiness to spare, the figure on the top bar | at the close | Ranking | Devotion · Magisterial | was a sum of happiness over the age |
| `academies` | The Academies | Technologies you learned | this age | Race or ranking | Scientific | was a sum of science |
| `observatory` | The Observatory | Science buildings standing in your towns | at the close | Ranking | Scientific · Expansionist | was science for each citizen |
| `patronage` | The Patronage | Great people you called | this age | Race | Scientific · Magisterial | was a sum of what great people pay |
| `theHarvest` | The Great Houses (was The Harvest) | Empire buildings you hold | at the close | Race | Scientific · Magisterial | was farm food, deferred |
| `wonderOfTheAge` | The Wonder of the Age | Wonders you built | this age | Race | Magisterial · Expansionist | kept |
| `theDeck` | The Deck | Orders seated in your chairs | at the close | Ranking | Magisterial | was a sum of what seated cards pay |
| `theChronicle` | The Chronicle | Orders you drafted | this age | Race | Magisterial · Devotion | was a sum of culture |
| `theBuilders` | The Builders | Buildings you finished | this age | Race or ranking | Magisterial · Commerce | was what all buildings pay on one turn |

### Should Æra I have wagers

No beads in Æra I. The seats are too unequal in the first forty turns, and a seat with a bad start should not lose a bead for it. But Æra I should teach the idea. The deeds of the first age (Part 2, option 5) do that: public goals, a first-seat bonus, and small boons in place of beads.

## Recommendation: Format D, on the new list

- **Build format D**: two milestones and one award an age, with an open backing and no malice.
- **Use the new list.** Mark each wager as a race, a ranking or both. The table has a first reading.
- **Start with B if the build must be small.** B is D without the milestones and the backing. It needs no bars, so the bots can play it on the first day. The milestones can come second.
- **Hold format E** until D is played. It is cheap to add, and it is the best help for a seat that is behind.
- **Then run the bot loop** on the milestone bars, the prizes and the door.

## The questions for Part 1

### Question 1: Which format do we build?

**Recommended.** Format D, milestones and awards. If you want the smallest first step, build B and add the milestones after one playtest.

### Question 2: What happens to a seat that backs a card and fails?

**Recommended.** Nothing. Drop the malice from the wager. The malice deck stays in the data and comes back as a difficulty tier (Part 3, tier 13).

### Question 3: Must a seat that is behind still be able to open the Opus door?

**Recommended.** Yes, for about three seats in four. Keep the second prize on awards, deal one more card at five or six seats, and let the bot loop set the door between 6 and 8.

# Part 2: the first age

The user: *"Age 1 pacing is weird because the player doesn't have much to build in the early game, and many improvements aren't available until later. I do think some of the improvements should be gated by techs, i think understanding the right tech order is quite important for the game, but I think the player also needs things to build."* And on directions: *"early game projects that scale throughout the game (maybe an empire building or chart the stars-like thing), not sure if these should feel mandatory or not. moving some improvements/buildings earlier into the game. Adding new generic buildings like public works or something thematic with early agricultural societies. Humankind's paleolithic era play is interesting as inspiration."* No option here changes how technologies gate things.

## The facts: What a city can build in the first forty turns

Read from the data files. No games were run.

### On turn 1, with Agriculture only

- **Units**: Scout 18, Warrior 18, Worker 14 (4 more for each one built), Settler 36 (9 more for each one built).
- **Buildings**: none. Every building in `data/buildings.json` waits for a technology. The Hall of Deeds is in the data at the first column but is dormant (`awaitsTech`).
- **Projects**: none. Tithes waits for Calendar, Scholarship for Writing, Pageants for Code of Laws. Each turns 20 production into 5 gold, science or culture.
- **A worker** can build a Farm and nothing else.

### What the first technologies open

| Technology | Science | Opens in the build list | Opens for a worker |
|---|---|---|---|
| Pottery | 11 | Granary 30 |  |
| Husbandry | 11 | Temple of Artemis (wonder, 130) | Pasture |
| Fletching | 11 | Archer 18 | Camp |
| Mining | 11 | The Great Sphinx (wonder, 130) | Mine |
| Stonecraft | 24 | Monument 39, Palisade 52, two wonders | Quarry |
| Bronzeworking | 24 | Spearman, Barracks 39, one wonder |  |
| Divination | 24 | Shrine 39, two wonders |  |
| Calendar | 24 | Tithes (project), one wonder | Plantation |
| Sailing | 24 | Lighthouse 39 (coast), Trireme, one wonder | Fishing Boat |
| Smelting | 24 | nothing | Smelter |
| Herbals | 24 | nothing | Physic Garden |
| Writing | 50 | Library 51, Scholarship (project), one wonder |  |
| The Wheel | 50 | War Chariot, Stable (needs a pasture or camp) |  |
| Casting | 50 | nothing |  |
| Astronomy | 50 | nothing (an ability) |  |

- **Four early technologies open nothing to build in a city**: Smelting, Herbals, Casting and Astronomy. Husbandry and Mining open one improvement and one wonder.
- **The Lumber Mill waits for Siegecraft** in Æra II, so a forest start has no improvement of its own in Æra I.
- **Public works in Æra I**: the Granary alone. The others are the Harbour, the Watermill, the Public Bath, and three that a card or a leader opens (Aqueduct, Cistern, The House of Fire). The Expansionist card The Curators of Works is dealt in the first band and has one building to read.
- **Empire buildings** start with Chart the Stars in Æra II (Chronology, needs a Library, +2 science, +1 movement for ships, a bead).
- **The map**: 7 or 8 discovery sites on each continent, none closer than 6 hexes to a start. A site pays 20 food or production, 7 science or culture, 15 faith, 25 gold, or a free scout or worker. Barbarian camps appear from turn 6. A cleared camp pays 25 gold and 25 food.

### The estimate

This is arithmetic, not a measurement. It assumes 5 production and 3 science a turn in the capital.

- **Forty turns give about 200 production.** That is 6 or 7 finished things.
- **The things a player wants**: a scout, a warrior, a worker and a settler cost 86. A Granary and one building of the second column cost 69. Together 155, or 31 turns.
- **The first building arrives late.** The first technology lands on about turn 4, the second on turn 8, the third on turn 16. A player who does not take Pottery first sees no building in the list before about turn 16.
- **The hole**: about 9 to 15 of the first 40 turns go to something built only because the list has nothing better (a third warrior, a second worker with no work). They fall between turn 18 and turn 35.
- **The choice is thinner than the time.** Of the 6 or 7 things, 4 are units and their order is nearly fixed. The player chooses between buildings twice in forty turns.
- **A second town** (from about turn 20, 2 or 3 production) needs 10 to 15 turns for a Granary. It is not idle, but it finishes one thing in its first fifteen turns.
- **The worker** has farms only until Mining, Husbandry or Fletching. On a start of hills, forest or coast it stands idle for about ten turns.

## Option 1: Early projects that scale

Three projects stand in every town's list from turn 1. Each can be done again. Each costs more each time in that town.

| Project | Pays | Price in one town |
|---|---|---|
| Clear the Commons | +1 food in this town, for good | 20, 35, 50 |
| A Gathering of the Clans | +1 culture in this town, for good | 25, 40, 55 |
| Survey the Bounds | The town claims its next hex now | 15, 25, 35, 45 |

- **A building is the better buy.** A Granary gives 2 food and its growth rule for 30. The first Commons gives 1 food for 20, the second for 35. A Monument gives 2 culture and 1 authority for 39.
- **Each ladder stops at three** (four for the survey). A town cannot grind them.
- **When they stop being worth it**: the first copy is fair on any turn. The second is fair until the town has a building of the second column to build. The third is for a town with nothing else, which is rare after about turn 50.
- **Should they feel mandatory?** No. Set the first copy at the same price for each yield as the matching building, and every later copy above it. Then the project is right only when no building is offered. That is the floor the user asked for.

- **Turns 1 to 40.** Turn 1: the capital's list shows four units and three projects. A player who opens with a scout can follow with a Gathering and reach the first Order draft about six turns sooner. A new town starts with Survey the Bounds and takes the hex with the wheat on its third turn.
- **Adds to the build list.** Three rows from turn 1, in every town, for the whole game.
- **Order of technologies.** Untouched. No technology moves.
- **Pace.** A little faster. Each project is 1 yield, so a capital with two of them has about 10% more by turn 20. That offsets part of this week's slower science and dearer units.
- **Bots.** A project with a lasting yield prices like a small building, so the bots' build appraisal can read it. One check: the rising price must reach the appraisal.
- **Cost to build.** Medium. Projects today never finish and never leave the queue. These complete, pay once and count up, so they are a new kind of row: closer to a building that can be built three times.
- **Risk.** If the price is too low they become a chore that every town does three times.

## Option 2: An empire building of the first age

**The Hall of Deeds.** One in the empire, 30 production, no technology. The row is in the data already, dormant.

- It pays +1 culture when built.
- It has six panels. Each panel is one deed of the first age (option 5): meet another people, clear a camp, find three discoveries, reach six citizens, raise a shrine, connect a resource.
- Each filled panel pays +1 of that deed's yield in the Hall's town, for good.
- In each later age the Hall can be raised one tier in the build list (60, then 120, then 240 production). Each tier adds +1 to every filled panel.
- The building's card shows the six panels, filled or empty, and the tier.

Without option 5, each panel fills on a plain count: a second town, six citizens, a first wonder, a first great person, a first trade route, a first holy site.

- **Scientific cards read empire buildings.** The Royal Estates (+3 food and +3 production in its town) and The Capitolia would find one from turn 6 and not from Æra II. That is a strong early combination, and it is the kind the user likes.
- **The Second Seat** allows a second copy of every empire building. A second Hall pays the panels again in a second town. Let it. It is a rare card of the third band.

- **Turns 1 to 40.** Turn 1: the Hall is in the list beside the units. Built by turn 7, it shows six empty panels. Turn 12: your scout meets Cyrus and the first panel fills with +1 gold. By turn 40 a good start has four panels and a Hall that pays 5.
- **Adds to the build list.** One row on turn 1, then one tier in each later age.
- **Order of technologies.** Untouched.
- **Pace.** About 5 more yield in the capital by turn 40, and it gives the first twenty turns a list of things to go and do.
- **Bots.** The bots build it as a cheap building with a good return. They fill panels by accident at first. A small weight for an open panel can come later.
- **Cost to build.** Small to medium. The row exists. It needs the panels (a count for each), the tiers and a card face that shows them.
- **Risk.** It is mandatory by design: every seat builds it first, so it is a ritual and not a choice.

## Option 3: Moving things earlier

Six moves. Each gives an empty technology or an empty start something to build. A building's price follows its column, so every move also makes it cheaper.

| Thing | Today | Moves to | Price | What stays behind the old technology |
|---|---|---|---|---|
| Monument | Stonecraft | No technology | 39 to 30 | Palisade, Quarry, Stonehenge, The Pyramids |
| Fishing Boat | Sailing | No technology | a worker's job | Embarking, the Trireme, the Lighthouse, The Great Lighthouse |
| Lumber Mill | Siegecraft (Æra II) | Bronzeworking | a worker's job | The Bowman, sieges, Stone Walls, The Iron Pillar |
| Smithy | Bronze Panoply (Æra II) | Smelting | 89 to 52 | The Phalanx, the Swordsman, the War Hall, The Statue of Zeus |
| Watermill | Engineering (Æra III) | The Wheel | 264 to 68 | The Aqueduct, The Circus Maximus |
| Shrine | Divination | Husbandry | 39 to 30 | The Oracle, The Temple of Thoth, the rites |

- **The order still matters.** Every strategic choice keeps its gate: mines, pastures, camps, quarries and plantations, every soldier, every wonder, the Library and the Granary.
- **Smelting stops being an empty technology.** Husbandry opens a building. A coast start and a forest start get work for the first worker.
- **The Watermill is the largest move.** It is a public work, so the Expansionist cards get a second one in Æra I, on river sites only.

- **Turns 1 to 40.** Turn 1: the Monument is in the list at 30, so the first choice of the game is a scout or culture. A coast capital's worker builds a fishing boat on turn 12. A capital on a river can aim at The Wheel for a Watermill by turn 35.
- **Adds to the build list.** One building on turn 1, one at the first column, two more by the third column, and two worker jobs.
- **Order of technologies.** Kept, and made sharper in two places: Smelting and Husbandry become real choices.
- **Pace.** Faster culture from turn 8 means the first Order draft arrives about five turns sooner. This is the option that shortens Æra I the most for its size.
- **Bots.** Nothing to teach. The rows are the same and the bots read costs and gates from the data.
- **Cost to build.** The smallest of all. Six edits in the data, the cost table in `docs/production-costs.md`, and the tests that pin the tree.
- **Risk.** A turn-1 Monument can become the only correct first build.

## Option 4: New early buildings tied to the land

Seven small buildings at 30 production. Most need a feature near the town, so two towns show different lists.

| Building | Needs | Technology | One line | Later | Public work |
|---|---|---|---|---|---|
| Threshing Floor | a Farm in the town | none | Farms of this town give +1 food. | stands beside the Granary | yes |
| Well | no river or lake next to the town | none | The town has fresh water. +1 food. | grows into the Cistern or the Aqueduct | yes |
| Fish Weir | a river, lake or coast | none | Water hexes next to the town give +1 food. | stands beside the Harbour | yes |
| Smokehouse | a forest hex or a Camp | Fletching | Forest hexes and Camps give +1 food. | stands beside the Stable | no |
| Herder's Fold | a Pasture | Husbandry | Pastures give +1 food and +1 production. | grows into the Stable | no |
| Kiln | a river or a marsh | Pottery | Buildings in this town cost 15% less. | grows into the Workshop | no |
| Boundary Stone | none | none | The town claims two hexes now, and its border grows faster. | stands beside the Monument | no |

- **Three are public works** (Threshing Floor, Well, Fish Weir). The Curators of Works and The Aediles then have something to read in Æra I.
- **A Meeting Ground** (+1 culture, +1 happiness, no site) fits here only if the Monument does not move to turn 1 in option 3.
- **"Grows into"** means the later building needs it or replaces it. "Stands beside" means both stay.

- **Turns 1 to 40.** Turn 1: a river capital with wheat sees the Threshing Floor, the Fish Weir and the Boundary Stone. A dry hill capital sees the Well and the Boundary Stone. You choose by looking at the land. By turn 40 a capital has two or three of them and each new town starts with the one its site allows.
- **Adds to the build list.** Two to four buildings on turn 1, by site. Two or three more with the first column.
- **Order of technologies.** Kept. The three buildings behind a technology make Fletching, Husbandry and Pottery worth more on the right land.
- **Pace.** The strongest effect on the hole: it fills turns 18 to 35 with real choices. Each building is about +2 yield, so Æra I runs a few turns shorter.
- **Bots.** Every line uses a shape the data has (`requiresSite`, `tileYields`, `waters`, a production bonus). The bots price them as they price a Lighthouse.
- **Cost to build.** Small for the rules: seven rows and their card text. Medium in all, because each needs a model on the city and an entry on the flair page.
- **Risk.** Seven more small buildings make the late-game list longer in every town.

## Option 5: A first age with its own game

From Humankind's Neolithic era, without removing the first city. Three parts that work alone or together.

### Part 1: the deeds of the first age

Six public goals in Æra I. Each pays a small lasting boon. The first seat in the world to do each one gets a second prize. The deeds sit where the wager sits in later ages, so they teach the wager.

| Deed | Every seat that does it | The first seat also gets |
|---|---|---|
| Meet another people | +1 gold in the capital | 25 gold |
| Clear a barbarian camp | +1 production in the capital | a free Warrior |
| Find three discoveries | +1 science in the capital | a free Scout |
| Reach six citizens in the capital | +1 food in the capital | a free Worker |
| Raise a Shrine | +1 faith in the capital | 15 faith |
| Connect a luxury or a strategic resource | +1 happiness | 20 culture |

- The sheet shows six rows, each with four seat marks. A mark fills when that seat does the deed, and the first one has a gilt ring.
- When Æra I closes, the seat with the most deeds takes the first bead of the game. A tie goes to the seat that finished first.

### Part 2: herds and forage on the map

- Each start has four to six small marks within 2 to 5 hexes: a herd, a berry thicket, a flint bed, a salmon run.
- A Warrior or a Scout that ends its move on one takes it. The capital gets 15 food or 15 production at once.
- It is a new kind of discovery, close to the start. The existing ones stay 6 hexes away.

### Part 3: a wandering start (not recommended yet)

- The settler may walk for up to five turns. Each forage mark taken before the capital is founded adds its lump to the new capital.
- It is the nearest thing to Humankind's tribe. It changes the first five turns for every seat and bot, and a late capital is a real cost. Try it after the other two parts.

- **Turns 1 to 40.** Turn 1: the deeds sheet opens once, six rows, all empty. Your Warrior walks two hexes to a herd: +15 food, and the capital grows on turn 4. Turn 9: your Scout meets Cleopatra first: 25 gold and a filled mark with a gilt ring. Turn 22: you see that Cyrus has four deeds and you have three. Turn 31: you clear a camp for the fourth.
- **Adds to the build list.** Nothing directly. It gives the first units a job on the map, and it makes the Shrine and the Worker worth building sooner.
- **Order of technologies.** Kept. Two deeds lean on it: the Shrine needs Divination, and a resource needs its improvement's technology.
- **Pace.** The lumps of forage add about one building's worth of production in the first ten turns. The deeds fill the middle of Æra I with goals. Æra I is not shorter, but it is busier.
- **Bots.** A bot scout already walks to discoveries, so forage needs no new behaviour. The bots do most deeds in the course of play. One knob (`weights.deed`) lets the loop tune how much they chase the first-seat prize.
- **Cost to build.** Forage is small: a new kind in `data/discoveries.json` and a mark for the map. The deeds are medium: a register of who did what first (the Triumphs have one), six triggers, a sheet, and the bead at the close.
- **Risk.** First-seat prizes favour a lucky start, so each prize must stay small.

## Option 6 · my own: Works that a worker can raise with no technology

The build list is half of the problem. The idle worker is the other half. Give the worker three small jobs from turn 1, one for each kind of land that has none today.

- **Cairn** (a hill): +1 culture. One for each town.
- **Forest Garden** (a forest or jungle): +1 food, and the trees stay. The row exists (`forestGarden`, retired with an Expansionist card).
- **Fish Traps** (a coast or lake hex next to land): +1 food. A row of this name exists for an Expansionist charter at +2 food and +1 production, so this weaker one needs its own name: a Weir Line.

Each is weaker than the real improvement for that land. A Mine, a Lumber Mill or a Fishing Boat replaces it when its technology arrives.

- **Turns 1 to 40.** Turn 11: your first worker is done and your capital sits in forest and hills. Today it builds one farm and waits. Now it plants two forest gardens and raises a cairn, and you can see all three on the map. Turn 25: Mining arrives and the worker starts on the hills.
- **Adds to the build list.** Nothing in the city. Three jobs in the worker's list.
- **Order of technologies.** Kept. The strong improvements stay where they are.
- **Pace.** About +3 yield in a capital that has none of this today. Small, and it helps the weak starts most.
- **Bots.** The worker plan reads improvements from the data (`workers.improvements`). The new rows must join that list with a low value.
- **Cost to build.** Small. Two or three improvement rows, their marks on the map and one replace rule.
- **Risk.** It overlaps the fishing boat move in option 3 and the Expansionist charter that opens fish traps.

## Option 7 · my own: A camp you clear leaves something to build

Barbarian camps are the main event on the early map. Today a cleared camp pays 25 gold and 25 food and is gone. Let it leave a site.

- A cleared camp leaves a **cleared ground** on its hex for 20 turns.
- A Worker can raise an **Outpost** there in three turns: the hex and the six around it join your nearest town, if that town is within five hexes.
- A Settler that founds a town on a cleared ground starts with a Palisade.

- **Turns 1 to 40.** Turn 14: a camp appears four hexes from your capital, next to a marble hex. Turn 20: two warriors clear it. Turn 23: your worker builds an Outpost, your border jumps and takes the marble. You fought for a place and the map shows it.
- **Adds to the build list.** A reason for a second Warrior and a second Worker that is not filler.
- **Order of technologies.** Untouched.
- **Pace.** No direct yield. It turns units that were filler into a plan.
- **Bots.** The bots hunt camps today (`camps`, `military.campHuntRadius`). They need one new worker job and one new bonus in the site appraisal.
- **Cost to build.** Medium. The data has an Outpost improvement row. It needs the timed ground, the border rule and the fog rule for the mark.
- **Risk.** A free border jump can let a strong seat take land without settlers.

## Recommendation: One package

Take four pieces. Together they put something in the build list on turn 1, give the first units a job, and fill turns 18 to 35.

1. **Deeds and forage** (option 5, parts 1 and 2). The first age gets its own goals, and the wager is taught early.
2. **The Hall of Deeds** (option 2) as the home of the deeds. Its panels are the deeds.
3. **Four land buildings** (option 4): Threshing Floor, Well, Fish Weir and Herder's Fold. Add the other three after a playtest.
4. **Three moves** (option 3): the Lumber Mill to Bronzeworking, the Smithy to Smelting, the Watermill to The Wheel. Leave the Monument where it is, so the Hall is the turn-1 culture and Stonecraft stays a choice.

- **What combines well**: 2 with 5 (one system, two faces). 4 with 3 (public works in Æra I for the Expansionist cards). 6 with 7 (both give units work on the map).
- **What to hold**: the projects (option 1). They are the one option that can turn into a chore. If turns 18 to 35 are still thin after the package, add Survey the Bounds alone.
- **The same arithmetic after the package**: turn 1 shows four units, the Hall and two or three land buildings. The 200 production of forty turns has about 240 worth of good things to choose from, so the player chooses and no longer fills.

## The questions for Part 2

### Question 4: Do the deeds of the first age pay a bead?

**Recommended.** Yes, one bead for the seat with the most deeds when Æra I closes. It is the first bead of the game and it teaches what a bead is.

### Question 5: May a first-age building be something every seat builds first?

**Recommended.** Yes for the Hall of Deeds, because it is the frame for the deeds. No for the others: each land building needs a site, so the list differs from town to town.

### Question 6: How many of the land buildings do we add now?

**Recommended.** Four: Threshing Floor, Well, Fish Weir and Herder's Fold. Three of them are public works. Add the Smokehouse, the Kiln and the Boundary Stone if the first playtest still has a hole.

# Part 3: difficulty tiers

The user, 2026-11-22: *"For difficulty, i was thinking we could have many tiers, similar to how slay the spire handles ascensions. Something like tier 1: barbarians gain +2 attack strength tier 2: ai players +20% growth and production tier 3: barbarian units spawn at the end of each age tier 4: all buildings and units cost 20% more, etc. playing the game at tier 5 will include all tiers before it, so the game gets progressively harder at each tier. I think there could be many tiers, maybe like 10-20 tiers?"*

The user, 2026-11-22: many tiers, as Slay the Spire's Ascension. Each tier adds one rule. A game at tier 5 has the rules of tiers 1 to 5.

### The facts

- The game has no difficulty setting today (`docs/beta-checklist.md`, "Difficulty levels").
- The levers that exist: the bot knobs and five personas in `data/ai.json` (balanced, wide, tall, zealot, warmonger), the barbarian rules in `data/rules.json` (`barbarians.combatBonus` is 2 flat points today), and the arena page that measures bots.
- A save is `{config, log}` and must replay. So the tier is a field of `GameConfig`, beside `mapgenOverrides` and the barbarians flag. Nothing may write into the rule tables at run time.
- Slay the Spire has 20 levels. Each adds one rule, each is opened by a win at the level below, and the record is kept for each character.

### The rules of the ladder

- Each tier adds exactly one rule, in one line that fits on the setup screen.
- Combat strength changes in flat points only. Yields, costs and growth may change by a percentage.
- "Rivals" are the computer seats. "You" are the human seats. In a game of several humans, every human is "you".
- The ladder mixes six kinds, so that a climb changes how you play: the wild, richer rivals, sharper rivals, a tighter player, the clock, and rules against one strategy.

### The ladder

Tier 0 is the standard game, with the tuned bots.

| Tier | The one line | Kind | Lever | Compounds, and notes |
|---|---|---|---|---|
| 1 | Barbarians gain +2 strength. | The wild | `rules.barbarians.combatBonus`, 2 to 4 | No. The user's first example, kept. The knob is one flat line on every barbarian fight, attack and defence. |
| 2 | Rivals gain +20% growth and production. | Richer rivals | New: one labelled line for computer seats in `cityYieldPercents` and in the growth surplus | With 12 and 14. The user's second example, kept. |
| 3 | When an age closes, every barbarian camp sends out two raiders. | The wild | New: a spawn on the `ageClosed` announcement, at each standing camp | With 7 (more camps mean more raiders). The user's third example. Adjusted: "spawn" needed a place, so the raiders come from the camps that stand. |
| 4 | Your buildings and units cost 20% more. | A tighter player | New: one line in `explainBuildingCost` and `explainUnitCost` for human seats | With 8. The user's fourth example. Adjusted: it applies to you alone. If it applied to all seats it would slow the rivals too and cancel tier 2. |
| 5 | Rivals start with one more Warrior and a Worker. | Richer rivals | `rules.startingUnits`, read for each seat | No. |
| 6 | Rivals declare war sooner and join wars against the leading seat. | Sharper rivals | `war.declareThreshold`, `war.dogpileSeats`, `military.aggression` in `data/ai.json` | With 10 and 15. |
| 7 | Barbarian camps appear twice as often and hold one more unit. | The wild | `barbarians.campEveryTurns` 2 to 1, `maxUnitsPerCamp` 2 to 3 | With 1 and 3. Check that a capital survives turn 20 at tier 7. |
| 8 | Your Order drafts cost 20% more culture. | A tighter player | New: one multiplier on the draft ladder for human seats | With 4. |
| 9 | An age closes 6 turns after its countdown starts, not 10. | The clock | `rules.wager.countdown`, 10 to 6 | Mild. It bites harder under a ranking format, where the last turns decide. |
| 10 | Rival soldiers gain +2 strength. | Richer rivals | New: one flat strength line in `planCombat` for computer seats | With 6 and 15. The first tier that makes a war against a rival hard to win by numbers. |
| 11 | Each of your towns after the fourth costs you 1 more happiness. | Against wide play | New: one line in the happiness list | With 4. Expansionist seats feel it most. |
| 12 | Rivals gain +20% science and culture. | Richer rivals | The tier 2 line, two more yields | With 2 and 14. The rivals now lead the ages, so the world clock runs against you. |
| 13 | When an age closes, the seat with the smallest army takes a malice. | Against turtling | New: one call at the close. The malice deck exists (`data/malices.json`) | With 9 (closes come with less warning). A rival can take it too. |
| 14 | Rivals start with a second town. | Richer rivals | New: a second founding in `newGame` for computer seats | With 2 and 12. This is the famous head start. |
| 15 | When you can begin the Magnum Opus, every rival declares war on you. | The clock | New: one trigger on the Opus door for a human seat | With 6 and 10. The last tier: you must win the game while defending it. |

### Spare tiers

| Spare | The one line | Kind | Lever | Use |
|---|---|---|---|---|
| 1 | Your towns are founded with four hexes fewer. | A tighter player | New: the founding claim in `foundCityAt` | Swap for 8. |
| 2 | You need 2 more beads to begin the Magnum Opus. | The clock | `rules.threshold` in `data/beads.json`, for human seats | Swap for 9. |
| 3 | Barbarian horsemen ride from turn 15, not turn 30. | The wild | `barbarians.horsemanFromTurn` | Swap for 7. |
| 4 | Each rival plays the persona that suits its leader best. | Sharper rivals | The persona choice in the setup, from the arena's results | Swap for 6 when the tuner has results for each leader. |

### What "smarter" can mean with these bots

- The bots do not search deeper on demand. They follow one sheet of knobs.
- So "sharper" has three true meanings: a more aggressive sheet (tier 6), the best persona for each leader (spare 4), and the tuned sheet against a looser one.
- The tuned sheet is the standard game, tier 0. The looser sheet is the easy setting below it.

### Below tier 0

- **Two easier settings**, because the beta's testers will differ in skill.
- **First game**: rivals get 20% less growth and production, and no rival declares war on you in Æra I or II.
- **Easy**: rivals get 20% less growth and production.
- They fit a ladder that only adds: going from First game to Easy to tier 0 removes one help each step. The setup screen shows them as two steps below zero.
- A win on an easier setting is marked with its name, and it does not count as a cleared tier.

### Unlocking and the record

- **For the beta: every tier is open.** A tester should be able to try tier 10 on the first day and tell us that it is too hard.
- **After the beta: a win at a tier opens the next one**, as in Slay the Spire, with a line in the settings that opens them all.
- **The record is kept for each leader**, sixteen of them, and the setup screen also shows the best tier overall. A record for each pair of decks is the same thing, because a leader is a pair of decks.
- **The record lives in the browser's storage**, in one key. An export button writes it to a profile file, and an import button reads one back.
- **A cleared browser costs the record and nothing else** while all tiers are open. After the beta it would lock the tiers again, so the "open all" line and the profile file must exist before the lock does.

### What a win is

- A tier is cleared when you close the Magnum Opus. The game has no other victory.
- You lose when a rival closes the Opus, when you are eliminated, or when you resign.
- A game stopped before the end counts as nothing.
- A clear counts on any map size with at least three rivals. The record keeps the seat count beside the tier.

### What the screens show

- **The setup screen**: a stepper, "Tier 4", and under it the four lines of rules, with the newest line in ink and the lower ones faint. Beside the leader: "Best with Cyrus: tier 3".
- **In the game**: the tier number on the turn card, with the list on hover.
- **The ending page**: "Tier 4 cleared with Cyrus", the list of rules, and the line that tier 5 would add.

### The bot loop

- **Tune the bots at tier 0 first.** That sheet is the base for every tier.
- **Cheap tiers, no new tuning**: 2, 5, 10, 12 and 14 give rivals more, and 4, 8 and 11 take from you. The bots play the same way.
- **Check in the arena**: 1, 3 and 7 make the wild harsher for the bots too. Run five games and confirm that no bot seat dies to barbarians.
- **Tiers that are bot work**: 6 is a sheet of knobs. 9 changes what `wager.ageTurns` should be. 13 needs the bots to hold an army at a close. 15 needs nothing from the bots but a war plan against one target.

### Cost, and the smallest version

- **The frame** is small: a `tier` field in `GameConfig`, a table `data/difficulty.json` with one row for each tier, and one reader that the rules ask. Each tier is then one small change at the place named in its row.
- **Five tiers and two spares move a knob that exists** (1, 5, 6, 7, 9 and spares 2 and 3). The others each add one line or one trigger.
- **The smallest version for the beta**: the First game setting and tiers 0 to 5, all open, with the tier shown on the setup screen and the ending page. No lock. The record of the best tier for each leader is one key in the browser's storage and can ship with it or just after.

## The questions for Part 3

### Question 7: Does a tier that makes costs higher apply to you alone, or to every seat?

**Recommended.** To you alone. A rule that slows every seat makes the game longer and not harder. This is the one change to your four examples.

### Question 8: Are the tiers locked behind wins?

**Recommended.** Not in the beta. Lock them after it, tracked for each leader, with an "open all" line in the settings.

### Question 9: How much do we ship for the beta?

**Recommended.** The First game setting and tiers 0 to 5, all open, with no export. Build the rest of the ladder after the bot loop.

## The user's rulings (2026-11-22, comments on the page)

### The first age: ruled, ready to build

The user: "ok reading through these, i dont think any of these feel that
satisfying. I think the hall of deeds makes sense, but lets make it much more
simple: +4 culture +2 authority. Units that fall in combat yield culture equal
to 50% of their combat strength. Let's make the granary unlock right away,
with agriculture. Let's swap the order of calendar and fletching, so
plantations arrive earlier. Let's have monuments unlock with pottery. Lets
give shrines +2 faith, so they are more worth building early, and move them to
husbandry. Let's move sailing to the first tier, and have agriculture be its
only prerequisite. Let's also move lumbermill to bronzeworking. For later, i
think age 2 could use 2-3 more technologies."

| # | Change | Note |
|---|---|---|
| 1 | **The Hall of Deeds:** +4 culture, +2 authority. Units of yours that fall in combat yield culture equal to 50% of their combat strength. | This replaces its present effects. It stays an empire building unless the user says otherwise. The culture is a share of a strength figure, not a change to strength, so the flat-strength rule is not touched. |
| 2 | **The Granary** unlocks with Agriculture. | |
| 3 | **Calendar and Fletching swap places** in the order of technologies, so that plantations come earlier. | |
| 4 | **The Monument** unlocks with Pottery. | |
| 5 | **The Shrine** gives +2 faith and unlocks with Husbandry. | The user confirmed 2 faith per turn in total. The old Shrine gave 1. |
| 6 | **Sailing** moves to the first column, with Agriculture as its only prerequisite. | |
| 7 | **The Lumber Mill** unlocks with Bronze Working. | |
| 8 | Later: age II wants two or three more technologies. | Not designed. |

A second idea, "another idea i'm toying with: adding a new technology that
adds two buildings": **the Mill,** +2 food and +2 gold, a gold building; and
**the Public Fountain,** +1 happiness, and +1 more if the town has a garrison
("maybe some other criteria for the additional happiness?"). Not ruled: the
technology has no name or place yet, and the Fountain's second clause is open.

The seven options of the page are not adopted.

### Difficulty: the user's ladder

Each comment replaces the line of its tier. On tier 11 the user wrote "rare
and uncommon orders appear less frequently" and then "lets move this one to
tier 5 and move everything back". The ladder that results:

| Tier | Rule | The user's words |
|---|---|---|
| 1 | Rivals and barbarians gain +2 strength. | "rivals and barbarians gain +2 strength" |
| 2 | Rivals gain +20% growth and production. | no comment: as proposed |
| 3 | When an age closes, barbarians spawn across the map, about as at the start of the game, each camp with two units. | "When an age closes, barbarians spawn across the map. (in practice, this should correspond roughly the same as the age 1 barbarian spawn, and they also start with two units)." |
| 4 | Your buildings and units cost 25% more. | "lets make this 25%" |
| 5 | Rare and uncommon Orders appear less often. | "rare and uncommon orders appear less frequently", moved here |
| 6 | Rivals start with one more Warrior and a Settler. | "Rivals start with one more warrior and a settler." |
| 7 | Rivals gain +30% to all yields. | "Rivals +30% to all yields" |
| 8 | Your Order drafts and great people cost 30% more. | "your order drafts and great people cost 30% more culture" |
| 9 | Barbarians and rivals produce units 30% faster. | "barbarians and rivals produce units 30% faster." |
| 10 | Rivals gain +50% production toward wonders. | "Rivals +50% production towards wonders" |
| 11 | Buying with faith and gold costs you 30% more. | "purchasing with faith and gold 30% more expensive" |
| 12 | Rivals gain +25% science and culture. | "+25%" |
| 13 | Wager milestones are 40% higher for you. | "wager milestones are 40% higher for you" |
| 14 | Technologies cost 30% more. | "technologies are 30% more expensive" |
| 15 | Rivals gain +50% to all yields. | "Rivals +50% to all yields." |

Readings to confirm with the user:
- **Tier 15 against tier 7:** does +50% replace the +30%, or add to it (+80%)?
  And do tier 2 and tier 12 add on top? The Claude session's reading: every
  tier adds, as in Slay the Spire, so tier 15 means all yields at +80%, with
  growth, production, science and culture higher still. If that is too much,
  tier 15 should read "+50% in place of +30%".
- **Tier 8:** drafts cost culture; a great person costs renown. Read as: the
  culture price of a draft and the renown price of a great person each rise
  by 30%.
- **Tier 11** is the "buys more" rule in reverse: your gold and faith buy
  less.
- **Tier 14:** for the player only, or for every seat? Read as the player
  only, like tiers 4, 8 and 11.
- **Tier 5:** how much less often. A first figure for the bots to test: the
  rarity odds move from 60 / 30 / 10 to 75 / 20 / 5.
- Also from the user, not a tier: "Not sure if this is in, but barbarians
  should opt to pillage your improvements before they attack your city." A
  question for Astra: do they today?

### The wagers: a direction, not yet a ruling

On format B, the ranking: "I like this ranking idea. How about: each wager has
a fixed goal. If you cross the goal, you gain a bead. If you lead the world at
age end, you gain an additional bead. you must wager on one of the stakes. If
you fail to achieve fixed goal (milestone?) you take some kind of penalty. The
government malice is ok, but maybe there's something better we could do, maybe
the malice penalizes certain areas, but also unlocks a powerful catch up
mechanic at the same time? Or maybe if you win a ranking, you actually take a
penalty in the next age for doing so well?"

On the list of wagers: "let's think about the things that make the game fun,
and have the wagers reinforce those things. Right now, the parts of the game
that feel fun: drafting something that fits your empire's goals, seeing
increasing yields as you accumulate cards in the 'in-play' screen, exploring
and cultivating the map, building wonders, gaining great people, what others?
I'd like for the wagers to re-inforce fun gameplay loops, which makes me feel
like accumulating a sum of all six yields is a good wager, similar to how
Balatro hands feel. What do you think? Maybe some examples: sum of combat
strength across all units (veterancy levels count); Sum of all six yields; sum
of all yields from trade routes; sum of all yields from great people (their
hex values + legacies)."

On The Field of Glory: "lets' cut, rivals might not have enough soldiers for
this." Cut.

So the format in the user's words: **a fixed goal for a bead, and one more
bead for leading the world at the age's end; a seat must stake one wager, and
a failed stake has a cost.** What the cost is, and what the wagers count, is
still in discussion.

### The four readings, confirmed (2026-11-22)

The user: "1. adds, the hardest difficulty should be brutal 2. yup 3. only you
4. +2 faith total."
1. **Every tier adds.** At tier 15 the rivals have +80% to all yields (tier 7
   and tier 15), with tier 2 and tier 12 on top. "the hardest difficulty should
   be brutal".
2. **Tier 8:** the culture price of a draft and the renown price of a great
   person each rise by 30%.
3. **Tier 14:** technologies cost 30% more for the player only.
4. **The Shrine gives +2 faith in all.**

More wagers from the user, to add to the list: "total population. total
cumulative faith+gold gain. total cumulative science + culture gain. what are
some others that could be fun?"

### Wagers the user liked (2026-11-22)

The user: "highest production of one city is great, improved hexes is great,
buildings finished this age is cool, different luxuries you hold is good, gold
and faith spent good." On the largest single payout: "thats so cool but idk if
it works with the game." The user's own three: total population; faith and
gold gained over the age; science and culture gained over the age.

Kept for the list: the highest production of one city, improved hexes,
buildings finished this age, different luxuries held, gold and faith spent
this age, total population, faith and gold gained, science and culture
gained. The largest single payout is open.
