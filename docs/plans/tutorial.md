# The tutorial: design and implementation plan

**Status:** approved by the user, 2026-10-15: the decisions in section 7 and the answers in section 10. T0 and T1 are built (section 8); the rest follows the plan there.

- **The user's ask:** *"can you take a look at how other grand strategy/ 4X games handle their tutorial? lets start a tutorial design + implementation doc."*
- **The research behind it:** `docs/plans/tutorial-research.md`.
- **What it supersedes.** Two plans that were never built, now in `docs/deprecated/`:
  - `tutorial-redesign.md`, the September plan of 2026-09-14. Its architecture, interface contract and storage rules carry forward here in short form. Its lesson copy does not, because it was written before the decks.
  - `pamphlet-draft.md`, the pamphlet's second edition.
- **What stays in force:** `docs/pamphlet.md` stays the spec of record for the pamphlet that ships today, until its replacement ships.

## 1. The problem

What a new player has to learn, in roughly the order they meet it:

| When | Familiar to a Civilization player | New in this game |
|---|---|---|
| Turns 1–10 | selecting and moving units, founding a town, production, research, End Turn, worked tiles, yields | every number's breakdown |
| Age 1 (to about turn 55) | workers, exploring, ruins, barbarian camps, a second town, happiness | authority; culture as the draft currency; the draft (a hand from two decks, pick one or pass); chairs and seating; commissions, charters, levies, tended works; only the current band is dealt |
| Age 2 | religion and prophets, caravans, great people, war and peace, wonders | governments and doctrines; more chairs; unrest in a captured town; war weariness from net losses; ranks |
| Ages 3 and 4 | later units, larger wars | wagers and malices; beads; the Magnum Opus, whose builder wins |

Two things follow:
- **The second column is what everyone must be taught.** A Civilization player can skip most of the first column. Today's tutorial spends nearly all its words on the first column.
- **The load is front-loaded.** By turn 55 a player has met authority, culture as currency, drafts, chairs, two decks and four card keywords, on top of the Civilization basics.

## 2. What exists today

- **The opening walkthrough** (`src/ui/tutorial.ts`):
  - **The steps:** eleven, from "select your settler" to "end the turn", with a coach card and a spotlight. An action step advances when the player does the action, never on a Next button.
  - **Interface only:** it imports nothing from `src/sim/` (pinned by a source test), never issues a command, and is not in the save. It hears about the game through signals from `main.ts`, and its memory is in `localStorage`.
- **One-time notes** (same file): the first draft, discovery, combat forecast, religion, caravan, great person, beads (three pages), a rival sighted, a starving town, unhappiness, and authority overreach.
- **The pamphlet** (`src/ui/pamphlet.ts`, spec `docs/pamphlet.md`): eight picture pages shown before the walkthrough, and reachable from the Compendium afterwards.
- **The Compendium** (`compendium.html`, `src/ui/compendium.ts`):
  - Every entry is generated from data rows and the simulation's own describers, with stable `kind:id` anchors. It is also the in-game "?" overlay.
  - Names inside descriptors are bold keyword links that open their entry on click (`src/ui/keywords.ts`). There is no hover card yet.
- **Numbers that explain themselves.** Every yield, meter and strength is a labelled list (rule 5), and the panels print it.
- **Refusals in words.** Every gate is an `…Error` function, and its sentence is both the greyed button's reason and the refused command's message.
- **Stale copy** (fixed by T0, 2026-10-15; see section 8).
  - The live bead note says twenty beads and lists four kinds of bead: feats, races, quests and reckonings. Beads now come from wagers kept and from grants, and the threshold is seven (`data/beads.json`).
  - Nothing in the tutorial or the pamphlet mentions decks, chairs, bands, commissions, levies, charters, unrest, weariness or ranks.
