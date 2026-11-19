# Handoff to Astra: bots, rendering, 3D models and code quality (2026-11-18)

The user's ruling, 2026-11-18: *"i'd like to pivot to using this session for UI
and gameplay related things, while i have astra work on 3d modelling and code
improvement things"*, and *"i'd like astra to handle the rest of the bot work
and work unrelated to UI or gameplay"*.

This document tells Astra what it owns, what state each piece of work is in,
and the rules of the repository. Read `CLAUDE.md` (or `AGENTS.md`, the same
text) and `docs/README.md` first. They are the briefing. This document does not
repeat them.

## 1. Who owns what

| Area | Owner | Main folders |
|---|---|---|
| Bot play, bot speed, the spectator and arena pages | **Astra** | `src/ai/`, `src/spectate/`, `src/arenaPage/`, `data/ai.json`, `test/sim/ai*.test.ts` |
| Rendering speed and the 3D renderer | **Astra** | `src/render3d/`, `data/view3d.json`, `test/render/` |
| 3D models (unit pieces, towns, wonders, props) | **Astra** | `src/render3d/`, `src/piecesGallery/`, `pieces.html` |
| Code cleanliness and general performance | **Astra** | the whole tree, with the limits in section 5 |
| Screens and other DOM interface work | Claude session | `src/ui/`, `src/main.ts`, `index.html`, `src/style.css`, `src/flairGallery/`, `src/art/` |
| Game rules, cards, decks, balance data | Claude session | `src/sim/`, `data/` (not `ai.json`, not `view3d.json`), `docs/decks/` |

If a piece of Astra's work needs a change in a folder the Claude session owns
(or the reverse), keep the change small, name it in the report, and expect a
merge. Section 5 lists the files in flight today.

## 2. State of the repository

- Working branch: `decks`. HEAD at the time of writing: `120ddab8` plus this
  document. Nothing from this branch has been pushed since the last deploy.
- Last full gate on `decks`: typecheck 0, 518 test files and 12,017 tests, the
  bot digest slow test 0, build 0.
- `SCHEMA_VERSION` is 245.
- Bot digest pins (`test/sim/aiDigest.slow.test.ts`): duel `2fa80e05:339704`,
  standard `040c052c:1045966`. A change that should not alter bot play must
  keep both. A change that does alter bot play cuts new pins and says why.
- The play server for the user's playtests is the clone `~/code/webciv-play`
  on port 5199. Never kill a Vite process you did not start. Never run
  `pkill -f vite`.
- Shared measurement baselines: `/Users/jacky/code/webciv-baselines/` (read its
  README). Five seeds: 42, 999, 1, 7, 2026.

## 3. Work Astra takes over

### 3.1 Bots

**In flight, finished by the Claude session before the handoff:**
- Stage C1, frozen-board play on one thread. An agent is building it. The
  Claude session gates and lands it, then stops bot work. Astra starts from
  the commit that lands C1. The landing commit and the agent's report will be
  added to section 7.

**Astra's first step (the user's words): reconcile the spectator and the
regular bot logic.**
- The game drives bots through `src/ai/driver.ts`, `src/ai/stepper.ts`,
  `src/ai/bot.ts` and `src/ai/sittingPhases.ts`.
- The spectator page is `spectate.html` with `src/spectate/main.ts`. The arena
  page is `arena.html` with `src/arenaPage/`.
- Find every place where the spectator or the arena runs a bot differently
  from the game, and make them one path. The digest pins must hold, because
  bot decisions must not change.
- `CLAUDE.md` rule: the arena panel is generated from `data/ai.json`. A new
  bot setting must appear there with no page edit.

**Queued after that, in this order (specs in `docs/flags.md`, lines near 101):**
1. Stage C2: bot seats on workers. It waits for a decision on the C1 report.
2. BP17: the bots think during the player's turn.
3. BP18: think about slow things less often.
4. BP19: price a shortlist of cards, not every card (audit finding T6).

**Read before any bot work:**
- `docs/bot-priorities.md`, section "The order of a sitting".
- `docs/plans/performance-pass-2026-11-06.md`: every bot batch so far, with
  measurements. Sections "Stage B" and "BP16b-fix: the order fault".
- `docs/flags.md`: "Bots after BP16 stage B", "BP16b-fix: the order fault,
  found and not shipped".

**Known and not shipped:** a bot's context memos can be stale (0.9% of kept
reads). The exact fix costs 5 to 8% of bot time, so the user did not ship it.
The patches are in `/Users/jacky/code/webciv-baselines/bp16fix/`.

**A warning about estimates:** speed estimates for bot batches have been wrong
several times in this project. Measure on the five seeds before you claim a
gain. See the memory note on probe noise: 8 seeds cannot read happiness, and
ms per turn varies by about 14 between a cold and a warm run.

**Open questions for the user on bots:** a 16-seed check against the build
before BP13; audit items T1, T5 and T6; a persona for each leader.

### 3.2 Rendering speed

**In flight, finished by the Claude session before the handoff:**
- Ground paint texture, stages 1 and 2: plain textured land at the middle and
  farthest zoom, the cut mesh at the closest zoom, with a switch back. The
  Claude session gates and lands it. Section 7 will name the commit.

**Queued for Astra:**
- Ground paint texture, stages 3 and 4. Plan and measurements:
  `docs/plans/ground-paint-texture-2026-11-18.md`. Rulings: `docs/flags.md`,
  "Rendering focus: the ground paint texture" and "Ground paint texture: build
  stages 1 and 2".

