# Tutorial redesign: implementation and delegation plan

Status: proposed implementation specification, prepared 2026-09-14 at the user's request. **This document authorizes no gameplay balance changes.** The current task creates the plan only; do not launch implementation agents until implementation is requested. Player-facing copy below is the proposed copy for that implementation, not a set of already-shipped strings.

## 1. Outcome and scope

Begin with a short, skippable illustrated pamphlet, followed by one guided first game with selectable explanation depth, then contextual lessons as systems become relevant. The pamphlet establishes the goal, screen layout and essential controls; the guide teaches actions and their consequences. Experienced Civilization players can skim the pamphlet and skip familiar foundations while still learning this game's distinctive rules.

The user's follow-up explicitly requests the pamphlet before the tutorial, including screenshots, an interface overview and basic controls. Section 3A below supersedes this plan's earlier recommendation to remove automatic first-run pamphlet presentation. It also replaces the older pamphlet sequence for this redesign; update `docs/pamphlet.md` when the implementation is accepted so two competing specifications do not remain.

The guided introduction should take approximately 20–30 minutes in a tested opening. This is a playtest target, never a timer or turn deadline. The player continues the same game afterward. Later systems do not hold introduction completion hostage.

Success:

- A newcomer can select and move a unit, found a city, choose production/research, explain food versus production, and identify a useful next action.
- A Civ player understands drafted versus slotted Orders, government versus doctrine, happiness versus authority, and where this game's victory rules differ.
- Players encounter explanations of religion, great people, trade and wagers when those decisions become available.
- The guide never makes a game screen impossible to close, clicks on a player's behalf, spends currency, chooses cards, or changes simulation outcomes.

Non-goals: a new tutorial currency, forced build order, campaign scripting engine, new character system, new AI behavior, mandatory complete practice match, renderer changes, new resource placement algorithm, or comprehensive strategy optimization.

Read before coding: `CLAUDE.md`, `docs/README.md`, `docs/flags.md`, the relevant current system reference, and this plan. User corrections and newer rulings take priority over this snapshot.

## 2. Existing code and what to retain

| File/surface | Current role | Planned treatment |
|---|---|---|
| `src/ui/tutorial.ts` | Linear `STEPS`, event `TIPS`, pure reducer, memory, DOM coach and board projection | Preserve event-driven architecture, out-of-order satisfaction and cheap projection; split responsibilities into small tutorial modules |
| `src/ui/pamphlet.ts` | Picture-first manual, automatically precedes tutorial; also available in Compendium | Replace with the skippable first-run pamphlet in §3A; retain manual reopening and correct obsolete copy |
| `src/main.ts` | Guide lifetime, command/event hooks, offer opening, save/restart, board anchors | One integration owner adds adapter and hooks; no competing agents edit this file |
| `src/ui/statecraftScreen.ts`, `statecraftStaging.ts` | Draft arrangement staged until Confirm or leave | Lessons distinguish draft choice, staged placement and successful committed activation |
| `src/ui/wagerSheet.ts`, `abacusScreen.ts` | Stake decision and public progress | Integrate a compact explanation inside the existing sheet and an optional ledger explanation |
| `src/ui/modalShell.ts`, `popover.ts` | Screen ownership, focus and keyboard behavior | Reuse established lifecycle; tutorial must not introduce a competing modal stack |
| `src/ui/gameSetup.ts`, `index.html` | Landing configuration and tutorial checkbox | Replace checkbox with depth selector and add explicit recommended first-game preset action |
| `src/ui/saves.ts` | `{config, log}` replay payload and save-slot identity | No simulation payload changes; tutorial progress uses separate UI storage |
| `src/style.css` | `.tutorial-*` and pamphlet styling | Scoped coach/inline-help/pamphlet CSS only; avoid global overlay/z-index changes |
| `test/ui/tutorial.test.ts`, `gameSetup.test.ts`, `screenLifecycle.test.ts` | Existing pure behavior and integration checks | Preserve useful behaviors and replace obsolete sequence/copy assertions with meaningful coverage |

Known stale copy to remove from active tutorial and optional pamphlet: twenty-bead threshold; world-first feats/races/quests/reckonings as the current bead system; augurs as active religious units; settler described as a wagon. Check all remaining assertions against live rules rather than fixing only these examples.

Existing hooks include `tutorial.note`, `wantsTip`, `refresh`, `reposition`, `begin`, `resume`, `replay`, `close`, selection callbacks and offer-opening functions. Existing event names include `statecraftOffer`, `discoveryOffer`, `combatForecast`, `religionOffer`, `greatPersonOffer`, `enemySeen`, `happinessDeficit`, `authorityOverrun`, `ageOpened`, `bead`, `techChartOpened` and `techChartClosed`. Reuse or adapt them; they are not all sufficiently specific for the new lessons.

Important integration audit: in the current `onCommand` block, the local-player tutorial command notification appears before `if (!result.ok) return`. Verify the calling contract and ensure the replacement explicitly checks success. A rejected attempt must never complete a lesson even if the callback normally receives successful commands.

## 3. Player entry and modes

Landing label: **“How much guidance would you like?”**

| Stored mode | Exact option label | Exact supporting text |
|---|---|---|
| `newcomer` | “I'm new to civilization games” | “Learn the basics, then discover what makes this game different.” |
| `civ` | “I've played Civilization” | “A quick controls introduction, then Orders, authority and wagers.” |
| `explore` | “Let me explore” | “Play without automatic guidance. Help is always available.” |

Use three native radio choices, keyboard accessible, with the supporting sentence under each. Recommend newcomer for a new browser; preserve an explicit existing opt-out during migration. Do not ask again every game once a preference is stored.

Actions:

- **“Start guided game”** appears for newcomer/Civ modes and applies the transparent preset below.
- The ordinary start action still starts the user's selected configuration with the selected guide depth. Never silently override customized settings.
- Explore mode starts the ordinary game without unsolicited tutorial cards. The Guide remains available in Help.
- Menu entry **“Guide”** opens the lesson library, mode control, **“Pause guidance” / “Resume guidance”**, and replay controls. Pausing is distinct from completing lessons or permanently disabling help.

Welcome copy, shown as the first compact coach after the board is ready:

> **Build your civilization**
> “Develop your cities and shape your civilization with the Orders you discover. Earn glass beads through wagers and special grants, then complete the Magnum Opus to win.”

Primary button **“Let's begin”**; secondary **“Skip the introduction”**. A **“How do I win?”** link opens the accurate victory reference. Do not recite all victory rules here. If the player has just read the pamphlet, omit this repeated welcome coach and begin at the first eligible action; the pamphlet's Start playing action supplies this acknowledgment. Skipping the pamphlet before reading its opening may retain the compact welcome.

## 3A. Illustrated opening pamphlet

### Purpose, presentation and triggers

The pamphlet answers **“What am I looking at, and what am I trying to accomplish?”** The interactive guide answers **“How do I do it, and what changed?”** Contextual lessons explain later choices. Reading a pamphlet page records familiarity only; it does not mark founding, movement, slotting or other action lessons accomplished.