- **Two unbuilt plans.** The September plan and the pamphlet's second edition (both now in `docs/deprecated/`) were never built.
- **The interface is about to change.**
  - The top bar (layout B4) and the empire panel (E2) are agreed but not built (`docs/plans/hud-ux-decisions.md`, `docs/plans/hud-empire-panel-spec.md`).
  - The city screen and the faith screen have agreed directions too.
  - The walkthrough's spotlights point at controls that will move.

## 3. What the research says

The full list is in `docs/plans/tutorial-research.md`. The points this design rests on:

1. **Teach inside the player's first real game.** That is where newer games teach, and the research data favours it.
2. **Every extra chapter loses players.**
   - Old World's five learn-to-play scenarios were finished by 53%, 40%, 25%, 16% and 10% of players.
   - About a quarter of players finished Warhammer III's prologue.
3. **Teach at first contact, one idea at a time,** and avoid a barrage of pop-ups (the failure of Civ V and Stellaris).
4. **Spend the teaching on what is unfamiliar.** Tutorials helped only in the least conventional game of a 45,000-player study.
5. **Keep a card game's first pool simple.** Budget its complexity, and put an enabler before its payoff (Magic, Marvel Snap, Spirit Island).
6. **Use nested tooltips** with a lock and a way back, over one cross-linked reference (Crusader Kings III, Old World, Stellaris).
7. **Every number and every disabled button explains itself** (Europa Universalis V).
8. **Players choose how much help, switch each kind off, and can reopen any lesson.** Warnings outlast the tutorial (Civ VII).

## 4. Principles

1. **Teach inside the player's first real game.** No separate tutorial scenario: the player keeps the game they learned in.
2. **Teach the new, lean on the familiar.** The deck layer gets the most teaching. The Civilization basics get a short walkthrough that a Civilization player can skip.
3. **One idea at a time, at first contact.** A lesson arrives the first time its system appears, and teaches one thing.
4. **Learn by doing.** An action lesson completes when the player does the action (an accepted command), never on a button press.
5. **Show, then say.** Point at the real control and show the number change, rather than describe it. At most two short sentences per card.
6. **Every rule lives in one place.** Copy that states a number reads it from data, and a sync test fails when a lesson names a retired system.
7. **Everything can be reopened, reset or switched off.** The player chooses how much help, and each kind separately.
8. **Help never changes the game.** The tutorial reads; it never issues a command, never touches the save, and never changes what a seed produces. The existing source pin stays.
9. **Numbers and refusals explain themselves everywhere,** not only in the tutorial.
10. **Watch real newcomers.** The tutorial is done when newcomers can explain the core rules unprompted, not when the tests pass.

## 5. The design

### 5.1 Entry: one question, three modes, three switches

At the first new game, the landing asks **"How much guidance would you like?"**:
- **"I'm new to games like this"**: the pamphlet, the opening walkthrough, and every first-contact lesson.
- **"I've played Civilization"**: the pamphlet's pages on cards and victory, a one-card controls note instead of the walkthrough's basics, and every lesson on the systems that are new here.
- **"Let me explore"**: no automatic guidance. Lessons, the library and warnings are available on demand.

Options then carry **three independent switches**: the walkthrough, first-contact lessons, and warnings (Civ VII, Humankind). The question is asked once and can be changed later. Today's "tutorial off" migrates to "Let me explore".

### 5.2 Orientation: a shorter pamphlet

Six pages instead of eight. Pictures come first, with two short sentences each, under the user's rulings of 2026-09-03 (pages, real screenshots, cursor marks):

1. **Your empire begins here.** Explore, grow your towns, and complete the Magnum Opus to win.
2. **Find your way around.** The top bar, the empire panel, the unit panel and End Turn, captured after the interface rework.
3. **Select, move, attack.** Left-click selects; right-click moves; hover an enemy to preview the fight.
4. **Towns work the land.** Worked tiles: food grows the town, production builds. Happiness and authority are the two limits.
5. **Culture deals you cards.** A hand from your two decks: take one or pass. A card works while it sits in a chair, and more chairs arrive as the game goes on.
6. **How to win.** Beads from wagers and grants open the Magnum Opus; whoever finishes it wins.

