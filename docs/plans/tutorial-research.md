# Tutorials in other games: research for Magister Ludi's tutorial

Research for the user's request (2026-10-14): *"can you take a look at how other grand strategy/ 4X games handle their tutorial? lets start a tutorial design + implementation doc."* Two research passes, each checked against developer diaries, patch notes, reviews, rulebooks and Steam achievement data:
- **4X and grand strategy:** Civilization V, VI and VII; Humankind; Old World; Millennia; Ara: History Untold; Endless Legend and Endless Space 2; Age of Wonders 4; Stellaris; Europa Universalis IV and V; Hearts of Iron IV; Crusader Kings III; Victoria 3; Total War: Warhammer III; The Battle of Polytopia.
- **Everything around them:** deckbuilders and roguelikes (Slay the Spire, Balatro, Monster Train, Hades, Into the Breach, Against the Storm, Hearthstone, Marvel Snap, Magic: The Gathering); strategy games known for clean onboarding (Factorio, Northgard, Frostpunk, Dorfromantik, Mini Metro); board games (Gloomhaven: Jaws of the Lion, Root, Twilight Imperium 4, Through the Ages, Spirit Island); and the design literature and data.

The design that uses this is `docs/plans/tutorial.md`. This doc is a brainstorm, not a ruling.

## The short version

1. **Teach inside the player's first real game.** Older 4X games ran a separate tutorial game (Civ V, Civ VI, Hearts of Iron IV, Europa Universalis IV). Newer ones teach inside a normal game (Crusader Kings III, Victoria 3, Civ VII, Ara, Europa Universalis V). The research data agrees: players learn more from experimenting than from reading.
2. **Every extra chapter loses players.**
   - Old World's five learn-to-play scenarios were finished by 53%, 40%, 25%, 16% and 10% of players.
   - In Warhammer III, 58% won the prologue's first battle and 26% finished the prologue.
   - Fewer than half of Civ VI's players ever finished a game.
3. **Teach at first contact, one idea at a time.** Lessons arrive the first time a system appears: Crusader Kings III's "reactive advice", and Civ VII's tips "exactly when you first encounter something new". Help given at the moment it was needed raised play time by 16% and progress by 40% in a 45,000-player study. Too many pop-ups at once is the usual failure: Civ V had to patch its pop-up queue, and Stellaris 4.0 called its early game "a seemingly endless barrage of notifications".
4. **Spend the teaching on what is unfamiliar.** Tutorials helped only in the most complex and unusual game of that study. Balatro leans on poker, which players already know. Our Civ-like board can lean on genre knowledge; the cards, chairs and decks are the new part.
5. **Nested tooltips are the most praised help tool of the last five years:** Crusader Kings III, then Victoria 3, Stellaris and Europa Universalis V, plus Old World. Two details matter: a lock the player controls, and a way to go back one level. They still need one searchable, cross-linked reference behind them.
6. **Numbers must explain themselves, and so must a disabled button.** Europa Universalis V added breakdown tables and "action hints" that say why an action is unavailable. "Why can't I build this yet?" is one of the most common complaints.
7. **Card games introduce a large pool slowly.** Magic budgets complexity at its commonest cards ("New World Order"). Marvel Snap's first pool is 46 simple cards, and its unlock order puts an enabler before its payoff. Spirit Island gives a first game a fixed order of power cards instead of a draft. Balatro starts with one deck and 105 of 150 jokers.
8. **Whole systems can wait for a first game.** Through the Ages has a Simple Game with no military, politics, happiness or corruption. Hades holds back its difficulty system until the first escape. Against the Storm teaches its meta layer after the second game.
9. **Let players choose how much help they get, and let them reopen it.** Civ VI and Humankind ask about the player's experience; Stellaris offers full, medium or no tutorial; Civ VII lets players mute single advisors; Victoria 3 offers "how" and "why" lessons. Help that cannot be switched off annoys later (Old World), and help that cannot be found again frustrates (Old World's tooltip tutorial).
10. **Warnings outlast tutorials.** Civ VII's "Only Warnings" setting keeps the one part of the advice experienced players still want.

## 4X and grand strategy