- First guided new game in newcomer or Civ mode: after loading settles, show the pamphlet before any tutorial coach. Both modes receive the same short booklet with direct page navigation. Civ players may jump straight to Orders or Wagers.
- Do not stack it with a pending game choice. On imported/loaded games, never auto-open it; offer it manually from Guide. If a choice unexpectedly owns the first-game screen, preserve that choice and defer pamphlet presentation to a safe board state.
- Header: **“A short guide to Magister Ludi”**. Subheading: **“Find your way around, then learn by playing.”** Budget eight short pages, roughly two to three minutes to skim; no timer enforces reading.
- Persistent controls: **Back**, **Next**, **Start playing**, close button, page counter and labeled contents. Last-page Next becomes **Start playing**. Start playing, X and Escape all dismiss safely and start the appropriate guide once, after the pamphlet releases focus. They never end a turn or select an offer.
- Remember shown/dismissed/version status separately from tutorial completion. Do not repeatedly present it after Restart, reload or changing explanation depth. Guide provides **“Read the opening pamphlet”**; manual reopening closes back to its invoking host and must not restart the introduction.
- Use the existing dialog/shell conventions for focus containment and restoration. While the pamphlet is open, underlying game clicks and shortcuts must not fire. Reader navigation does not mutate the world. Opening an in-book Compendium link must suspend/replace the pamphlet through the existing screen flow and return to the same page, not stack interactive modals.
- Desktop layout: wide screenshot above headline/body or beside body if text remains comfortably readable, approximately 960–1120 px maximum dialog width, with persistent footer inside the viewport. On short/narrow windows scroll the page body, never hide navigation. Text stays HTML, not baked into an image.
- Each page has a headline and two short body sentences. Optional legends are terse and visible; deeper explanations link to Guide/Compendium. The layout overview alone may use five numbered callouts with an accessible legend because its purpose is orientation. Other shots use at most two callouts each.
- Images are examples from the current integrated painted game, labeled **“Example game”** where confusion with the live world is possible. A snapshot of a later stage is not a live map or a promise of a particular opening result.

### Page P1 — Your civilization begins here

**Exact headline:** “Your civilization begins here”

**Exact body:**

> “Explore the world, develop your cities and shape your civilization with the Orders you discover.”
> “This is a turn-based game: take your time to inspect the board and decide what to do next.”

**Screenshot:** proposed asset `public/pamphlet/v2/01-your-civilization.png`. A real early-game board at normal gameplay zoom: one modest capital near a river, a selected or clearly visible scout, farmland/resource terrain and the edge of explored land. Retain enough HUD to establish that this is the game the reader will enter; no cinematic angle or interface-free art render. Nothing is being attacked and no modal is open.

**Callouts:** “Your capital” at the city banner; “Unexplored land” at the visible fog boundary. Do not reveal hidden resources to make a prettier shot.

**Caption/alt:** “An early civilization with a capital, a scout and unexplored land beyond its borders.”

**Handoff:** the welcome concept is familiar, but actual selection/founding lessons remain incomplete. The opening image may show an already founded city even though the playable tutorial starts with a settler; label it Example game rather than pretending it is the current save.

### Page P2 — Find your way around

**Exact headline:** “Find your way around”

**Exact body:**

> “The top bar summarizes your empire; the side controls open its main screens.”
> “Select a unit to see its actions, and use End Turn when you are ready to advance.”

**Screenshot:** proposed asset `public/pamphlet/v2/02-screen-layout.png`. Capture the complete current HUD with an owned unit selected, the right-hand unit panel open, and no full-screen screen or temporary notification. Keep the top bar, left research card/dock, lower-left tile information and lower-right End Turn visible. Use five small numbered markers rather than five paragraphs over the map. Do not move or redraw UI elements for the diagram.

**Exact numbered legend:**

1. **“Top bar — your resources, empire status and tools.”** Identify `#topbar` / `#civ-yields`; include the actual happiness/authority chips. Supporting microcopy: **“Hover a value to inspect its breakdown.”** Confirm which values support breakdowns in the captured build.
2. **“Research and side menus — open the technology tree, Statecraft, Religion and Diplomacy.”** Identify `#hud-research` and `#hud-dock`. Labels follow actual visible buttons; do not invent a menu if its location has changed.
3. **“Unit panel — the selected unit's condition, movement and actions.”** Identify `#unit-panel`, with at least one legal action visible.
4. **“Tile information — details about the land under your pointer.”** Identify `#hud-context`, displaying an ordinary explored tile.
5. **“End Turn — advance when you're ready, or visit a choice that still needs an answer.”** Identify `#hud-end-turn` / `#end-turn` in its ordinary ready state.

**Companion close-up:** `public/pamphlet/v2/02b-tools-and-menus.png`. An unscaled-readable crop of the actual top-bar tool buttons and left dock, displayed on the same page as an optional expanded detail. Label only controls present in the build: **“Abacus: victory progress”**, **“Lens: map information”**, **“Help: controls and rules”**, **“Menu: save, load and Guide.”** Include the chronicle/notification button as **“Chronicle: recent events”** if it is present. Use HTML labels beside the crop; do not squeeze unreadable tooltips into the wide overview.

**Caption/alt:** “The main game screen, with numbered markers for the top bar, side controls, unit panel, tile information and End Turn.” The same information must be available in the text legend without seeing the markers.

**Terminology:** use the shipped button's label **End Turn**, not a second tutorial-only label such as Next Turn. Refer to interface functions in plain language; explain “Abacus” with “victory progress” on first use.

### Page P3 — Select and inspect

**Exact headline:** “Select and inspect”

**Exact body:**

> “Left-click a unit piece or its icon to select it; click a city to open its screen.”
> “Hover tiles, units and values to inspect them before choosing an action.”

**Screenshot:** proposed asset `public/pamphlet/v2/03-select-and-inspect.png`. Medium crop of an owned military/scout piece with its on-map unit icon and the corresponding right-hand panel visible. Show the current selection outline, not a painted-in substitute. The piece must be clearly separated from the city so selection intent is unambiguous. Two callouts: **“Left-click to select”** points to piece/icon; **“Actions for this unit”** points to panel. A small native city-banner inset may be used with caption **“Click a city to manage it.”**

**Visible control strip:** **“Drag the map to pan · Scroll or pinch to zoom · Escape closes an open screen.”** Both mouse buttons currently support map panning; verify active-renderer drag and pinch behavior before publishing the strip. Suppress unsupported controls rather than adding new ones in this batch. More controls belong in Help.

**Caption/alt:** “Selecting a unit on the map opens its information and available actions in the unit panel.”

**Detail link:** **“Selection and camera controls”**. Optional detail: tile selection may cycle stacked units, while a unit's icon/model targets that piece. Verify current picking conventions; the pamphlet must not imply a click on a crowded tile always selects a specific unit.

### Page P4 — Move, preview, then attack

**Exact headline:** “Move, preview, then attack”

**Exact body:**

> “With a unit selected, right-click a tile to move there; a distant destination becomes a route for later turns.”
> “Hover an enemy to preview the fight, then right-click to attack if the action is legal.”

**Screenshots:** two matched real-game crops, shown side by side at readable size or stacked on small windows. `public/pamphlet/v2/04a-move.png` shows a selected scout, a visible legal destination and the game's own movement/path preview. Label **“Right-click to move.”** `public/pamphlet/v2/04b-attack.png` shows an owned combat unit adjacent to an attackable barbarian, with the genuine hover combat forecast visible. Label **“Hover for the forecast”** and **“Right-click to attack.”** Do not use a peaceful rival as the attack example or suggest that right-click bypasses war/attack legality.

**Visible accessible alternative:** **“Trackpad: press M, then left-click the destination or enemy.”** This is already described in current Help; verify the actual handler before publishing. Do not introduce a new binding through copy.

