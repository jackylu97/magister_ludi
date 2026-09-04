# The Pamphlet & the tutorial flow (spec of record, ruled 2026-09-03)

The user's ruling, verbatim intent: an introductory pamphlet a new player can
skim in ~5 minutes, shown to new players BEFORE the tutorial steps, and
accessible forever after through the compendium. Then an audit-and-rewrite
pass over the tutorial flow itself.

## The pamphlet — ruled contents

- Where to click units to select them (on the tile or the unit icon).
- How to move and attack with units.
- An overview of: the tech tree, the Statecraft screen, the Religion
  screen, the city screen.
- Walk through basics: building things in cities, founding more cities,
  progressing through the tech tree.
- What the win conditions are (beads, the Great Work).
- A cursory explanation of the authority and happiness meters.
- ~5 minutes to skim. Plain first-time-player words throughout (rule 7).
- Lives in the compendium afterwards (a stable anchor; reachable from the
  in-game "?" overlay), and is shown once to a new player before the
  tutorial's first step.

## Orchestrator's additions (veto any by editing this list)

Ruled question answered here — "what other things should we include":

1. **Ending the turn** — what the End Turn button waits for (the blockers:
   an idle unit, an empty build queue, an unspent draft) and that this is
   the game telling you what it needs, not an error.
2. **Workers and charges** — improvements come from workers, a worker is
   spent over a few uses, the chop is a trade not a cleanup.
3. **Reading a tile** — the tile info card and the yields lens; food grows
   the city, hammers build, coins keep the army paid.
4. **The fog and the wild** — exploring pays (ruins/discoveries), barbarian
   camps spawn raiders until burnt; a garrison at home is not optional.
5. **The first draft** — when the first order arrives: cards, slots, and
   that a draft not taken blocks the turn.
6. **The growth ring and the city banner** — what the numbers and ring on
   a banner mean at a glance.
7. **Meters as triggered moments** — the pamphlet gives the cursory
   version; the tutorial fires a short note the FIRST time happiness dips
   negative / authority goes over capacity (teach at the moment it hurts,
   not in advance).
8. **War in one panel** — you are at peace until someone declares; the
   Diplomacy screen (flag button / W) is where war, peace, and deals live.
9. **Where help lives** — the "?" compendium overlay itself; every
   underlined word is a link.
10. **A first-goals checklist to close the pamphlet** — "found a second
    city · finish your first technology · build a worker · clear a camp" —
    gives the first ten turns a spine.

Deliberately NOT included: trade routes, religion beyond the one-line
overview, great people mechanics, puppets/annexation detail — the
compendium carries those; the pamphlet stays skimmable.

## Panels

**Actual screenshots** (re-ruled 2026-09-03: "i'm worried the drawn panels
will be unclear" — this supersedes the earlier drawn-panels plan). Each
major section gets one screenshot of the real game. Build order:

- The pamphlet's layout carries an image slot per panel (`<img>` against a
  path under `public/pamphlet/`, with a caption and an ink-frame in the
  specimen language; a missing file degrades to the caption alone, never a
  broken-image glyph).
- The agent ships the frames plus a **shot list** in this doc's "As built"
  section: per panel — which screen, what game state, what must be visible,
  suggested crop. The orchestrator captures the shots against the running
  game afterwards and drops the files in.
- Screenshots rot when the UI changes; the shot list is what makes a
  re-capture a chore instead of an archaeology dig. Keep it exact.

## Re-ruling 2026-09-03 — pages, pictures first

The user, on seeing the first build: screenshots must actually be present
(with cursor indicators / markings where a click target needs pointing
at), the pamphlet breaks into MULTIPLE PAGES, and it leads with visual
explanation — "so that it isn't too text heavy". Binding shape:

- A pager: one topic (or two tightly-paired topics) per page, next/back
  and page dots, Esc still dismisses; the compendium mount pages the same
  way.
- Per page: the screenshot is the hero, the text is caption-weight — a
  heading and at most two short sentences. Every longer explanation
  either dies or moves to the compendium's ordinary entries.