**Deferred by the user (do not build without a new ruling):**
- Simpler trees ("way too simplified").
- The scroll cache and its zoom handling.
- Lower resolution while the camera moves.

**Read first:** `docs/plans/render-performance-2026-11-16.md` (five passes,
with what was measured). The main facts: a pan frame is limited by the GPU's
fragment work; multisampling costs 9 to 13 ms; the land is drawn with vertex
colour.

**The user tests in a WebKit browser now.** Check rendering work in Safari or
another WebKit browser as well as in Chromium.

### 3.3 3D models

- Art direction is settled: a toon diorama made of procedural primitives.
  `MeshToonMaterial` ignores `flatShading`, so facets are baked into geometry.
- The user's past rulings on models are in the memory note "Visual pass
  2026-11": unit pieces are chess pieces with small, readable changes. Visual
  changes must be simple to revert.
- A new visual asset joins `flair.html` or `pieces.html` in the same change
  that ships it.
- The 3D abacus (`src/render3d/abacus3d.ts`) is finished in look B. Its bead
  count waits for the wager rework, which is gameplay. Leave it.
- Wonders will later get painted splash art in the interface. That is an
  interface job. 3D wonder models on the map are Astra's.

### 3.4 Code cleanliness and general performance

- There is an untracked audit by the user, `docs/plans/code-quality-audit.md`.
  Ask the user if it is the starting list.
- `docs/plans/tidy-2026-10-26.md` records the last tidy pass.
- The register tests in `test/` pin many structures on purpose (one switch on
  `CardEffect.kind`, the exhaustiveness idiom in the reducer, re-exports by
  name, the list of yield mutations). Read the "Hard rules" and "Traps"
  sections of `CLAUDE.md` before you simplify anything. Several things that
  look like duplication are pinned and have a stated reason.
- `src/render/` is the frozen 2D renderer. Keep it compiling. Add nothing.
- Do not rename the RNG separator `hashSeed('webciv:gameplay:…')`.

## 4. Rules that apply to every change

- **Rulings go in a file before work starts.** `docs/flags.md` for open
  rulings; the system's reference document for the rest. A chat message is not
  a spec.
- **The gate for each landed change:** `npm run typecheck`, `npm run test`,
  `npm run build`. When sim or bot code changes, also
  `TEST_TIER=slow npx vitest run test/sim/aiDigest.slow.test.ts`. Check exit
  codes, not summary lines.
- **The push gate is `npm run test:all`.** The user must say yes to each push.
- **Machine load.** The laptop is slow under several jobs. Run every command
  behind `nice -n 15`. Run one gate at a time. Check `uptime` first: at a load
  above about 50, vitest tests time out for no real reason. Rerun a failed file
  alone at low load before you call it a failure. Keep the laptop on power for
  measurements.
- **Subagents** run only their own test files, never the whole suite, and
  never commit, stash, check out or reset.
- **Commit by explicit path.** Leave these alone: `.claude/settings.local.json`,
  `docs/playtest_notes.md`, the untracked `docs/*.md` files, `.impeccable/`.
  Do not edit `CLAUDE.md` or `AGENTS.md` without the user's approval.
- **Determinism.** Same config and command log give the same state, bit for
  bit. Rendering never reads sim randomness. `test/sim/explore.test.ts` pins
  hash the schema number, so a schema bump moves them with no change in play.
- **Writing.** Plain English, ASD-STE100 at about 75%, Orwell's six rules, no
  em dashes, they/them for people.
- **Pictures for the user** go in one page with the images embedded as
  `data:` URIs. Separate picture files do not load in the user's browser.

## 5. Files in flight in the Claude session (avoid, or expect a merge)

| Job | Files |
|---|---|
| Council and In play, stage 4, and the wonder plate | `src/ui/statecraftScreen.*`, `src/ui/councilLayout.ts`, `src/ui/inPlay*.ts`, `src/main.ts`, `index.html`, `src/flairGallery/` |
| Generic Orders build (starts after C1 lands) | `data/decks/common.json`, `src/sim/statecraft/*`, `src/sim/statecraftData.ts`, `src/sim/commissions.ts`, `src/ai/value.ts`, deck tests. **It changes the digest pins.** |
| Later gameplay work (`docs/beta-checklist.md`) | `src/sim/`, `data/` |

Two meeting points to watch:
- **`src/ai/value.ts`.** A new card shape needs a bot value. The Claude session
  adds that line with the card. Astra owns the rest of the file.
- **The digest pins.** Both sides can move them. Whoever lands second merges
  `decks` first, reruns the digest test, and cuts the pins on the combined
  tree. Never copy a pin from a branch.

## 6. How to work beside the Claude session

- Work on a branch or worktree made from `decks`. Do not commit to `decks`
  directly while the other session has work in flight.
- To land: merge `decks` into the branch, run the whole gate there at low
  load, then fast-forward `decks` (or make a merge commit if `decks` moved by
  documents only). Then update the play clone:
  `cd ~/code/webciv-play && git pull -q --ff-only /Users/jacky/code/webciv decks`.
- Existing agent worktrees are in `.claude/worktrees/`. Do not edit or remove
  them.
- Record what landed, with the gate result, in the plan document for that
  area (`performance-pass-2026-11-06.md` for bots,
  `render-performance-2026-11-16.md` for rendering).

## 7. Handoff points (the Claude session fills these in)

| Work | Landed at | Notes |
|---|---|---|
| Bots stage C1 | not landed yet | |
| Ground paint texture, stages 1 and 2 | not landed yet | |