**Caption/alt:** movement image — “A selected scout and the route to its destination.” Combat image — “A combat preview showing expected damage to the attacker and defender before an attack.”

**Optional More sentence:** “A unit with no movement left can receive a movement route for later. Dragging the map pans the camera; releasing a drag should not issue an attack.” Verify click-versus-drag suppression in browser QA.

### Page P5 — The land supports your cities

**Exact headline:** “The land supports your cities”

**Exact body:**

> “Citizens work selected tiles: food feeds the city and supports growth, while production builds its current project.”
> “Workers improve the land; happiness supports population, and authority helps you hold more cities.”

**Screenshot:** proposed asset `public/pamphlet/v2/05-city-and-land.png`. Current city screen with a few actual worked tiles visible and one ordinary production item queued. Preserve the relevant production rail and a readable yield breakdown; crop irrelevant portions rather than shrinking a whole city screen to illegibility. Two callouts: **“Worked tiles supply the city”** and **“Production builds this item.”** Include a farm or pasture already worked in the example; no claim that every owned tile contributes.

**Companion inset:** `public/pamphlet/v2/05b-empire-meters.png`, a real crop of the happiness/authority chips with captions **“Happiness: population support”** and **“Authority: expansion support.”** Show ordinary current values; detailed penalties stay in contextual lessons. The inset must be taken from the same example state if numbers elsewhere could be compared.

**Caption/alt:** “A city's worked land and production choice, with happiness and authority shown as empire-wide constraints.”

**Optional link:** **“How city yields work.”** Do not turn this page into a list of every currency, citizen-management option or optimal opening build.

### Page P6 — Orders shape your strategy

**Exact headline:** “Orders shape your strategy”

**Exact body:**

> “Culture earns new Orders for your collection; place them in compatible government slots to activate them.”
> “Choose a combination that suits your land and plans, and check the lock period before changing it.”

**Screenshot:** proposed asset `public/pamphlet/v2/06-orders-and-slots.png`. Current Statecraft screen cropped around a readable, simple owned Order and its compatible slot. Use a replayable example before placement or after a committed placement; the caption must identify which. Preferred image: after successful activation, with the active card and another owned unslotted card visible. Callouts **“Owned, but inactive”** and **“Slotted and active.”** Keep the card effect legible and choose one whose condition is understandable from the caption. Avoid showing staging as if it were already committed.

**Caption/alt:** “The Statecraft screen distinguishes Orders in your collection from Orders active in government slots.”

**Visible footnote:** **“Governments set your slots; doctrines grant separate lasting effects.”** No full government ladder, tier numbers or card-rarity explanation on this page. Both modes receive the interactive activation lesson even if they read this page.

### Page P7 — Choose what to pursue

**Exact headline:** “Choose what to pursue”

**Exact body:**

> “In wagering ages, everyone receives the same three goals; privately stake one and pursue it before the age closes.”
> “Meeting goals earns beads, while missing your stake brings a temporary malice that occupies an Order slot.”

**Screenshot:** proposed asset `public/pamphlet/v2/07-wager.png`. Real first-wager sheet from a later replay fixture, explicitly labeled **“Later in the game.”** Show all three real offered titles and one expanded/readable goal with the player's actual progress. Retain the real reward and malice notice; if unreadable at display size, crop to one goal plus a small context strip of the other two. Callouts **“Compare the shared goals”** and **“Your progress toward this goal.”** Never fabricate an available wager or imply the reader has already staked it.

**Caption/alt:** “An age's wager choices with a goal, its requirements and the player's current progress.”

**Optional detail:** “Multiple civilizations can meet a goal. Your stake pays {stakeBeads} beads; each other goal pays {otherBeads}. The interactive guide will explain the deadline and malice before you commit.” Bind figures to current data; no hard-coded score explanation in image annotations. Do not require remembering these figures to proceed.

### Page P8 — Create your great work

**Exact headline:** “Create your great work”

**Exact body:**

> “Collect enough beads and meet the other requirements to begin the Magnum Opus; completing it wins the game.”
> “For now, establish your capital, choose something to build and learn, and explore the land around you.”

**Screenshot:** proposed asset `public/pamphlet/v2/08-magnum-opus.png`. A real developed empire's city screen with the Magnum Opus production entry and its actual requirement/cost presentation readable. Include an adjacent real crop of the bead ledger if both cannot appear in one legitimate view; label the two panels clearly rather than inventing an impossible HUD. Later-game content is an example, not a screenshot of an implemented custom Opus monument if no such artwork exists.

**Callouts:** **“Beads help qualify you”** at ledger/requirement; **“Complete the Magnum Opus to win”** at the real production entry. Do not suggest that reaching the bead threshold itself wins or satisfies technology/world prerequisites.

**Caption/alt:** “The bead requirement and Magnum Opus production entry show how a developed civilization can pursue victory.”

**Primary action:** **“Start playing”**. Closing this page releases the pamphlet's focus and starts the first eligible action lesson exactly once. Reopening it from Guide instead uses **“Return to game.”**

### Screenshot production contract

The asset paths above are a **planned shot list, not existing or captured images**. This planning revision does not claim screenshot capture or visual validation. Do not embed broken image links in documentation as if assets have already been delivered.

1. Capture the current integrated build through the browser workflow, after reading the relevant browser skill. Use separate deterministic example games/replay fixtures; never overwrite or play forward the user's active save to get a shot. Preserve current painted models, camera angle, legible game lighting and actual UI. No generated fake UI or mock card text.
2. Existing `public/pamphlet/*.png` files are candidates for inspection only. Several required shots are absent and old shots may show retired art/rules. Inspect them before reuse; recapture when anything disagrees with the current build.
3. Prefer native browser screenshots of correctly framed viewports/elements. Keep captures clean and place numbered markers, captions and pointer/button diagrams as separate HTML/SVG overlay elements at display time. These annotations explain the screenshot; they must not erase or alter actual game values or controls.
4. Keep full-resolution originals and a small capture manifest under the agreed pamphlet asset area. Manifest records page/shot ID, example config/replay source, build revision, viewport/DPR, lighting, active screen, crop/anchor bounds, alt text and intended display size. Never use the user's personal save data in a shipped fixture.
5. Produce all overview shots at one consistent desktop viewport, preferably 1440×900, then crop detail views for legibility. A full screenshot is not acceptable if readers cannot distinguish the buttons or card text at actual pamphlet size. Verify at 1280×720 and zoomed layouts, not only on the capture machine.
6. Give every shot an explicit alt description and retain all teaching information as live text. Click/tap to enlarge may open a read-only image view with a clear Back action; closing it returns to the same page. Basic reading must not require enlargement.
7. Callouts remain aligned when images scale: normalize marker coordinates against the source bounds. Never anchor them to the reader's live map or DOM behind the pamphlet. Provide textual legends and non-color identification.
8. No animations, auto-advancing pages or mouse-hover-only explanations are necessary. Runtime load errors show a designed caption fallback and keep navigation usable, but **missing required screenshots fail release acceptance**.
9. Rule/control/UI changes require reviewing the affected screenshot manifest entries. Test copy bindings separately from images; do not use screenshots as the only evidence that the tutorial describes current rules correctly.

### Duplication and comprehension checks