- **Civilization V:** short tutorial scenarios, a "Learn as you play" mode (a normal game with all advice on), four advisors and the Civilopedia. A patch had to fix the pop-up queue and turn advice down for experienced players. Players learned to distrust weak advice. [Patch notes](https://www.gamewatcher.com/2012-15-06-civilization-v-update-brings-steam-workshop-to-game)
- **Civilization VI:**
  - **Structure:** a separate scripted tutorial game, then one advisor. A help level is picked at setup ("New to Civilization", "New to Civilization VI").
  - **Reception:** the tutorial game could not be saved and left rules unexplained, and veterans tell newcomers to ignore the advisor.
  - **Finishing:** Ed Beach said fewer than half of players finished a game, and Civ VII's ages were designed partly to fix that. [Game Developer](https://gamedeveloper.com/design/firaxis-big-swing-with-civilization-vii-convincing-players-to-actually-finish-their-games)
- **Civilization VII:**
  - **Structure:** teaching inside a normal game, on by default the first time. Four advisors each lead a quest chain, the player chooses which are active, and their emblems mark which choices serve which style.
  - **After the tutorial:** "Only Warnings" speaks up only before a major setback.
  - **Reception:** reviewers called it the best tutorial in the series. Players called the Civilopedia and tooltips thin at launch, with entries that mention concepts without linking them. [Beginner's guide](https://civilization.2k.com/civ-vii/news/civilization-vii-beginners-guide/), [Game8](https://game8.co/games/Civ-7/archives/498521)
- **Humankind:**
  - **Structure:** at first launch it asks how familiar the player is with Humankind and with 4X, and the answer decides which tutorials run.
  - **Reception:** the beginner's tutorial "absolutely nails the level of hand-holding", but beta players found its pop-ups confusing. [TheSixthAxis](https://thesixthaxis.com/2021/08/16/humankind-review-a-different-breed)
- **Old World:**
  - **Structure:** learn-to-play scenarios (moving units, then cities, then characters, then the wider empire), prompts in normal games, an encyclopedia, and cascading tooltips the player can freeze with the middle mouse button.
  - **Finishing:** the scenario figures above.
  - **Complaints:** the tooltip tutorial disappeared and could not be found again, a frozen tooltip had no way back one level, tooltip sums did not add up, and the prompts could not be switched off. [Steam achievements](https://steamcommunity.com/stats/597180/achievements), [Quarter to Three](https://www.quartertothree.com/fp/2021/07/01/bringing-new-eyes-to-old-world/)
- **Millennia and Ara: History Untold:** tips inside a normal game.
  - **Millennia:** players send newcomers to YouTube guides that run for hours.
  - **Ara:** a reviewer was "truly lost in the depth of the systems", ran out of money on upkeep he had not seen coming, and expects most players to lose their first campaign. [Gaming Trend](https://gamingtrend.com/reviews/ara-history-untold-review-building-off-a-set-foundation/)
- **Endless Legend and Endless Space 2:**
  - **Endless Legend:** a half-hour tutorial, then each faction's quest chain works as an embedded tutorial.
  - **Endless Space 2:** its advisor was praised, but one of its quests needed a UI option that was hidden.
  - **Endless Legend 2:** delayed partly to improve onboarding, after beta players said visual clutter hid key mechanics. [HonestGamers](http://www.honestgamers.com/14747/pc/endless-space-2/review.html)
- **Age of Wonders 4:** a campaign whose first realm holds the guided tutorials, tips that can stay on in custom games, and an encyclopedia on F1. Players say it "tends to overexplain", and one expected a two-hour tutorial realm and spent eight hours in it. [Steam](https://steamcommunity.com/app/1669000/discussions/0/3828666283438719225)
- **Stellaris:**
  - **Structure:** a tutorial robot asks for full, medium or no tutorial. Nested tooltips arrived in 3.8.
  - **Fixes in 4.0:** the Databank, a searchable glossary every concept tooltip links into. Purely informative events became simple notifications, and suggested tasks and a "focused aspiration" were added to teach new players. [PCGamesN](https://www.pcgamesn.com/stellaris/update-4-0)
- **Europa Universalis IV and V, Hearts of Iron IV:**
  - **EU4 and HoI4:** tutorials that tell players what to click but not why. Players learn from wikis and YouTube, which go out of date with every patch.
  - **EU5:** adds key terms that open short explanations, tables for values with many sources, and "action hints" for unavailable actions. A review still found it unclear "why you can't build that particular building just yet". [TheSixthAxis](https://thesixthaxis.com/2025/10/31/europa-universalis-v-review)
- **Crusader Kings III:**
  - **Structure:** a guided start with one goal (unite Ireland), then "reactive advice" the first time each system appears, which can be reset in settings. Nested tooltips lock after a timer or on a middle-click, and there is a searchable encyclopedia.
  - **Reception:** reviewers praised the introduction and called the nested tooltips "a really fantastic system". Others found the tutorial dense, or said it only "scratches the surface". [Dev diary #16](https://admin-forum.paradoxplaza.com/forum/developer-diary/ck3-dev-diary-16-tutorials-and-tooltips-and-encyclopedias-oh-my.1345581), [GamingOnLinux](https://www.gamingonlinux.com/2020/10/crusader-kings-iii-is-quite-a-joy-to-learn-even-if-youre-not-particularly-smart)
- **Victoria 3:**
  - **Structure:** an optional "Learn the Game" objective inside a normal game. Challenges are fitted to the player's country and build on each other, each opening a short "how" lesson (where in the interface) and "why" lesson (what it is for), taken in any order or not at all.
  - **Design choice:** the team rejected novice, intermediate and expert tiers in favour of letting players choose the kind of information they want.
  - **Reception:** one challenge asked for a law before the technology it needed. [Dev diary #51](https://www.paradoxinteractive.com/games/victoria-3/news/dev-diary-51-tutorials)
- **Total War: Warhammer III:** an optional story prologue that brings in movement, then battles, settlements, recruiting and heroes, then more freedom. PC Gamer: "I finally understand the series." It takes several hours, and 26% of players finished it. [PC Gamer](https://pcgamer.com/total-war-warhammer-3-prologue)
- **The Battle of Polytopia:** a short guided first game, then a game small enough to teach itself; each node of the tree unlocks one visible thing. Depth "gradually reveals itself". [Mobidictum](https://mobidictum.com/christian-lovstedt-midjiwan-polytopia-minimalism/)

## Deckbuilders, strategy and board games

- **Slay the Spire:**
  - **Teaching:** enemies show their intent, so the rules can be read off the board.
  - **An adaptive start:** after a run that died before the first boss, the opening offer is two safety choices.
  - **Gating:** characters, cards and the difficulty ladder unlock over runs. [Wiki](https://slaythespire.wiki.gg/wiki/Neow)
- **Balatro:**
  - **Teaching:** it leans on poker, as an "extended low-calorie tutorial". The demo's Four Fingers joker, which bends a rule, was "the first moment people really understood Balatro's hook".
  - **Gating:** one deck at the start, and 45 of 150 jokers unlock through goals shown in the collection. An "Unlock All" button lets veterans skip. [Game Developer](https://gamedeveloper.com/design/balatro-creator-unveils-a-few-slick-signposting-strategies)
- **Hearthstone's original tutorial:** six fights teaching one idea each (playing cards, mana, trading, Taunt and Charge, hero powers, weapons). The first two could not be lost.
  - **What went wrong:** Ben Brode said a "shocking percentage" finished without understanding Taunt, because of ambiguous text. Blizzard found it by filming hundreds of new players.
  - **Today:** new players start with one class and unlock the rest along a track. [Wiki](https://hearthstone.wiki.gg/wiki/Tutorial_(removed))
- **Marvel Snap:**
  - **The first match:** it uses one location and no costs or abilities.
  - **The betting rule** arrives after a few hours.
  - **The card pool:** the first pool is 46 cards that introduce the core ability types. The unlock order puts enablers before their payoffs (Ongoing cards before Spectrum, which buffs them). [MobileGamer](https://mobilegamer.biz/second-dinner-reveals-the-secrets-of-marvel-snaps-onboarding-and-card-design/)
- **Magic: The Gathering:**
  - **New World Order:** complexity at the commonest rarity is a budget, because beginners mostly see commons.
  - **"Lenticular" cards:** they read simply to a beginner and reveal depth later.
  - **Arena:** it opens with one-colour matches before two-colour decks. [Rosewater](https://magic.wizards.com/en/news/making-magic/new-world-order-2011-12-05)
- **Factorio:**
  - **The old tutorial's problem:** it took 30 to 45 minutes to reach the core of the game, and its tight steps taught players to finish the tutorial rather than learn the ideas.
  - **The rewrite:** it was scrapped and the old campaign returned, with each message channel given one job.
  - **Tips and tricks:** they unlock with progress, show live simulations, and are deliberately not a wiki. [FFF #241](https://factorio.com/blog/post/fff-241), [FFF #361](https://factorio.com/blog/post/fff-361)
- **Gloomhaven: Jaws of the Lion:** a learn-to-play book replaces the rulebook for the first sessions. Scenario 1 teaches only movement and combat, and each later one adds rules. [Review](https://opinionatedgamers.com/2020/07/29/gloomhaven-jaws-of-the-lion-game-review-by-brandon-kempf/)
- **Root:** three documents: a walkthrough that scripts two turns with named cards, a learn-to-play book, and a numbered reference. Its own view: "Root is best learned organically."
- **Through the Ages:** a Simple Game (two ages, no military, politics, happiness or corruption), then Advanced, then Full. "You should not try the Full Game until you know how long it takes you to play the Advanced Game." [Rulebook](https://rulespal.com/through-the-ages-story-of-civilization/rulebook)
- **Spirit Island:** a first game uses a low-complexity spirit and its Power Progression, a fixed order of power cards instead of a draft. [Rulebook](https://rulespal.com/spirit-island/rulebook)

## The design literature and data

- **Teach through play:**
  - Super Mario Bros. 1-1 holds everything the player needs to learn.
  - Kishōtenketsu: teach a mechanic, let players develop it, then twist it.
  - Daniel Cook's skill atoms: each skill is a loop of act, feedback and updated understanding, and the chain shows which unlearned skill blocks the next. [Lost Garden](https://lostgarden.com/2007/07/19/the-chemistry-of-game-design/)
- **Test with real players:** Valve treats designs as hypotheses and playtests as experiments. Left 4 Dead 2's hints stop after a few showings or successes. [GDC 2009](https://cdn.fastly.steamstatic.com/apps/valve/2009/GDC2009_ValvesApproachToPlaytesting.pdf)
- **Avoid text walls:** Ernest Adams's first tutorial mistake is "make the player read a lot". Progressive disclosure keeps the main options visible and the rest one step away.
- **Andersen et al., CHI 2012 (45,000+ players, three games):**
  - Tutorials helped only in the most complex, least conventional game: +29% play time and +75% progress.
  - Instructions given when needed raised play time 16% and progress 40%.
  - No evidence that restricting freedom helps.
  - "Players seem to learn more from experimentation than from reading text." [Paper](https://grail.cs.washington.edu/projects/game-abtesting/chi2012/)
- **Recorded causes of early quitting:** one rule misunderstood (Hearthstone's Taunt), too much at once (a Magic prerelease), a long wait before the core of the game (Factorio), and a single stuck step.

## Patterns

- **Teach inside the real game, by doing;** text is the weakest channel.
- **Spend the teaching on the unfamiliar,** and lean on genre knowledge for the rest.
- **Teach at first contact, one idea per encounter,** each building on the last.
- **Keep the first card pool small and simple,** and budget complexity by age; put an enabler before its payoff, and one rule-bending card early.
- **Whole systems can wait for a first game.**
- **Make early failure cheap and adapt the start.**
- **Show the rule on the board and preview before the player commits** (Into the Breach, Slay the Spire's intents).
- **Separate the teacher from the reference,** give each message channel one job, and let every number and every disabled button explain itself.
- **Let players choose how much help, switch each kind off, and reopen any lesson;** keep warnings after the tutorial.
- **Watch real newcomers, and measure where they drop off.**
- **Roguelike unlocks assume many short runs.** In a game that lasts hours, most gating has to happen inside the first game, by age or milestone.