- Cursor indicators and markings are BAKED INTO the captures, not
  positioned by the page (a recapture would orphan positioned marks):
  the orchestrator injects a drawn cursor / highlight ring into the live
  game DOM before each capture, per the shot list's "mark" column.
- The shot list gains that "mark" column: what the cursor points at or
  the ring circles, per shot.
- Missing images still degrade to the caption; pages never show a broken
  glyph.

## The tutorial-flow audit (second half of the batch)

- The tutorial shows for new players AFTER the pamphlet (pamphlet → step 1).
- Language pass: clear, beginner-safe words. The ruled example: refer to
  the tech chart as **a tree with nodes** — never "click a star"; audit
  every step/tip for terms that assume the game's own visual metaphors are
  already learned.
- Existing steps/tips (11 STEPS + 9 TIPS in `src/ui/tutorial.ts`, plain-
  voice pass 2026-09-03) are the base; rework, don't restart.
- The triggered-note additions (item 7 above) join the TIPS table's
  mechanism if it supports condition-fired tips; if it doesn't, that gap is
  part of the audit's report.

## As built (2026-09-03; re-worked same day to the pages re-ruling)

- **Code**: `src/ui/pamphlet.ts` — the one table (`PAMPHLET_PAGES`), the
  one printer (`renderPamphletBody`, which builds the pager), the pure step
  (`pageStep`, clamped, never wrapping), the first-run memory
  (`readPamphletSeen`/`writePamphletSeen`, key `magisterludi:pamphlet:v1`,
  the tutorial memory's tolerance), the pure decision (`shouldShowPamphlet`)
  and the first-run overlay (`createPamphletOverlay`). Styles at the foot of
  `src/style.css` (`.pamphlet-*`, `.cmp-pamphlet`).
- **Shape**: a pager — one page up at a time, back/next buttons (disabled at
  the ends), one dot per page, Esc still dismisses the overlay. Which page
  is showing is DOM state only; nothing persists but the seen-memory. Both
  mounts page identically because both call the one printer.
- **Pages, in flipping order** (ids): board · orders · city · banner ·
  tile · tree · draft · workers · fog · endTurn · meters · war · winning ·
  help (paired with the first-goals checklist). Every page but the last
  leads with its screenshot as the hero; the text is a heading plus at most
  two short sentences (budget pinned in `test/ui/tutorial.test.ts`).
- **Prose cut/moved by the re-ruling**: the first draft's paragraphs died
  where the Compendium already said the same thing (`intro:howToPlay`,
  `intro:aTurn`, `concept:cities/combat/technology/statecraft/resources/
  fog/meters`); the two facts the book did NOT yet carry moved into
  `compendiumText.ts` — the banner reading (size number, growth ring, build
  line) joined `concept:cities`, and the yields lens joined
  `concept:yields`.
- **Compendium anchor**: `intro:pamphlet`, first entry on the Introduction
  shelf (`pamphletEntry()` prepended to `INTRO_ENTRIES` in
  `compendiumText.ts`; drawn as the same pager via the entry's `pamphlet`
  flag in `compendium.ts`). The book still opens on `intro:howToPlay`.
  Prose is searchable; keyword refs resolve (pinned).
- **First-run ordering**: `beginOpening()` in `main.ts` — both new-game
  sites (boot and `adoptGame`) call it; it shows the pamphlet iff
  `shouldShowPamphlet(seen, tutorial.enabled())`, and the dismissal (button
  or Escape) writes the memory then calls `tutorial.begin()`. A loaded save
  takes `tutorial.resume()` and meets neither. The overlay's foot sentence
  says where the pamphlet lives afterwards.
- **Meter notes (item 7)**: built on the existing TIPS mechanism — tips
  `unhappy` / `overreach` on events `happinessDeficit` / `authorityOverrun`,
  fired from `noteMeterPain()` in `main.ts` on the commit funnel, gated on
  `wantsTip` and read off `happinessOf`/`authorityOf` (the chips' own folds).
- **Tutorial rewrite**: the three tree steps no longer say "star chart" /
  "Aim at a star" — they say technology tree, nodes, lines (sweep pinned:
  no `star` in any player-facing line); the welcome card glosses the Abacus
  ("the bead counter at the top of the screen"); the closing card points at
  the pamphlet.
- **Tests**: `test/ui/tutorial.test.ts` (pamphlet table/prose/memory/
  ordering pins, meter-note wiring, the no-star sweep) and
  `test/ui/compendium.test.ts` (anchor, deep link, search, refs, printer).

### Shot list (capture against the running game, drop into `public/pamphlet/`)

General: capture at 100% browser zoom, window ≈1440px wide, light theme
(the game's only theme). PNG, roughly 1200px on the long edge after crop.
A missing file degrades to the caption alone — panels can land one at a time.

**Mark** = the cursor indicator / highlight ring to bake INTO the capture
(inject into the live game DOM before shooting — a drawn cursor arrow at the
named element, or a vermilion ring around it, in the specimen's ink). Marks
are never positioned by the page; a recapture re-bakes them.

| file | screen | game state | must be visible | mark | crop / aspect |
| --- | --- | --- | --- | --- | --- |
| `select-unit.png` | the board + unit panel | fresh game, turn one; click the settler | the settler's ring on its hex AND the unit panel with Found City | cursor on the settler's hex; second smaller cursor on its panel row | right half of screen, ≈3:2 |
| `move-attack.png` | the board | any game with a barbarian in sight; select a warrior, hover the enemy | both pieces, the hover combat forecast card with the two strength lines | cursor on the enemy piece; ring around the forecast card | around the two hexes + card, ≈3:2 |
| `city-screen.png` | the city screen | capital a few turns in, two or three build choices listed | the build queue/choices and the worked-hex view | cursor on one build choice's row | the open panel, ≈4:3 |
| `city-banner.png` | the board, zoomed in | a city of size two or more, mid-growth, building something | the banner: size number, part-filled growth ring, production line | ring around the growth ring + size number | tight on one banner, ≈5:2 |
| `tile-readout.png` | the board + tile card | yields lens ON; hover a grassland hill or a resource hex | the tile card (terrain + yields) and lens figures on nearby hexes | cursor on the hovered hex | hovered hex + card, ≈3:2 |
| `tech-tree.png` | the technology tree | a research aimed with a queue (Shift-clicked), so order numbers show | several nodes, the connecting lines, one aimed/queued path | cursor on the aimed node | full screen, ≈16:9 |
| `statecraft.png` | the Statecraft screen | after the first draft; one card placed, one slot empty | the slot row and a card face | cursor dragging-gesture from the card toward the empty slot (cursor on card, ring on slot) | full screen, ≈16:9 |
| `worker-improve.png` | the board + unit panel | worker selected on an owned grassland/hill hex | the worker's improvement buttons (farm/mine) and its charges | cursor on the farm/mine button; ring around the charges figure | right half, ≈3:2 |
| `fog-camp.png` | the board | map edge mid-exploration; a seen barbarian camp | lit ground, remembered (dimmed) ground, unexplored dark, the camp | ring around the camp | wide board crop, ≈3:2 |
| `end-turn.png` | the End Turn button | leave research unchosen (or a city queue empty), hover/press once | the button in its blocked state with the blocker's own wording | cursor on the button | bottom-right corner, ≈3:1 |
| `meters.png` | the top bar | any game a few cities in | the happiness and authority chips beside the six yield figures | ring around the two meter chips (exactly the pair, not the yields) | top bar right end, ≈6:1 |
| `diplomacy.png` | the Diplomacy screen | a game with a met rival | the rival's row and the war/peace/deal controls | cursor on the flag button if in frame, else ring around the war/peace controls | full screen, ≈16:9 |
| `abacus.png` | the Abacus screen | mid-game with a few beads claimed | at least two players' rods with beads strung | ring around one claimed bead | full screen or the rods, ≈16:9 |