- Do not suppress practical action lessons merely because a screenshot was viewed. Do suppress the redundant welcome after reading the opening pamphlet.
- Civ readers have direct labeled page links **Overview**, **Layout**, **Selection**, **Move & attack**, **Cities**, **Orders**, **Wagers**, **Victory**. No one must click Next seven times to reach a useful page.
- After skimming, a new player should be able to point to the unit panel, research entry and End Turn, state left-click versus right-click behavior, and say what they are broadly trying to achieve. Exact yield math and late-game rules are not recall targets.
- The pamphlet teaches “where and why”; the following coach teaches “do it here.” Avoid immediately repeating the same paragraph in both surfaces.

## 4. Recommended opening: reproducible, ordinary game rules

Use a checked-in preset configuration with a verified seed and existing map options. The seed and leader must be selected by inspecting actual generated openings; this plan does not invent values or assume every start has suitable geography.

Required criteria:

- One local human and one normal bot using a suitable existing less aggressive posture; ordinary research, draft, costs, movement, visibility and combat rules.
- A legal capital site near the starting settler with fresh water, food and production.
- One nearby useful resource with an accessible early improvement path.
- A reachable discovery and at least one reasonable expansion option outside the capital.
- No immediate unavoidable hostile encounter. Combat remains an optional contextual lesson; do not spawn a scripted opponent or make the player invulnerable.
- A practical route to the first Order draft during the introduction without granting hidden currency, selecting the draft reward or modifying draw randomness.

Display preset details (leader, map size, rival count, ordinary difficulty/posture) before starting. Keep the ordinary options available. Do not reveal undiscovered tiles through highlights or recommendations. Mapgen changes should make a preset verification fail for review, not trigger silent runtime rerolling.

Ship the tutorial engine for arbitrary normal games first. The preset is a later delivery batch, not a prerequisite for contextual lessons. If a lesson cannot be reached in a customized opening, it remains optional or becomes contextual; the guide must not deadlock.

## 5. UX contract

### Board coach

- A compact parchment card, approximately 320 px wide on desktop, 16 px from viewport edges. Place in a free corner using actual HUD/panel bounds, not a fixed coordinate that overlaps the unit panel or End Turn.
- Contents: small “Guide” label, lesson title, at most two short sentences, one primary action where appropriate, **“Show me”**, **“Later”**, and collapse control.
- Use chapter names rather than an intimidating “Step 1 of 30.” Expanded library can show completion.
- **Show me** briefly outlines the relevant existing control or visible piece. No full-board dark scrim by default. The highlight layer has `pointer-events: none`; only the coach itself accepts pointer input.
- No automatic camera movement. A separate **“Locate”** action may center an existing visible target when the player requests it.
- Collapse to a small **“Guide: {lesson title}”** chip. Later snoozes the lesson for this run until manually reopened or its decision context is revisited; never immediately reshow it on the next render.
- Nonmodal coach does not steal focus. Announce changed text politely, not on every hover or camera frame. Reduced-motion mode uses a static highlight.

### Full-screen choices and screens

- Drafts, Statecraft, technology, religion and wagers retain their own keyboard/focus behavior.
- Place relevant tutorial content in a reserved inline help region within the active screen. Proposed anchor: `data-guide="help"`. A collapsed **“Help with this choice”** disclosure expands there.
- Opening another screen hides the board coach. Only the lesson belonging to the active screen can show inline. No tutorial overlay over an existing modal, no auto-closing the screen to deliver a tip.
- Reserve layout space so expanded help cannot cover a card, Confirm, View Map, cost or close button. On narrow windows use an in-flow disclosure above the choices; keep the host's scroll container usable.
- Escape closes the topmost actual game screen through its existing handler. Tutorial must not intercept that event. If keyboard focus is inside a board coach with no game modal open, Escape may collapse only the coach.
- Close buttons always execute the host's normal close behavior. In Statecraft that may commit valid staging; tutorial never substitutes a synthetic close, confirmation or discard.
- If a forced choice cannot be deferred by the game, explain that existing blocker. The tutorial itself introduces no new End Turn blockers.

### Before-and-after evidence

Show a short receipt after an accepted improvement or Order activation, using existing yield/impact readers. Example layout: **“Capital production: {before} → {after}”**, followed by **“{Order name} is now active.”**

Only show a direct delta if the adapter can attribute it correctly. A batch of several changes should say **“Your new arrangement”** and show the net result, not claim that one card caused everything. A conditional or military Order may have no immediate yield delta: show its current rule/condition using the existing describer instead. Do not fabricate an increase, equate unlike yields, or use UI approximations for sim numbers.

## 6. Trigger and state contract

The names in this section are **proposed tutorial DTO events/facts**, not assertions that these APIs already exist. Batch A freezes their TypeScript contract before other agents consume it.

Keep engine, copy and surface free of `GameState` and simulation imports. Put simulation-aware reading in a narrow `src/tutorialAdapter.ts`, invoked by the host. It can import established readers and produce small serializable DTOs. It never mutates the game or consumes `state.rng`.

Minimum context:

```ts
type GuideMode = 'newcomer' | 'civ' | 'explore';
type GuideHost = 'board' | 'pamphlet' | 'city' | 'technology' | 'discovery'
  | 'orderOffer' | 'statecraft' | 'governmentOffer' | 'doctrineOffer'
  | 'beliefOffer' | 'religion' | 'greatPersonOffer' | 'trade'
  | 'wager' | 'abacus' | 'help' | 'other';

// Final field names are owned by batch A; this is the required meaning.
interface GuideSnapshot {
  runKey: string;
  localPlayerId: number;
  turn: number;
  host: GuideHost;
  hasCapital: boolean;
  hasResearchPlan: boolean;
  hasCapitalProduction: boolean;
  hasActiveOrder: boolean;
  hasCompletedImprovement: boolean;
  // Availability and visible target IDs come from existing legal-action readers.
  opportunities: readonly GuideOpportunity[];
  pendingChoice: GuideChoiceContext | null;
}
```

Named events:

- `gameReady(snapshot)`, `gameResumed(snapshot)`, `localSeatChanged(snapshot)`, `screenChanged(host)`.
- `unitSelected(unitId, category)`, `cityOpened(cityId)`, `tileDetailsOpened(tileId)`.
- `localActionAccepted(action, subjectIds, beforeAfter?)`: only after `result.ok` and local ownership, including actions dispatched outside `controls.onCommand`.
- `localUnitArrived(unitId, fromTileId, toTileId)`: actual change of tile; a queued move with no movement remaining is not an arrival.
- `worldTurnAdvanced(turn)`: actual turn resolution; accepting one player's end flag is not the same event.
- `choiceOpened(kind, offerId, context)`, `choiceResolved(kind, offerId)`; distinguish Order, government, doctrine, pantheon, follower, enhancer, discovery, great person and wager.
- `statecraftCommitted(transactionId, acceptedChanges, netImpact)`: emitted after successful staging submission and refresh. Failed or unchanged staging is not activation.
- `combatPreviewed(context)`, `settlementPreviewed(context)`, `growthRiskChanged(context)`, `localBeadAwarded(context)`, `opusAvailable(context)`, `opusStarted(context)`.

Facts satisfy lessons even when completed before display. Events capture experiences not represented by current facts. Do not complete all lessons sharing a command name: inspect action subject, player and context. Use data markers/readers for categories rather than hard-coded lists of every unit or improvement.

Dispatch audit: current draft, belief and wager paths include direct `dispatch` calls, while controls have their own command callback. Route tutorial reporting through one accepted-result helper or deduplicate by run/local player/accepted log position plus transaction. Never add a second gameplay dispatch to generate a tutorial event.