A Civilization player gets direct page links (Overview, Layout, Controls, Towns, Cards, Victory). The screenshots are taken after the interface rework, from a shot list kept in this doc (`docs/pamphlet.md`'s discipline).

### 5.3 The opening walkthrough

Keep today's engine and its rule that action steps complete by deed. Trim and reorder it for the deck game:

| # | Lesson | Teaches | Completes when |
|---|---|---|---|
| 1 | Select your settler | selection, the unit panel | an owned settler is selected |
| 2 | Found your capital | founding | `foundCity` is accepted |
| 3 | Choose research | the star chart | research is chosen (opening and closing the chart are no longer steps) |
| 4 | Choose production | the build list | production is set |
| 5 | Explore | moving, routes over several turns | a unit arrives on a new hex |
| 6 | End the turn | what End Turn waits for | the world turn advances |
| 7 | Read your town | worked tiles; food grows and production builds; every number has a breakdown | the town panel is opened after a turn |
| 8 | Your first card | the draft, then seating (5.5) | a card is seated or a hand is passed |

It closes with **"The rest arrives as you reach it"** and a pointer to the lesson library.
- A Civilization player skips lessons 1 to 6, keeps lesson 7 as a one-card note (our breakdowns are distinctive), and keeps lesson 8.
- Lesson 8 waits for the first draft rather than forcing one, so the walkthrough never stalls on it.

### 5.4 First-contact lessons

Each lesson has:
- a stable ID and a trigger: the first time its system appears for the local player;
- one idea, in at most two sentences;
- **"Show me"**, which spotlights the control (Victoria 3's "how"), and **"Why"**, which adds one sentence or opens the Compendium entry (its "why");
- an end: it retires on the deed where it can, and stays in the library either way.

The exact copy is written at build time from the live rules (principle 6). This table plans what each lesson teaches.

| Lesson | Trigger | The one idea |
|---|---|---|
| **Cards and chairs** | | |
| First hand | the first draft opens | Culture deals a hand from your two decks. Take one card, or pass. |
| Seat a card | the first owned card not in a chair | A card works only while it sits in a chair. |
| Full chairs | cards owned first outnumber chairs | Choosing what sits in your chairs is the heart of your strategy. |
| Commission | the first commission seated | A goal: meet it while the card is seated, take the reward, and the card leaves its chair. |
| Charter | the first charter drafted | It unlocks something and needs no chair. |
| Levy | the first levy available | A town can spend a citizen for what the card names. |
| Tended work | the first tend action available | Workers can tend wild land without clearing it. |
| A new band | a band opens | New hands come from the new band. Earlier cards stay in your chairs but leave the draw. |
| Government, doctrine | the first offer of each | Waits for the government and doctrine rework (A4). |
| **The empire** | | |
| Authority | the first prospective second town, or authority below zero | Each town uses authority. Below zero, your borders stop growing. |
| Happiness | the first deficit | Citizens need happiness. Below zero, towns stop growing. |
| Workers | the first worker | Improvements cost charges, and chopping a forest is a trade. |
| Discovery | the first discovery offer | Choose the reward that helps your next plan. |
| Camps | the first barbarian camp seen | A camp raises raiders until it is burnt, and clearing it pays. |
| **War** | | |
| Forecast | the first combat forecast | Read the fight before you attack. |
| War and peace | the first war, on either side | At war, fighting is allowed. Peace needs both signatures, and a truce follows. |
| Capture | the first town taken | Puppet, annex or raze. A town taken by force stops working until it is pacified, so leave a garrison. |
| Weariness | the first weariness line | Losing more units than you kill costs happiness. Winning costs nothing. |
| Ranks | the first Veteran | Units that fight earn ranks. A veteran is worth keeping alive. |
| **Faith, trade, great people** | | |
| Pantheon, prophet, beliefs | the first offer or the first prophet | One lesson each, as the September plan laid out (its section 8). |
| Caravan | the first caravan | A caravan is a route, not a piece you steer. |
| Great person | the first great-person offer | A person acts once or builds a work, and leaves a legacy either way. |
| **The endgame** | | |
| Wager | the first wager offer | Three shared goals: stake one privately, meet it for beads, and miss it for a malice that takes a chair. |
| Beads | the first bead | Enough beads (seven today) and the other requirements open the Magnum Opus. |
| Magnum Opus | the Opus becomes buildable | Completing it wins the game. |

**Scheduling:**
- A mandatory choice owns the screen first, and its own lesson shows inside it.
- At most one lesson is visible at a time, and stale contexts are dropped.
- A lesson never replays history after a load.

### 5.5 Teaching the card layer

This is the part no Civilization player knows, and where the research says to spend the effort.

1. **Make band 0 simple by design.** The card-design skill's finished-builds section already says band 0 should be mostly standalone cards and openers. That also makes band 0 the right first pool (Magic's New World Order, Marvel Snap's first pool): one effect, plain conditions, no keyword the player has not met. A lesson introduces each keyword when its first card appears. This needs no new rule.
2. **Preview before seating.** Hovering a card over a chair shows what changes, such as "+4 production in your capital".
   - **How:** it comes from the card-impact reader (`explainCardImpact`, `src/sim/cardImpact.ts`), worked out once per hand and never per frame.
   - **Why it teaches well:** it is Into the Breach's preview applied to cards. It is also the clearest way to teach synergy, because the preview shows a card paying more thanks to one already seated.
3. **Explain the choice when it becomes real.** Nothing explains swapping until cards outnumber chairs (Plants vs. Zombies shows its seed-selection screen only then).
4. **Point at a card that changes a rule.** The first-hand lesson can say "Some cards change a rule" when a hand holds one, such as Blood Brothers. That is Balatro's Four Fingers moment, without rigging the draw.
5. **Not recommended:** rigged or scripted drafts in a normal game (Spirit Island's fixed order). They change outcomes; consider them only inside a learning preset (decision D3).

### 5.6 Help that is always there

- **Hover cards on keyword links** (Crusader Kings III, Old World, Stellaris).
  - **What it does:** hovering a bold keyword in any descriptor shows its short Compendium definition in a card. The card can be locked (a click, or holding the hover), has a back control, and nests when it holds links of its own.
  - **How:** it is built on `keywords.ts`'s one renderer and the Compendium's `kind:id` anchors, so every surface that prints descriptors gains it at once.
  - **Who it helps:** every player, not only newcomers.
- **Every number explains itself.** This is already rule 5. Audit for panels that print a total without its list.
- **Every disabled action says why, and what unlocks it.** The `…Error` sentences exist. Audit for disabled controls that show no reason, and add "what unlocks it" where a technology or building does (Europa Universalis V's action hints).
- **The lesson library.** Every lesson is listed in the Compendium under "Guide", and can be reopened. Options has "Reset lessons" (Crusader Kings III, Victoria 3).

### 5.7 First-age goals (optional)

A short checklist a newcomer can keep or dismiss: found a second town, choose your first card, build a worker, clear a camp, finish a technology. It is interface only, reads facts and pays nothing. The models are Civ VII's quests, Victoria 3's journal, and the checklist idea in `docs/pamphlet.md` (2026-09-03).

### 5.8 Warnings after the tutorial

A warnings channel that stays on for experienced players, like Civ VII's "Only Warnings":
- a town with nothing to build;
- happiness about to fall below zero;
- authority below zero;
- a hand waiting;
- a town in unrest with no garrison;
- weariness rising;
- a rival one step from the Magnum Opus.

Each is one line in the turn summary or a chip, never a modal. Several already block End Turn; this channel is for the ones that do not.

### 5.9 A first-game preset

A **learning game** built from existing options only: a small map, two rivals, the gentler bot posture, and the newcomer mode. A **Simple game** would go further and switch off whole systems for a first game, as Through the Ages does (for example wagers, or religion). That needs new rules and is the user's call (D2).

## 6. Architecture

Carried forward from the September plan, which gives the detail in `docs/deprecated/tutorial-redesign.md` §§5, 6 and 9.

- **Interface only.**
  - Tutorial modules never import `src/sim/`.
  - A narrow adapter reads facts through the existing readers and hands the tutorial small plain objects.
  - It never changes the game, and never draws from `state.rng`.
- **Accepted results only.** A lesson completes on an accepted command by the local player (`result.ok`). A click, a rejected command, a bot's action or replayed history never completes one.
- **Lessons and scheduling**
  - Stable lesson IDs replace step numbers. Facts satisfy lessons even out of order, so a player who sets production before research is not stuck.
  - A mandatory choice owns the screen first.
  - There is no polling and no per-frame scan. Snapshots refresh at accepted actions, at turn settlement and when a screen opens.
- **Anchors.** Lessons point at stable `data-guide="…"` attributes, and the interface rework keeps them.
- **Storage (version 2, in `localStorage`).**
  - It holds the preferences (mode and switches), the lessons seen, and per-game progress under an interface run key.
  - The save stays `{config, log}`, a storage failure falls back to memory, and version 1's "off" becomes "Let me explore".
- **The interface contract** (the September plan's §5):
  - The coach card is small and placed clear of the panels.
  - There is no full-board dimming and no camera moves.
  - Help never covers a screen's own controls.
  - Escape belongs to the open screen.
  - Help for a screen sits inside that screen.

## 7. Decisions for the user

| # | Decision | Recommendation |
|---|---|---|
| D1 | Teach inside the first real game, with no separate tutorial scenario | Yes |
| D2 | A learning-game preset from existing options now; a Simple game that switches whole systems off only if playtests show the first game is still too much | Preset now, Simple game later if needed |
| D3 | Card onboarding through a simple band 0 and a preview before seating, with no rigged drafts in a normal game | Yes |
| D4 | Three modes plus three independent switches | Yes |
| D5 | A six-page pamphlet with pages on cards and victory, screenshots after the interface rework | Yes |
| D6 | Hover cards on keyword links, with a lock and a back control | Yes: it helps every player |
| D7 | Fix the stale copy now; build the rest around the interface rework | Yes |
| D8 | Unlocks across games (Balatro, Marvel Snap) | Not now: the band rule already gates complexity by age inside one game |

**Ruled, 2026-10-15.** The user: *"approved."* All eight decisions stand as recommended. The user then cleared the first two batches: *"you're good to delegate T0 and T1"*.

## 8. Implementation plan

Each batch has a fence and narrow tests. The orchestrator runs the gate (typecheck, core, build) and deploys to the play server, and no batch may change what a seed produces.

| Batch | What | Depends on |
|---|---|---|
| **T0** | Stale copy: the bead note (wagers and grants, the threshold read from data), the pamphlet's retired pages, and a sync test that fails on retired systems and hard-coded figures | nothing; any time |
| **T1** | The lesson engine, version 2: the pure model, scheduling, storage version 2 and migration | nothing |
| **T2** | Hover cards on keyword links: lock, back and nesting | nothing |
| **T3** | The lesson catalogue and the pamphlet copy, written from the live rules, with sync tests | T1 |
| **T4** | Card preview before seating (`explainCardImpact`, once per hand) | nothing |
| **T5** | Surfaces: the coach card, help inside screens, the lesson library, the settings | T1, T3, the interface rework |
| **T6** | Integration: the adapter, accepted-result events and `data-guide` anchors. The orchestrator owns `main.ts` | T5 |
| **T7** | The warnings channel and the first-age goals | T6 |
| **T8** | The learning-game preset | T6 |
| **T9** | Pamphlet screenshots | the interface rework |
| **T10** | QA and newcomer playtests | everything above |

T0 can go now. T1 to T4 do not depend on the layout and can start before the interface rework. T5 to T9 follow it.

**Started 2026-10-16:** T2. **Built 2026-10-16:** the fix to Skip (section 10). In the live tutorial (`src/ui/tutorial.ts`, styled by the new `src/ui/tutorial.css`), Skip is a small text link in the card's top-right corner, away from the primary button, and it ends the walkthrough for the current game only. The new engine (`guideSchedule.ts`, with docblocks in `guideModel.ts` and `guideStorage.ts`) records a skip on the game's run and no longer turns the walkthrough switch off.

**Built, 2026-10-15:**
- **T0** (`84893853`): the bead note, the tips and the pamphlet match the current rules, and `test/ui/guideCopy.test.ts` fails on a retired system or a typed bead count. A follow-up (`eef4ee47`) fixed the same stale text in the Compendium and on the beads screen, and moved the number-word helpers into `src/ui/numberWords.ts`. T0 also found that the bead rod drew one slot too few for the threshold; that fix is a separate batch.
- **T1** (`1d73131b`): `src/ui/guideModel.ts`, `guideLessons.ts` (37 lessons, IDs and triggers as data, working titles only), `guideSchedule.ts` and `guideStorage.ts` (version 2 memory and migration from version 1). Nothing is wired into the game yet; the wiring notes for T5 and T6 are in `guideSchedule.ts`'s header.

## 9. Testing and measuring

- **Sync:** every figure a lesson states comes from data, and no lesson names a retired system (feats, races, quests, reckonings, the augur).
- **Behaviour:**
  - only accepted commands complete lessons;
  - facts satisfy lessons out of order;
  - modes route correctly;
  - "Reset lessons" works;
  - a storage failure falls back safely.
- **Determinism:** with the tutorial on and off, the same command log replays to byte-identical state.
- **Newcomer playtests.**
  - Ask a newcomer, unprompted, to explain food, production and worked tiles, and to take and seat a card. Ask a Civilization player to explain chairs, bands and authority.
  - Revise the lesson that failed the check rather than adding a page.
- **A local funnel log** (optional): which lessons fired and which were completed, kept in `localStorage` and viewable in a debug panel, so closed-beta testers can report where they stopped.

## 10. Open questions

Answered by the user, 2026-10-15 (their words in quotes):

- **A smaller first hand:** no. *"no"*. The first draft deals the normal hand, in the learning preset too.
- **Lessons for governments and doctrines:** deferred until their rework (A4). *"defer this for now"*
- **Teaching the wager and bead endgame:** teach it now. *"yes"*, read as yes to "stable enough to teach now".
- **Hotseat and multiplayer:** deferred. *"defer multiplayer"*. Lessons are built for the one local seat.

Raised while building T1 (2026-10-15), and ruled by the user on 2026-10-16: *"We need to make 'skip tutorial' less prominent in the title card, it's very easy to click it on accident. 1 is fine for now, 2 revert, the walkthrough should show if it's unfinished. 3 is fine to me. Let's start T2"*.

- **Ruled:**
  - **Walkthrough lessons across games:** kept as built, for now.
  - **Skip:** reverted. Skip ends the walkthrough for the current game only. A walkthrough that is unfinished shows again in the next game. This applies to the live tutorial (`src/ui/tutorial.ts`, where Skip today switches the walkthrough off for good) and to the new engine.
  - **What "I've played Civilization" skips:** kept as built.
  - **"Skip tutorial" is less prominent** on the walkthrough's card. Today it is a button beside the primary one, and it is easy to press by accident.

As they were raised:

- **Walkthrough lessons across games.** A walkthrough lesson finished in one game is skipped in later games. The old tutorial replayed all eleven steps in every new game.
- **Skip.** Pressing Skip also switches the walkthrough off for later games, as the old tutorial did.
- **What "I've played Civilization" skips.** The lessons on systems section 1 calls familiar: happiness, workers, discovery, camps, the combat forecast, war and peace, religion, caravans and great people.