No interval polling or per-frame empire/map scans. Refresh snapshots only at relevant accepted actions, world-turn settlement, game adoption or screen entry; compute before/after only for a lesson that currently needs it. Reposition a visible board highlight using the existing cheap projection callback.

### Lesson scheduling

1. Existing mandatory game choice owns attention; its relevant inline help takes priority. At a safe first-game entry the pamphlet owns the screen until dismissed; no coach or queued tip appears over it.
2. A relevant current action preview may show its guidance within that preview's host.
3. Otherwise show the next eligible introduction lesson on the board.
4. Optional later tips queue by stable lesson ID, at most one visible; discard stale contexts and do not replay a backlog on load.

Eligibility uses prerequisites and current availability, not exact turn numbers. Preserve out-of-order completion. If a unit dies, target disappears, player changes strategy or screen closes, stop highlighting that target and recompute eligibility. Offer **“Continue without this lesson”** instead of requiring another purchase or replaying an irreversible action.

## 7. Introduction lesson specifications

`N` = newcomer; `C` = Civ-experienced. Both receive welcome and game-specific lessons. Text in braces is a runtime value from current rules/readers, never a literal token shown to players.

### I1 — Select your settler (N; optional controls hint for C)

- Trigger: `gameReady`, welcome acknowledged, no capital, an owned settler available.
- Host/anchor: board; visible settler rectangle through existing board-anchor callback, falling back to its unit-list entry.
- Copy: **“Select your settler”** — “Select your settler on the map or in the unit list. Its available actions appear in the unit panel.”
- Completion: `unitSelected` for an owned settler, or already satisfied by founding. All supported tile/icon/model selection paths count.
- Civ variant: one dismissible line, “Select a unit with left-click; right-click a tile to move. Hover an enemy to preview an attack.”

### I2 — Establish a home (N; optional for C)

- Trigger: owned settler selected, no capital, legal founding action available.
- Anchor: existing Found City action; add `data-guide="found-city"` if no stable hook exists.
- Copy: **“Found your capital”** — “A city works nearby land to grow and build. Fresh water helps growth; inspect this tile, then choose Found City when you're ready.”
- More: “The recommendation is a starting point. You can move your settler and choose another legal site.”
- Completion: accepted `foundCity` for local player, confirmed by `hasCapital`; not button click or rejected attempt. No penalty for choosing another site.
- Recommendation: only identify the verified visible site in the preset; arbitrary games use an existing settlement reader or omit the recommendation.

### I3 — Give your city a task (N)

- Trigger: capital exists and has no production, or player first opens its city screen.
- Host: city; build rail, proposed `data-guide="city-production"`.
- Copy: **“Choose what to build”** — “Production builds one item at a time. A worker improves land; a military unit helps defend it. Choose what your city needs.”
- Optional local recommendation names one legal item and explains its purpose; never override the choice.
- Completion: accepted `setCityProduction` for the capital or existing nonempty production on resume. A purchase alone does not fill a production queue; explain only if relevant.

### I4 — Learn something useful (N; C can open on demand)

- Trigger: capital exists, no research plan.
- Anchor: `#hud-research`; after tree opens, inline at `data-guide="research-choice"`.
- Copy: **“Choose your research”** — “Science unlocks new buildings, units and improvements. Pick a technology that helps your next plan; its prerequisites are shown on the tree.”
- Completion: accepted `chooseResearch` or a valid existing research plan. Opening the tree does not complete the choice.
- After choice: “Your research is underway. Close the tree with Escape or the close button whenever you're ready.” This is contextual help, not a compulsory close-screen lesson. Suppress board lessons while another host owns the screen.

### I5 — Explore and take a turn (N)

- Trigger: an owned scout/movable unit is selected and board is active; after first research/production decisions when possible.
- Copy: **“Explore beyond your borders”** — “Right-click a tile to move your selected unit. A distant destination becomes a route that the unit follows over later turns.”
- Completion: actual local unit arrival; accepted queued orders can show “This unit will continue when it has movement,” but do not pretend it moved.
- Separate End Turn note when research and production are set and the player has acted: **“Let the world advance”** — “End your turn when you're ready. Your cities collect yields and advance their work when the turn resolves. If a choice needs an answer, End Turn takes you to it.”
- End-turn completion: `worldTurnAdvanced` after the local player ended; next receipt points to existing growth/production progress, without inventing a forced build completion.

### I6 — Read what your city uses (N)

- Trigger: first city view after an actual turn resolution; can be revisited from Help.
- Host: city; worked tiles and yield breakdown, proposed `data-guide="city-yields"`.
- Copy: **“Food grows; production builds”** — “Citizens work selected tiles, not every tile inside your borders. Food feeds the city and supports growth; production advances its current build.”
- More: “The city chooses workers automatically. Inspect a worked tile to see what it contributes before changing assignments.”
- Completion: opening a worked tile's detail/breakdown while lesson active, or **“Got it”**. No forced citizen reassignment.
- Teach gold/science/culture/faith/renown only at their relevant decisions; do not introduce seven currencies in this paragraph.

### I7 — Discover an opportunity (N and C)

- Trigger: local `choiceOpened(discovery)`; use the real offer, not discovery proximity.
- Host: inline in discovery choice.
- Copy: **“Choose what helps your plan”** — “This discovery offers a choice of rewards. Compare what each would help you do next, then choose one.”
- Completion: accepted `chooseDiscovery`; inspecting/closing a permitted view does not count.
- If all discoveries are already gone, this remains in Help; it never blocks introduction completion.

### I8 — Improve the land (N; optional for C)

- Trigger: owned worker exists and a visible, legal, useful improvement is available. If prerequisite research is missing, give a contextual explanation on the disabled action rather than a compulsory detour.
- Host: board/unit action, proposed `data-guide="improvement-action"`.
- Copy: **“Make this land more useful”** — “A worker can improve this tile. Check the action's cost and effect; when a city works the improved tile, it receives its yields.”
- Resource More: “An appropriate improvement can also give your empire access to this resource. Access and worked-tile yields are separate benefits.”
- Completion: accepted local `buildImprovement` by a worker, with actual improvement change. A great person's work must not satisfy the worker-action lesson accidentally.
- Receipt: tile contribution before/after from existing tile-yield explanation; if unworked, say **“Improved, but not currently worked.”** Do not claim empire income rose.

### I9 — Draft an Order (N and C; required topic, opportunistic timing)

- Trigger: first local Order offer; distinguish from government/doctrine offers sharing the same surface.
- Host: inline offer help, `data-guide="order-choice"`.
- Copy: **“Culture gives you new choices”** — “Choose an Order to add to your collection. It only takes effect when you place it in a government slot.”
- More: “You can pass if none fits your plan. Owning an Order does not use a slot.”
- Completion: accepted `chooseOrder` with a card chosen. Passing is valid: mark explanation seen, leave activation pending for the next actual Order, and allow the introduction to continue.
- Never prescribe a specific drawn card or reroll. Recommendation, if any, must quote a real condition/impact from the cards actually offered.

### I10 — Put your Order to work (N and C)

- Trigger: an owned unslotted Order can be legally placed, or the player opens Statecraft with such a card.
- Host: Statecraft inline region near slots, `data-guide="statecraft-slots"`.
- Copy: **“Put your Order to work”** — “Place your Order in a compatible slot. Confirm your arrangement, or leave the screen to apply it. Newly placed Orders are locked for {lockTurns} turns.”
- Staging substate: “This arrangement is a preview. It takes effect when the changes are accepted.”
- Completion: successful committed placement present in refreshed live slots; not drag/drop, hover, draft choice or a failed staging batch. The normal X/Escape close route must also count when it successfully commits.
- Receipt: “{orderName} is now active.” Show actual attributable impact, or “Its benefit applies when {condition}.” Use existing descriptions for non-yield effects.
- Follow-up: “Your collection can be larger than your government. Limited slots make your active combination matter.”
- If player unslots it later, preserve completed experience; do not repeat placement coaching.

### I11 — Choose your next ambition (N and C)

- Eligibility: newcomer has founded, established production/research and advanced a turn; Civ player has acknowledged controls/orientation and established those facts. Prefer showing after first Order activation, but do not require waiting for a draft, a worker or a discovery. All unmet topics remain contextual.
- Host: board card, no map highlight.
- Copy: **“What would you like to do next?”** — “You have a working capital. You could develop it, explore farther, or prepare another settlement. Choose a direction and keep playing.”
- Three tutorial-only buttons: **“Develop my capital”**, **“Explore farther”**, **“Prepare to expand”**. They open relevant existing screen/help or show a suggested task; they are not simulation objectives, wagers or commands. Provide **“I'll decide as I play.”**
- Expansion help: “Happiness supports your population; authority supports your cities. Inspect both before committing to another settlement.”
- Completion copy: **“Your civilization is yours to shape.”** — “The introduction is complete. Brief explanations will appear when you encounter new systems. Open Guide in the menu whenever you want help.”
- Civ variant may additionally link a concise differences checklist; no forced tour of absent systems.

## 8. Contextual lesson specifications

All figures below are bound to current data/readers. Initial snapshot: wager stake 2 beads, other goals 1, Opus threshold 7. The UI must not hard-code those values into lesson prose or assume the threshold alone satisfies every Opus prerequisite.

| ID / exact title | Trigger and host | Proposed visible copy | Completion / behavior |
|---|---|---|---|
| `government` / **Choose how you govern** | `choiceOpened(government)`, inline offer | “Your government determines your slots and grants a benefit of its own. Compare the slot arrangement as well as the bonus.” More: “A doctrine is a separate, lasting choice; it does not occupy an Order slot.” | Accepted `adoptGovernment`; follow-up uses actual refreshed arrangement and asks player to review it, never assumes old slots survived unchanged |
| `doctrine` / **Choose a lasting direction** | `choiceOpened(doctrine)` | “A doctrine gives a lasting effect without using an Order slot. Choose a direction you expect to support over many turns.” | Accepted `chooseDoctrine`; don't teach it as another swappable Order |
| `pantheon` / **Choose a belief for your people** | `choiceOpened(belief, subtype=pantheon)` | “Faith has earned a pantheon choice. This belief benefits your empire permanently and cannot be converted away. Consider the land and improvements you expect to use.” | Accepted `chooseBelief` for pantheon; no augur instructions |
| `religionFounding` / **Found a religion** | Local prophet selected with legal founding option, or founding preview | “A prophet can found your religion and establish its holy site. Founding spends {foundingCharges} charges. Inspect the site before you commit.” | Accepted founding via the actual prophet command path; bind markers and charge readers rather than assuming a separate `foundReligion` command |
| `followers` / **A belief belongs to its followers** | First follower offer or first following-city religion detail | “Follower beliefs help every city that follows this religion, even a rival's. Spreading your faith can also benefit the people you convert.” | Accepted follower choice or acknowledged detail |
| `enhancers` / **Support the center of your faith** | First enhancer offer | “Enhancer beliefs strengthen your religion or reward the empire holding its holy site. Read whether this choice rewards your cities, foreign followers, or the spread itself.” | Accepted enhancer choice; use live rules for exact ownership scope |
| `greatPerson` / **A person, a deed, a legacy** | First great-person offer | “Choose a great person for their lasting legacy as well as their immediate uses. Once recruited, they can perform an act or establish a work; either leaves the legacy.” | Choice teaches draft; on owned person selection show actual act/work previews. Spending via act or appropriate work action completes the decision lesson |
| `trade` / **Connect your cities** | Route chooser opened with at least one legal destination; not merely a generic caravan selection | “Choose an origin and destination and compare the route's benefits. The caravan travels automatically. Land routes lay roads as they go.” More uses selected route's sender/receiver breakdown and land/sea type | Accepted `startRoute`; no claim that all yields go to destination or that boats lay roads |
| `combat` / **Read the fight before attacking** | First valid combat forecast with owned attacker | “The forecast shows the expected damage to both sides. Terrain, defenses and unit strength affect the result. You can reposition or wait instead of attacking.” | Forecast inspection plus Got it, or accepted attack; never require attacking or winning. A losing forecast is a valid lesson |
| `settlementCost` / **Can your empire support another city?** | First legal prospective settlement preview after capital | “This settlement would leave you at {projectedAuthority} authority and {projectedHappiness} happiness. Inspect the breakdown before founding.” | Preview acknowledgment or founding; if no authoritative projected value exists, use current meters and omit the projected claim |
| `growthRisk` / **Prepare for more citizens** | Existing growth preview predicts a happiness threshold crossing, or actual deficit starts | “Your population is approaching what your current happiness can support. Inspect the happiness breakdown and look for a suitable source of support.” Actual deficit variant quotes the current penalty from the reader | Informational; no compulsory building/card. Do not interrupt every population increase |
| `authorityRisk` / **Your authority is stretched** | Actual local authority crosses below zero; relevant preview takes precedence if available | “Your cities are demanding more authority than you have. Inspect the meter to see the current penalties and sources of authority.” | Once acknowledged; show live penalty lines rather than stale fixed claims |
| `wager` / **Choose your wager for this age** | First local `choiceOpened(wager)`; never merely any `ageOpened` | “Everyone is offered these three goals. Your stake is private; everyone's progress is public. Meet your staked goal for {stakeBeads} beads, and either other goal for {otherBeads}.” Inline second paragraph: “Several civilizations can meet the same goal. Miss your stake before the age closes and you receive a malice: an unwanted Order that occupies a slot until the next judgement.” | Accepted `chooseWager`; explanation shown before commitment, with no forced example stake. Verify malice duration/stack rules at implementation |
| `wagerDeadline` / **The age is drawing to a close** | First announced age-close countdown while an unmet local stake exists | “Your wager has {turnsRemaining} turns remaining. Check your progress and decide whether to keep pursuing it.” | Dismissible single notice; exact deadline comes from world-clock state, not the player's technology age |
| `bead` / **A step toward the Magnum Opus** | Actual local bead award, after award ceremony ends | “You now hold {beadCount} beads. At {beadThreshold}, you can qualify to begin the Magnum Opus once its other requirements are met.” Link **“View the bead ledger”** | No extra modal; skip if ceremony already conveys equivalent information; never fire for a rival's award |
| `opus` / **Your final work** | Existing build-eligibility reader says local player can begin Opus | “Your civilization can begin the Magnum Opus. Open a city's production choices to inspect its cost. Completing it wins the game.” | Accepted production choice or dismissal; do not autoqueue |

For the wager sheet, provide **“View map”** and **“Return to wager”** using the existing deferred-choice/blocker flow. If the current sheet cannot leave before selecting, add a close/defer path that preserves the same offer and End Turn requirement; it must not redraw, choose a default, or permit ending the turn without a stake. On return, keep selection/progress context, re-read current values, and show no duplicate lesson.

Glossary content remains in the Compendium. Tutorial “More” links should point to existing entries when available rather than creating another full rules encyclopedia.

## 9. Storage, replay and lifecycle

- Version UI memory to v2. Separate **preference/topic familiarity** from **this run's action progress**. One tutorial completion must not imply a new world's capital already exists. Keep pamphlet version, shown/dismissed status and last manually viewed page separate; they never imply action completion. Recognize an existing pamphlet dismissal without forcing returning users to reread, and make the updated booklet available from Guide.
- Store mode, paused state and topic acknowledgments in the preference record. Stable lesson IDs replace fragile step indexes.
- Maintain per-run progress under a UI run key; associate it with local save-slot IDs in sidecar storage. The existing replay payload remains `{config, log}`. Do not use seed alone as identity: two starts on the same seed are different runs.
- On fresh game create a fresh UI run key without touching sim RNG. On saving/loading within this browser, preserve/recover the sidecar association. On page refresh, recover through the resumed save identity when available.
- Loading an imported save or losing sidecar storage: derive safe completed facts from the loaded world, retain user preference if available, and start with contextual help. Never ask an established empire to found its first city. Historical experiences that cannot be inferred are optional, not mandatory chores.
- Historical progress from a later save must not satisfy false current prerequisites after loading an earlier save. Recompute availability and current facts; familiarity may stay learned. Key required action progress to run/local seat plus the relevant accepted log position or checkpoint.
- Ignore replayed historical commands for live toasts/lessons. Take one snapshot after replay settles; never emit a flood of discovery/draft lessons while reconstructing a save.
- Scope progress to the viewed local seat; hotseat changes hide previous-seat copy and clear private offer/stake payloads. Bot actions never satisfy the human's actions. Public world events can make a local lesson eligible only after reading local context.
- `close`/suspend on landing or Restart hides the guide and clears transient queued contexts; dispose only when replacing its owning UI instance. Do not repeat the earlier failure mode where screen listeners were disposed but screen objects reused.
- Storage exceptions fall back to in-memory operation without blocking play. Migrate v1 enabled=false to explore; never automatically re-enable guidance for an opted-out user. Do not import v1 seen flags as proof that outdated victory/religion lessons are understood.

## 10. Delegation batches and file ownership

At most three independent implementation agents alongside the coordinating agent. **The coordinator is the sole editor of `src/main.ts` and final integration docs.** Freeze interfaces before parallel work. No agent commits, pushes, resets or stashes. Agents run their own narrow tests; the coordinator runs settled-batch gates.

### Batch A — Contract and lesson engine (first, sequential)

Owner: engine agent. Files: new `src/ui/tutorialModel.ts`, `src/ui/tutorialEngine.ts`, `src/ui/tutorialMemory.ts`; own focused tests. Do not edit `main.ts`, HTML, CSS or existing tutorial surface yet.

Brief: “Implement the pure v2 guide contracts, prerequisites, out-of-order completion, prioritization, deferred topics and storage migration from tutorial-redesign.md §§3A/6/9. Include first-run pamphlet presentation and dismissal acknowledgment without equating reading with accomplishment. No DOM or sim imports. Export explicit typed APIs for the copy and surface agents. Distinguish seen, accomplished, snoozed and completed. Return unchanged state for irrelevant signals. Include a contract note for integration and narrow behavior tests.”

Acceptance: rejected/bot/staged-only actions cannot complete lessons; context changes hide stale targets; arbitrary lesson order works; old storage and absent storage safe. Coordinator reviews and freezes API before B/C start.

### Batch B — Copy catalog and opening pamphlet content (parallel after A)

Owner: content agent. Files: new `src/ui/tutorialLessons.ts`, new `src/ui/pamphletPages.ts` (copy, shot metadata and captions), focused catalog tests. The surface agent owns the existing `src/ui/pamphlet.ts`; do not edit it concurrently. Coordinator integrates imports and preserves necessary exports. No shared surface/main/CSS edits.

Brief: “Implement exact proposed copy and trigger metadata from §§3/3A/7/8 using the frozen contracts. Implement all eight pamphlet pages, layout legends, controls, alt text and shot references from §3A. Use named runtime parameters from supplied DTOs for all rules and numbers. Verify statements against current sim data, actual controls and reference docs. Replace obsolete pamphlet content rather than append new pages to the old sequence. Do not change game balance, invent unimplemented lesson events, or rewrite unrelated flavor.”

Acceptance: newcomer/Civ/explore eligibility is explicit; runtime placeholders resolved; rule values have one source; no retired mechanics described as live; all required More/fallback variants provided. Eight pages each have body copy, appropriate image references, captions/alt text and at most two main body sentences; legends are separately modeled. Update the old prose tests deliberately: runtime rule values may be digits, so a blanket no-digits assertion must not force duplicated spelled-out constants.

### Batch C — Accessible coach and inline host UX (parallel after A)

Owner: surface agent. Files: `src/ui/tutorial.ts`, optionally new `src/ui/tutorialSurface.ts`, existing `src/ui/pamphlet.ts` for rendering/lifecycle only, tutorial/pamphlet-scoped CSS in `src/style.css`, surface/placement tests. No `main.ts`, landing HTML or gameplay screen edits; no edits to the content agent's new copy modules.

Brief: “Render the frozen model and catalog as the nonmodal board coach, collapsed chip, help library and inline host panel defined in §5. Update the existing pamphlet surface to §3A: persistent Start playing, labeled contents, readable real screenshots, scaled callouts, accessible captions, manual Return to game and safe close/escape behavior. Accept host/anchor callbacks; do not reach into simulation. Implement keyboard/focus/reduced-motion and safe missing-anchor behavior. Expose mount/unmount of inline help to integration; do not create a second modal stack.”

Acceptance: no covered actions at tested viewport sizes; no focus theft; highlight receives no input; no DOM recreation or layout measurement every frame; close/suspend/dispose lifecycle tested. Coordinator supplies fixture catalog if B is not yet ready.

### Batch D — Read adapter and host integration (coordinator)

Files: new `src/tutorialAdapter.ts`, `src/main.ts`, small explicit hook additions to relevant screens/controls, `index.html`, existing game setup tests. Sole owner of shared entry points.

Tasks:

1. Replace checkbox with mode selection; wire safe first-guided-game pamphlet → action-guide presentation from §3A, plus manual Guide/Compendium reopening. Dismissal never restarts the guide twice or consumes a game command; no repeated welcome after reading the pamphlet.
2. Wire accepted-result reporting for controls and direct dispatch; identify actual before/after boundaries for staging, improvement, turn resolution and movement.
3. Add host change and typed choice subtype events; use existing shell lifetime and close behavior.
4. Add stable `data-guide` attributes where existing anchors are inadequate. Do not bind to translated text or generated child indexes.
5. Mount relevant inline help into offer/Statecraft/wager hosts; provide View Map/Return flow without changing wager enforcement.
6. Connect save sidecars, imported-save fallback and replay suppression; wire Help/library entry.
7. Confirm truth of all dynamic values and current Opus prerequisites via existing readers.

Acceptance: a complete ordinary opening works in both modes; accepted action de-duplication demonstrated; Statecraft X/Escape and wager return paths work after Restart and load. Avoid starting parallel screen edits while this batch is underway.

### Batch E — Recommended opening preset (independent research, integrate after D)

Owner: preset agent. Files: new `src/ui/tutorialPreset.ts` (or similarly scoped config module), isolated preset verification tests and short evidence note. Coordinator wires landing entry; agent does not edit mapgen algorithms or `main.ts`.

Brief: “Find a reproducible existing-game configuration satisfying §4. Report the actual seed, leader, options, visible opening landmarks and a replayable ordinary-command opening. Validate both normal rendering and deterministic generation. Do not manufacture map resources, disable legality, rig card offers or modify AI behavior. Show why first-draft timing is practical and what happens if the player chooses another legal action.”

Acceptance: fixture criteria test; human-reviewable screenshot of visible opening; no spoilers in normal UI. Extended seed/pacing sweeps belong in the slow tier, not a frequently run unit test.

### Batch E2 — Pamphlet screenshot production (after D; coordinate fixtures with E)

Owner: screenshot agent. Files: `public/pamphlet/v2/` images, manifest and agreed example replay fixtures only. No changes to main, surface code, copy or the user's saves. Read the applicable browser skill before capture.

Brief: “Produce every shot in tutorial-redesign.md §3A from the integrated painted build. Inspect old pamphlet assets before considering reuse. Use deterministic example states, capture actual control/forecast/slot/requirement behavior, and provide all page captions/alt descriptions and manifest data to the content agent. No AI-generated game UI, image edits that alter factual content, or unsupported claims about missing artwork. Verify readability and marker alignment in the implemented booklet, not only at full image resolution.”

Acceptance: all eight pages have their required shots and detail insets; no missing files; no retired unit art or mechanics; screenshot text legible at normal booklet size. Submit a complete booklet eye-check before calling assets final. Late-game wager/Opus examples use approved replay fixtures rather than waiting for the user's tutorial to reach those stages.

### Batch F — Integration QA and documentation (after D/E/E2)

Owner: QA agent for tests/evidence only; coordinator owns fixes in shared files and updates `docs/README.md`, `docs/pamphlet.md` and the tutorial reference, reconciling the earlier pamphlet specification with §3A. QA may add dedicated tests within an agreed fence.

Brief: “Exercise §11 in the actual game UI, not only a mocked guide page. Capture faults with reproduction sequence, viewport, mode, active lesson, host and save/restart state. Validate pamphlet first-run/skip/reopen flow, screenshot readability and control accuracy, opening, first Order commitment, first wager, failure handling and returning from other screens. Do not implement speculative fixes or run the full repository suite.”

Coordinator runs `npm run typecheck`, `npm run test` (core), and `npm run build` after each settled implementation batch. Run `npm run test:all` before any authorized push, as required by repository policy. Do not interpret this plan as permission to commit or push.

## 11. Test and review checklist

### Automated behavioral checks

- N/C/explore mode routing; pause versus opt-out; choosing a mode does not alter simulation state.
- First guided entry shows pamphlet before coach; Start playing/X/Escape dismiss exactly once; manual reopening returns without restarting the guide. Explore, imported saves and returning opted-out users receive no automatic booklet.
- Reading or skipping a page never completes an action lesson. Repeated welcome suppressed only when appropriate. Pamphlet progress/version storage tolerates errors independently of run progress.
- All required screenshot paths resolve, alt/caption/legend strings exist, and screenshot metadata identifies the example state; missing required images fail release acceptance. Dynamic figures use current rules, and essential controls agree with the active handlers.
- Production before research, exploration before founding, already active Order, and skipped optional work all progress sensibly.
- Rejected founding/placement/improvement/stake, bot actions and unchanged staging never count as success.
- Zero-movement orders teach queued movement without claiming an arrival; actual later arrival counts once.
- Statecraft drag does not complete activation; Confirm and normal close both complete it only after accepted changes.
- All direct-dispatch offer types report exactly once and with correct subtype/local ownership.
- Conditional Order has truthful explanation; unworked improvement has no invented empire-income increase; a multi-card batch attributes only its net effect.
- Lesson sequence does not wait for a worker, discovery, attack, first age transition or particular card.
- Wager explanation uses actual reward, deadline and penalty rules; leaving/reopening preserves the same deal and existing End Turn blocker.
- Import/load/Restart/earlier-checkpoint/hotseat do not leak private content, resurrect stale anchors or replay historical notices.
- Tutorial enabled/disabled produces identical `{config, log}` simulation state for the same ordinary command sequence; UI sidecar changes are ignored in that comparison.
- Bad/missing/future storage falls back safely; prior disabled preference remains disabled.

### Browser acceptance walkthroughs

1. Fresh storage, newcomer, recommended opening: read pamphlet → Start playing → selection → city → production/research → exploration → end turn → discovery → real Order draft/activation. Check actual receipts. Repeat skipping from page 1 and closing from a middle page; neither should trap the player or double-start the guide.
2. Civ mode: foundation steps absent; distinctive-system help present. Choose an unexpected Order and confirm correct copy.
3. Explore mode: no unsolicited guide, manual lesson library works.
4. Open research, then city, then Statecraft; slot an Order and use X. Repeat with Escape. Restart and repeat. Save/load and repeat. No trapped screen or invisible click catcher.
5. Trigger two choices on one turn. Only the active host's help appears; queued tip disappears if no longer relevant.
6. Use a later ordinary-game save/fixture to review pantheon, follower, enhancer, great-person, trade and wager lessons. Fixtures must go through existing replay/test mechanisms; do not add hidden production-game cheats.
7. Review wager → View Map → city/research → Return to wager → choose stake. Verify no redraw, accidental choice or extra keyboard handler.
8. Test at 1440×900 and 1280×720, browser zoom 125%/200%, keyboard-only and reduced motion. Check a narrower viewport supported by the existing app without promising a new mobile UI.
9. Reopen pamphlet from Guide and Compendium, visit its details/contents, enlarge a shot if supported, and close back to the invoking surface. Confirm current-page restoration, no gameplay shortcut leakage, and safe underlying Statecraft/wager lifecycle.
10. Compare each screenshot to the actual screen/action it teaches: top bar, side menus, unit panel, context panel, End Turn, unit/icon selection, click-versus-drag, M mode, pan/zoom, legal attack forecast and screen close. Inspect text/marker legibility at displayed size, including a simulated failed image load.

Capture examples for user eye-check: all eight pamphlet pages (particularly layout, controls and small-text details), landing modes, board coach with terrain visible, expanded/collapsed help, Order offer, Statecraft staging versus committed receipt, and first wager. Test DOM behavior as well as screenshots.

### Delivery checkpoints

- **Review 1:** mode selector, pamphlet layout/selection/movement pages, pamphlet-to-guide handoff, first capital and board coach. Confirm density, screenshot readability and placement before polishing all later screens.
- **Review 2:** first draft → Statecraft → committed effect, including both close methods.
- **Review 3:** contextual religion/great-person/trade help and wager/map return.
- **Review 4:** complete illustrated pamphlet, recommended opening and newcomer/Civ walkthroughs; collect separate pamphlet skim time and guided-play timing/comprehension feedback.

Do not declare the tutorial complete solely because tests pass. Ask a newcomer to explain food/production/worked tiles and choose a next action without prompting; ask a Civ player to explain Order activation, authority and the wager. Revise the lesson that failed that comprehension check rather than adding another mandatory page.
