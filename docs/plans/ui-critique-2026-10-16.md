# Interface critique, 2026-10-16 (Impeccable method, Assessment A)

**Status:** the user asked for an audit with the Impeccable plugin (*"i want it to feel 'not ai vibecoded' and keep with our semi-occult, playful, historical theme"*). The plugin's `critique` method was followed from its files on disk (the plugin is not installed). Assessment A, the design review, ran as an isolated agent, read-only and from source; no browser was used. Assessment B, the plugin's detector and browser overlay, has not run: it needs the plugin's own binary and the browser, which wait on the user's permission. Nothing here has been changed in the game.

---


## Run notes

- Assessment A only, read-only. No repo file was edited.
- Impeccable's launcher was not run, because the brief forbids running plugin scripts. Its context loading therefore did not run, and I read the project's own design truth directly: `CLAUDE.md`, `docs/design-specimen.html`, `docs/README.md` ("The surfaces"), `docs/plans/hud-ux-decisions.md` and the other `hud-*.md` files, `docs/art-pass.md`, `docs/splash-art.md`, and the card-face rulings in `docs/plans/doctrines-governments-chairs.md`.
- No browser. Every judgment comes from source. Things that need the rendered screen to confirm are listed at the end.
- Mode: Operate for the HUD, the city screen and the sheets. Experience for the card faces, the board and the ceremonies.
- I did not look for or use any detector output.

---

## 1. Design-specificity verdict

**The interface has two layers, and they get two different answers.**

- **The authored layer could only belong to this game.**
  - The tarot card face (`src/ui/suitFace.ts`): six suits for the six decks, ink for the chair type, and rarity drawn as pip, court and trump frames with a ribbon or a black cartouche.
  - The Abacus, and a bead that slides down its wire and clacks into its slot (`src/ui/beadModal.ts`).
  - Wax-seal stamps that land when Confirm commits the Orders; the pantheon wheel.
  - The chart-table fog and the sea serpents on uncharted water.
  - The user's gouache frontispiece.
  - About eighty period objects drawn as path data: a ploughshare, dividers, an obelisk, a snapped column, a long barrow, an anchor, a bell, a crescent under an arch (`src/art/lineMarks.ts`, `src/art/siteMarks.ts`).
  - The accountant's double rule under every total, and Roman-numeral ages with a 210px gilt numeral behind each age of the star chart.
  - An unrelated product could not reuse any of this.
- **The chrome layer could be moved to another product unchanged.** The type, the label system, the panel recipe, the motion and the icons for the six yields would fit a 2025 indie SaaS landing page as they stand. Impeccable's calibration (`reference/new-work.md` §4) lists four looks that AI-generated interfaces fall into. The house specimen is in three of them at once:
  1. a warm cream ground, a high-contrast serif display and a red accent (`--table #e9e2cf`, `--parchment #f7f2e1`, Instrument Serif, `--vermilion #d4502e`);
  2. an editorial italic display serif with small tracked mono labels (the italic vermilion second word; 9px uppercase IBM Plex Mono eyebrows);
  3. black boxes with hard offset shadows (`--shadow: 5px 5px 0 var(--ink)` on 79 rules; the specimen says it chose the "sticker on cardboard" look).
- **The net effect.** The game reads as authored when you look at a card, a bead or the board. It reads as generated when you look at the frame around them, and the frame is most of the screen most of the time.

**What the brief allows.** The user settled the art direction ("toon diorama + specimen language"), and `CLAUDE.md` also says "everything visual is placeholder to be dialed later". Impeccable's rule is that a pinned world pins the world, not its softest rendition. So the fix is not a new world. Keep the pinned parts: ink, parchment, gilt, the light theme, the three voices and tabular figures. Rebuild them from the game's own materials (rubrication, gold leaf, lapis, iron-gall ink, wax, vellum, engraved instruments, tarot woodcuts, glass beads) instead of from the web's defaults. The refused list still stands: no blackletter, no dark theme, no board textures or hatching, no candle flicker or vignette (`docs/art-pass.md:204-207`). So does the user's removal of the Latin epigraph and the astrolabe from the title page.

### Every "AI vibecoded" tell I found

| # | Tell | Where |
|---|---|---|
| 1 | **All four faces are on Impeccable's list of training-data defaults.** Fraunces, Instrument Sans and IBM Plex are named on it. Instrument Serif is Instrument Sans's sibling and the face behind the italic-serif-accent trend. | `index.html:26`; `src/style.css:207-210`; `docs/design-specimen.html:2` |
| 2 | **An eyebrow over the heading.** This is Impeccable's one absolute ban. There are about 21 in `index.html` and about 50 more built in `src/ui/`. They appear on the title poster ("a game of the ages", `index.html:129`), on both landing cards ("the table", "recent worlds", `:150`, `:203`) and over every full-screen sheet ("the magister's star chart", "the clerks have counted", "they served you; their legacy remains", `:1086`, `:1353`, `:1465`). | `.eyebrow`, `style.css:283` |
| 3 | **One title template on fifteen sheets:** an eyebrow, then a display serif with its last word in italic. The italic decorates rather than stresses: "Loading the *world*", "Would not *open*", "What becomes of *it*?". Instrument Serif ships in one weight, so every display heading is the same weight too. | `index.html:1140-1692`; `.statecraft-title`, `style.css:10997` |
| 4 | **Popover titles are 9px uppercase vermilion mono**, so the most saturated thing on each card is its label. | `.popover-title`, `style.css:2297` |
| 5 | **Mono used as a costume.** `--face-num` is the most-used face (233 rules, against 130 for the UI sans), and much of it sets words rather than numbers. | `.eyebrow` `:283`, `.landing-menu-sub` `:796`, `.landing-mode` `:920` |
| 6 | **Emoji used as icons.** 48 of the 50 tech glyphs are printed raw on the star chart, on the tech hover card and on the drawer's research line. Only 🌾 and 💰 get swapped for drawings. About 34 of the 48 are colour emoji by default. `color: var(--gilt)` cannot tint them, and nothing sets `font-variant-emoji`. Examples: The Astrolabe 🌐, Scholarship 🎓, Daughter Cities 📋, Paper Money 🧾, Movable Type 🔠, Machinery 🔧, Engineering 🔩, The Counting Houses 🏦, The High Temple 🕌, Theology ⛪. | `data/techs.json` `"glyph"`; `src/ui/techTree.ts:1014, 1318, 2154`; `.tech-node-glyph`, `style.css:8211` |
| 7 | **A raw 🎵 in two culture toasts.** It is not in the glyph map, so the yield printer does not swap it. | `src/ui/controls.ts:7441, 7443` |
| 8 | **Unicode characters used as an icon set.** The bead, the game's namesake, is `◉` on the top bar and in toasts. The four bead families are `⚔ ❧ ✦ ⇄`, and ⇄ is a generic swap arrow. `✦` stands for renown, science beads, finished research, a Triumph, a great person, a legacy, the tech shelf and the Doctrine shelf. Reroll and pass are `⟳` and `⊘`, and the game menu is `☰`. | `topBar.ts:286, 804`; `beadsScreen.ts:101-106`; `offerCard.ts:118-119`; `controls.ts:3544-3675` |
| 9 | **Toolbar icons for the most-read marks.** Production is Lucide `settings`, the gear every web app uses for its Settings page. Culture is Lucide `music` and food is a carrot. Science is `flask-conical`, an Erlenmeyer flask (1860s laboratory glass) in a game whose endgame is alchemy. Gold is Tabler's `moneybag`. The resource set moved to Tabler's grid on the user's 2026-08-27 request ("consistent with the lucide icons"). | `src/art/yieldMarks.ts:143-200`; `src/art/resourceMarks.ts:33-52` |
| 10 | **Identical rounded cards with hard drop shadows.** Every panel has a parchment ground, a 3px ink border, a 10px radius and a 5px solid shadow. There are 34 pill radii, including the landing menu rows. | `.hud-card`, `style.css:1324`; `--shadow`, `:217` |
| 11 | **Thick coloured left stripes** on 14 rules. They include the commission chip, which also has a see-through ground, a backdrop blur and a progress ring, all as the user ruled. | `style.css:2380, 3433, 3564, 3783, 6945, 12553, 15329, 16165, 16824, 18889, 18968` |
| 12 | **Springs on entrances.** Every sheet rises with an overshoot curve, `cubic-bezier(0.2, 1.2, 0.4, 1)`, though on a 10px rise the overshoot is small. The turn splash pops (`1.5`). The great-person card bounces (`1.6`, from 80px below and 0.8 scale). | `style.css:10982`, `:4636`, `:18379` |
| 13 | **Ornament on everything, so it means nothing.** Every `.hud-card` has a corner star at 32% opacity, and the splash is tilted 1.2°. | `style.css:13898`, `:4635` |
| 14 | **Dashboard patterns in a game.** The Ledger is six stacked bars and six sparklines. The game ends on a standings table. There are progress bars, progress rings and count badges. | `src/ui/ledgerScreen.ts:12-25`; `src/ui/victoryScreen.ts:276` |
| 15 | **Generic metaphors.** Happiness is a smiley face. | `src/art/meterMarks.ts:81` |
| 16 | **The design truth still teaches the tells.** The specimen's yield bar, card and tooltip use emoji, and its first line is an eyebrow. Agents copy this file. | `docs/design-specimen.html:183, 225, 235, 239` |

### Where the theme is strong, weak or missing

- **Historical: strong.** The period marks, Roman-numeral ages, the frontispiece plate, the heraldic charges, the ledger's double rule, the chart-table fog and the sea serpents all carry it. So do the names: Reliquary, Compendium, Abacus, Census, Natural Philosophy. The weak points are anachronisms in the most-seen glyphs (tells 6 and 9).
- **Playful: present, but half of it is borrowed.** The game's own toys are playful and specific to it: cards that are dealt and flipped, stamps that thunk, beads that clack. The rest of the playfulness is generic web design: sticker shadows, tilts, springs and pills.
- **Occult: weak.** The hermetic register ("hermetic, cabinet-of-curiosities, courtly", `docs/art-pass.md:16`) lives in names, in the tarot suits and in the star chart's dark ground.
  - Alchemy, the subject of the endgame, barely appears. Science is a lab flask, the only alembic is the Alchemy tech's ⚗, and the Magnum Opus closes on a splash card and a score table.
  - There are no alchemical or planetary sigils anywhere, though they would fit the existing mark family exactly.
- **Missing: the age plate, the wonder plate and an Opus ceremony.** All three are planned in `docs/splash-art.md` and `docs/art-pass.md` (L4). An age change today is a toast, `◈ Æra III opens` (`controls.ts:3651`).

---

## 2. Heuristic scores

All ten apply, because this is an Operate surface.

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | End Turn names the first unfinished item, counts the rest and lists them on hover. The turn line says whom the turn is waiting on, and every toast is kept in the chronicle. The gap is that the biggest changes (a new age, the Opus opening) arrive as toasts, at the same volume as a caravan coming home. |
| 2 | Match between system and the real world | 2 | The tutorial copy and the refusals are plain. The symbols do not match the world, though: a Settings gear for production, a music note for culture, a smiley for happiness, a swap arrow for Economic beads, 🌐 for The Astrolabe. 🕌 and ⛪ appear in a game whose names are "mythologised, never historically over-specific" (README). The glossary is large (Order, Doctrine, chair, Wildcard, charter, seal, commission, malice, wager, bead, renown, Triumph, legacy). Keyword hover cards soften this. |
| 3 | User control and freedom | 3 | Every sheet follows one Escape contract (`modalShell.ts`). View map puts an offer aside without spending it. Statecraft stages changes and can Revert. Every tutorial step can be skipped, and Shift+Enter ends a turn anyway. There is no undo for moves, which is normal for the genre. |
| 4 | Consistency and standards | 3 | The engineering is exceptionally consistent: one sheet frame, one button, one refusal printer, one yield printer. Visual consistency breaks at the level of glyphs. The star chart mixes 2 drawn marks, about 14 monochrome symbols and about 34 colour emoji. `✦` has eight meanings. The poster's corner stars are Unicode `✶`, while the panels use the drawn corner star. Tech cards show units as single letters, while the board uses drawn badges. |
| 5 | Error prevention | 3 | A refusal is shown before the press, greyed with its reason. End Turn stops on unfinished business. The wager sheet disables what cannot be staked. Disband and Restart ask first, and the game autosaves every turn. |
| 6 | Recognition rather than recall | 2 | There are about twenty hotkeys, documented only in a 15-bullet card inside a 236px popover. The Ledger opens only by clicking a yield figure, and the Reliquary only by clicking the renown figure. The glyphs that start each toast have no legend, and below 1200px the tabs lose their names. To confirm in the build: does the draft offer show which of your chairs a card fits? (`main.ts:3253` passes no chair context.) |
| 7 | Flexibility and efficiency of use | 3 | There are keys for every screen, shift-click to queue research, number keys for lenses, comma and period to step between towns, and Shift+Enter. There is no key rebinding, and the ceremonies cannot be shortened (the take-a-card flip runs 1450ms). |
| 8 | Aesthetic and minimalist design | 2 | The HUD at rest is lean (1.9% of the board, per the spec). The sheets and cards are noisy: about 70 eyebrows, 31 distinct pixel sizes and about 260 rules at 11px or smaller. Every panel carries ornament, and vermilion has four jobs: the primary action, refusals, shortages and labels. |
| 9 | Help users recover from errors | 3 | A refusal is the reducer's own plain sentence, said once on screen next to the thing refused (`refusalLine.ts`). The star chart has its own refusal slot, and a failed load names its reason. A few reducer sentences carry internal ids ("Unit ${id} has no movement left"); check that none can reach a player. |
| 10 | Help and documentation | 4 | The Compendium is searchable and generated from the data. Keyword hover cards nest. The tutorial advances on the player's own actions, a one-time note appears the first time each system is met, and combat odds show on hover. |
| **Total** | | **28/40** | **Good (70%).** The usability base is solid. The gaps are identity and legibility. |

---

## 3. Cognitive load

**Checklist: 3 failures confirmed and 1 to confirm, which is a moderate load.**

- **Chunking: fails.**
  - The top bar has about fifteen targets in one row: six yields, two meter halves, the turn line, three tabs (two with extra figure buttons), `?` and `☰`.
  - The `☰` menu stacks eight actions.
  - The controls card is fifteen bullets.
- **Visual hierarchy: fails on the sheets.** Every sheet head has the same eyebrow, title, hint and ×. Inside, the 9–11px text and the vermilion labels flatten what matters. The saturated colour lands on labels and badges as often as on the action.
- **Minimal choices: fails.** See the list below.
- **Working memory: probably fails.**
  - Choosing a card in the draft seems to need the player to remember their council's chair types; confirm in the build.
  - The player must remember what each Unicode glyph means at the start of a toast.
- **Passes:**
  - single focus: the HUD at rest, and the full-screen sheets;
  - grouping;
  - one thing at a time: the draft is modal, and staging defers the commit;
  - progressive disclosure: drawer depths one and two, the "Not yet · N" folds, the collapsed Faith shelf, hover cards.

**Decision points with more than four visible options:**

- the top bar: about 15 targets;
- the `☰` game menu: Statecraft, Compendium, tutorial, Save, Save As, Load, Export, Restart (8);
- the city screen's add list: six tabs (All, Units, Buildings, Wonders, Projects, Faith) over dozens of rows;
- the draft offer: 3 to 5 cards plus Pass, Reroll and View map (6 to 8);
- the Statecraft collection: about 30 cards against N chairs, which is inherent to a deckbuilder;
- the landing menu: 6 rows, 2 of them disabled;
- the drawer at depth two: Research, Culture, Faith, Leader, Age wager and the Supply rows;
- the game as a whole: 15 full-screen sheets, 5 news overlays and about 20 keys.

Much of this is the intrinsic load of a 4X and a deckbuilder. The extraneous part is the glyph channel and the doors hidden inside numbers.

---

## 4. Emotional journey

- **The opening is strong.** The gouache plate (cobalt sky, sunlit ochre stone, black cypresses) is the most distinctive image in the product. The menu and the shelf of recent worlds beside it are well made.
- **Setup is a valley.** "Draw a world" is a good verb, but it sits on a plain form: Seed, Size, Seats, Opponent and a mono summary line. Nothing gets drawn.
- **The first turn is good.** The coach card advances when the player acts, uses plain words and can be skipped. The vermilion "Your *turn*" card is loud on purpose.
- **Routine turns are steady.** End Turn's sequence (marches, then the turn card, then the camera) and its list of waiting items make the loop feel looked after.
- **The peaks are strong, and they are the team's best work.** The draft is dealt, flipped and stamped. Confirm counts up while the wax seals land. A bead slides down its wire and clacks. A great person's card rises, counts its legacy and drops into the renown figure.
- **The big moments are valleys.** A new age is a toast. The Magnum Opus opening is a toast. A finished wonder appears to get only the general completion toast (confirm in the build).
- **The end is the weakest point, and players remember endings most.** The Opus closes, a splash says "*X* is *victorious*", and a standings table opens: "What is counted · each · count · value". A loss reads "The reckoning has gone elsewhere." The game is named after the Glass Bead Game and finishes with the alchemical Great Work, yet the last thing the player sees is a spreadsheet.
- **High-stakes reassurance is good.** Adopting a government, which the code calls "the one irreversible pick in the game", states its three consequences before the choice and wears the heavier frame. Disband asks first. The wager sheet says what has already been staked.

---

## 5. Strengths

1. **The card system carries real data in tarot form.**
   - The suit shows the deck, the ink shows the chair type, and the rank shows rarity: pip, court and trump frames, with a ribbon, a black cartouche or corner stars (`suitFace.ts`).
   - The ceremony is spent where a card is dealt. The hand, where a player compares thirty cards, uses a compact row.
   - This is ornament that means something, which is exactly what the rest of the chrome lacks.
2. **There is a real mark library, with a gallery.**
   - About eighty period objects exist as path data, printed in `currentColor` through one emitter, and each one is on `flair.html` with sliders.
   - The drawings needed to replace every emoji and Unicode glyph mostly exist already. There is even a drawn astrolabe (`PRINTER_DEVICE`, `src/ui/deviceMarks.ts`).
3. **The operating discipline is strong.**
   - End Turn says what it is waiting on and lists it.
   - A refusal is the reducer's own sentence, said once on screen.
   - Fifteen sheets share one modal contract.
   - Keyword cards and a generated Compendium.
   - Every animation has a reduced-motion path that keeps the message and its timing (`toasts.ts`; 28 reduced-motion blocks for 24 keyframes).

---

## 6. Priority issues

### [P1] The type and label system is the AI default, and it dresses every screen

- **What.**
  - The four faces (Instrument Serif, Fraunces, Instrument Sans, IBM Plex Mono) are all on Impeccable's default list.
  - A tracked mono eyebrow sits over most headings, and fifteen sheet titles put their last word in italic out of habit.
  - Mono is the most-used face, and it sets words as well as numbers.
- **Why it matters.** This is the "vibecoded" look the user wants to lose. It also makes the authored layer look pasted onto a template: a tarot card sitting inside a 2025 editorial landing page.
- **Fix.** Keep the three voices and the "every number tabular" rule. Change the faces and stop the label habit.
  - **Display** (turn card, sheet titles, victory): a period face with character, used only at large sizes. IM Fell (Great Primer or French Canon, on Google Fonts) is a digitisation of 17th-century Oxford types used for scholarly and natural-philosophy books. It is slightly irregular, which gives "playful" and "historical" at once.
  - **Names and inscriptions:** a book face with true small caps and old-style figures, such as EB Garamond, or Alegreya with Alegreya SC. This would replace Fraunces and the synthesised small caps on `.inscription` (`style.css:13851`).
  - **Dense UI:** Alegreya Sans, so the interface stays in one family, or keep a workhorse sans. Operate surfaces may use one.
  - **Numbers:** test the UI face's tabular lining figures (`font-variant-numeric: tabular-nums lining-nums`) against Plex Mono. Keep a mono only where columns must line up across rows.
  - **Eyebrows:** delete each one that restates its title ("the magister's compendium" over "Every Table"). Keep a small-caps line only where it carries a fact ("tier 4").
  - **Italics:** drop the italic last word. Use vermilion the way scribes used red ink, on an initial or on the one word that is news.
  - **Order of work:** update `docs/design-specimen.html` first, because agents copy it.
- **Suggested command:** `/impeccable typeset`

### [P1] The game's icons are borrowed: raw emoji, Unicode characters and toolbar icons

- **What.**
  - 48 tech glyphs print raw on the star chart and the research line, most of them colour emoji (tell 6).
  - A raw 🎵 appears in two toasts (tell 7).
  - Unicode stands in for the bead, its four families and eight different meanings of `✦` (tell 8).
  - Two of the six yields are Lucide's Settings gear and its music note (tell 9).
- **Why it matters.**
  - Emoji take the platform's colours and weights, and they change between a Mac and a PC. They are the clearest sign that a screen was assembled rather than designed, and they sit on the screen the game calls Natural Philosophy.
  - A glyph with eight meanings tells the player nothing (heuristics 2, 4 and 6).
  - 🕌 and ⛪ contradict the README's "mythologised, never historically over-specific".
- **Fix.**
  - **Tech marks.** Draw all 50 in the house mark family and print them through the existing mask printer. Many already exist as drawings: The Astrolabe can take the printer's-device astrolabe, Writing the scroll, Sailing the anchor, Bronzeworking the anvil, the measuring techs the dividers, and Alchemy an alembic.
    - Until a tech is drawn, show its age numeral in a seal, never the emoji.
    - Add a source test that no `glyph` string from `data/*.json` reaches `textContent` except through the printer.
    - Set `font-variant-emoji: text` as a guard.
  - **The bead.** Draw a pierced glass bead on its wire, with one cut per family (faceted, striped, eyed, gilt). Use it on the top bar, the bead ledger, the toasts and the Compendium.
  - **Reroll and pass.** Draw "cut the deck" and "turn the hand face down".
  - **Toasts.** Give each kind of toast its own drawn mark, or no mark.
  - **The yields.** The 2026-08-27 ruling asked for one family, and Tabler's geometry (24-unit grid, 2.75 round stroke) is right at 12px. Keep the geometry and change the subjects: a wheat sheaf, a hammer on an anvil, a struck coin (the Coins suit already exists), an alembic, a lyre and a candle. The theme then comes from what is drawn, not from how the stroke is drawn.
- **Suggested command:** `/impeccable polish`

### [P1] Small text and the main button fail contrast

- **What.**
  - `--ink-faint` (ink at 42%) on parchment is 2.59:1. It colours text in 105 rules: hints, turn numbers, key labels and captions, at 9.5 to 11px.
  - Parchment on vermilion is 3.76:1. That pair is End Turn, every primary button and the turn card.
  - Gilt on parchment is 2.51:1, and the food and production inks are 3.33:1 and 3.49:1.
  - About 260 rules set text at 11px or smaller, and 77 at 9.5px or smaller.
- **Why it matters.** The most-read secondary text is the faintest, and the most-pressed control fails WCAG AA. This runs across the whole interface; it is not a corner case.
- **Fix.**
  - Ink at 63% (about `#6e6a67`) reaches 4.79:1 on parchment and 4.5:1 on the table colour.
  - A cinnabar of `#bd4729` for button grounds gives parchment text 4.58:1, and it is closer to the pigment of rubrication.
  - Add text-only "deep" versions of the yield inks: gilt `#906816`, food `#347c2d`, production `#a75b19`, teal `#1c7b76`. All reach 4.5:1 or better.
  - Set a floor of 11px for any text and 12px for sentences.
  - Put type sizes on tokens; today there are 31 distinct values.
- **Suggested command:** `/impeccable colorize` for the palette roles and contrast, then `/impeccable typeset` for the size floor.

### [P2] The biggest moments have no designed treatment, and the game ends on a spreadsheet

- **What.**
  - A new age is a toast, and so is the Magnum Opus opening. A finished wonder appears to be one too (confirm).
  - The Opus closing is a splash card followed by a standings table.
- **Why it matters.**
  - Players remember the high points and the ending.
  - The deal, the stamp, the bead and the great-person ceremony show that the team builds these moments well. The three biggest beats of a game got none.
- **Fix.**
  - **The Opus close.** The house palette already holds the four colours of the alchemical Great Work, in order: black ink (nigredo), white parchment (albedo), gilt (citrinitas) and vermilion (rubedo). Stage the close as those four beats across a full-screen plate in the gilt double frame. End on the winner's bead dropping into the golden slot of the Abacus, and show the standings as the last page.
  - **The age plate.** Build it as planned in `docs/art-pass.md` (L4) and `docs/splash-art.md` (row 4): the age's numeral, its deeds drawn with the existing mark families, and one plain line.
  - Neither needs a new painting to look finished.
- **Suggested command:** `/impeccable delight`

### [P2] Ornament and generic web devices are applied to everything, so they stop meaning anything

- **What.**
  - Fifteen sheets share one header.
  - Every panel has a corner star, a hard 5px shadow and a 10px radius.
  - Fourteen elements use a thick coloured left stripe.
  - Every sheet rises on a spring.
- **Why it matters.**
  - The stylesheet's own comment on the gilt frame states the problem: "a game where everything is framed in gold has framed nothing" (`style.css:13919-13924`).
  - Uniform ornament flattens hierarchy (heuristic 8).
  - The "sticker" look is generic web playfulness, not this game's own.
- **Fix.**
  - **Sheets.** Keep `modalShell` and change each instrument's look, as the star chart already does with ink and gilt. Statecraft becomes a charter on vellum with its seals. The Ledger becomes an account book with ruled columns instead of sparklines. The Census becomes a roll, and the Reliquary a cabinet of labelled niches.
  - **Stripes.** Replace them with a wax seal or a thumb-index tab in the same ink.
  - **Shadows.** Keep the hard shadow for things that are physically played: End Turn, cards on the table, the turn card. Routine panels get the paper's own edge instead.
  - **Motion.** Let sheets settle with a deceleration curve (`cubic-bezier(0.16, 1, 0.3, 1)`). Keep the overshoot only for the stamp, a physical event the user asked to feel snappy.
- **Suggested command:** `/impeccable quieter`

---

## 7. Persona red flags

### Alex, the impatient power user (a 4X veteran)

- **Good:**
  - keys for every screen, and Shift+Enter;
  - shift-click to queue research, and number keys for lenses;
  - comma and period to step between towns;
  - Escape backs out one layer at a time.
- **Red flags:**
  - About twenty keys with no rebinding, and the only reference is a 15-bullet card in a 236px popover.
  - The Ledger and the Reliquary can be reached only by clicking a number.
  - The take-a-card flip runs 1450ms per pick, and the Confirm count-up about a second. Neither appears to have a skip (confirm in the build).
  - The turn card shows every turn; any input dismisses it, which helps.

### Jordan, the first-timer

- **Good:** the tutorial advances on the player's own actions, speaks plainly, and every step can be skipped.
- **Red flags:**
  - The draft sheet alone uses tier, culture meter, Order, collection, slotting, sealed, Pass and a faith reroll.
  - A toast that opens with `◈`, `◉` or `✦` gives no clue which kind of news it is.
  - Eyebrows like "the clerks have counted" and "the figure at your table" sit where a label would be but are flavour. Hard rule 7 wants flavour labelled as flavour.
  - The Settings gear on every build cost looks like a settings control.

### Sam, who depends on accessibility

- **Good:**
  - a global focus ring (`style.css:276`);
  - live regions on the toasts and the turn card;
  - modals return focus to where it came from;
  - reduced-motion paths keep the message.
- **Red flags:**
  - 105 rules of text at 2.59:1, and End Turn and the primary buttons at 3.76:1.
  - 9px vermilion popover titles, and 77 rules at 9.5px or smaller.
  - The toasts are live regions, so a screen reader will read the glyphs aloud, along the lines of "black four pointed star Triumph", "fisheye A bead" and "musical note The meter is full".
  - The chair type is carried by ink colour, though the suit and the hidden caption soften this.

### Project persona: "the Cartographer", a strategy player who loves Civilization and old maps

- **Profile:**
  - judges a 4X by its map and its tech web;
  - has played Civ IV's parchment interface, Civ VI's watercolour map and Old World;
  - owns an atlas, and reads the map before the HUD.
- **Will love:** the chart-table fog drawing itself in, the sea serpents on uncharted water, the heraldic charges, the Roman-numeral ages and the gouache plate (the board needs a rendered check).
- **Red flags:**
  - The star chart is a dark grid of rounded cards with emoji, progress pills and dashed connectors. Drawing it as a real celestial chart (stars by brightness, constellation lines, the ages as bands of the ecliptic) is the obvious old-map move, and it is unused.
  - The sticker style (tilted cards, hard black shadows, pills) reads as recent indie web design, not as an atlas.
  - 🌐 for The Astrolabe, 🏦 for The Counting Houses, and a Settings gear for production.
  - The chronicle is a list of toasts in a popover; the art pass's "Annals" is unbuilt.
  - The game ends on a score table rather than on a final map or a chronicle of the run.

---

## 8. Minor observations

- **Small caps.** `.inscription` small caps are synthesised, because Instrument Serif has none (`style.css:13851`). Synthesised caps are thinner than true ones and can show at 30px; needs a rendered check.
- **Two corner stars.** The poster's corner stars are Unicode `✶` (`index.html:124-127`, `style.css:19873`), while the panels use the drawn `CORNER_STAR`. They are two different drawings of one idea.
- **Unit marks.** Tech cards show unit unlocks as a single letter in a 15px box (`.tech-mark.is-unit`, `style.css:8301`; `data/units.json` "glyph": "W", "S" and so on). The board and the unit panel use drawn badges.
- **Emoji in text.** `figures.ts:75-85` keeps 🌾 💰 🔬 🎭 🕯 as the text form of the yields. Check the `title` attributes and accessible names built from these strings.
- **Hard-coded values.**
  - There are 119 hex literals outside the tokens, for example the star chart's `#1e1b22`, `#262129`, `#221d1a` and the poster's `#1a3f96`, `#f3e6c8`, `#ffd166`.
  - Font sizes have no tokens at all.
- **Vermilion's jobs.** Vermilion does four jobs: the primary action, the refusal voice, a shortage and labels. The separate `--war-red` shows the team already knows how to split these.
- **Palette.** The UI palette is thinner than the board's. `data/view3d.json` names vellum, oxblood, brass, raven, lichen and chartWash; the interface could borrow those names and values.
- **The loss line.** "The reckoning has gone elsewhere" is vague at the moment a player most wants to know what happened. Name the winner and the work.
- **The manicule.** The `☞` that leads refusals (`controls.guide`) is the one Unicode glyph that fits the theme. Draw it with the rest.
- **Top-right tools.** `☰` and `?` are the only tools at the top right. A drawn book and a drawn seal would fit the idea of the interface as the magister's instruments.
- **Glass.** It appears only on the commission chips (as ruled) and on the dimmed ground behind a ceremony. Both are minor.
- **Old voice.** The eyebrows are the most visible place where the old game-voice survives (`index.html:1317, 1353, 1465`). The rewrite pass the Writing ruling schedules will reach them.

---

## 9. Questions to consider

- The house palette already follows the colour order of the alchemical Great Work: black ink, white parchment, gold, then vermilion. What if the four ages and the Opus were staged in that order, so the game's colour arc is the Great Work?
- The bead is the game's namesake. Why is it the one object without a drawing?
- Why are the six most-read marks the most generic ones? What would a wheat sheaf, a hammer, a struck coin, an alembic, a lyre and a candle do to every screen at once?
- Does every number need a programmer's monospace, or only the columns that must line up?
- The frontispiece's cobalt, ochre and black cypress make the most distinctive palette in the product, and it appears once. What if it dressed the announcement surfaces (the turn card, the age plate, the victory)?
- Is "playful" the tilt and the hard shadow, or is it the beads, cards, stamps and dice? The second kind already belongs to the game.
- What would the star chart look like if it were drawn as a star chart?
- Which of the fifteen sheets would a player miss if it wore its sibling's design?

---

## Needs the rendered screen to confirm

- How many of the 48 tech glyphs draw in colour on macOS and on Windows.
- Whether the synthesised small caps on the sheet titles look thin at 30px.
- Whether the sheets' 10px rise visibly overshoots. The turn card's and the great-person card's bounces will.
- The board itself: the toon diorama, the chart-table fog and the sea serpents. Not judged here.
- The top bar at 1024px, which `hud-ux-decisions.md` lists as unchecked.
- Whether the draft offer shows the council's chairs.
- Whether a finished wonder gets more than the general completion toast.
- Whether the take-a-card flip and the Confirm count-up can be skipped.

---

## Assessment B (detector), and where it meets Assessment A

**Method:** the plugin's detector (Impeccable 0.1.15) ran as a separate agent, isolated from A, on the eight root pages, on `src/ui`, and on all of `src` (409 files), since `src/style.css` reaches the page only through a TypeScript import. It reads `.ts` and `.css` by pattern only. It cannot see the DOM the TypeScript builds, so it does not check contrast, tiny text or type hierarchy there; "an undercount, not a clean bill of health". **The browser half did not run:** the Claude in Chrome extension was not connected, and the permission system refused a headless Chrome fallback. So there were no screenshots and no in-page overlay, and the rendered checks below are worked out from the CSS and data, not seen.

**What it found:**
- **Bounce easing, 9:** all real overshoot curves. Worked out from each curve:
  - only **the great-person card** visibly bounces (about 9px and 2% in scale over 500ms);
  - **the turn card** pops to 1.011×;
  - **the sheets** overshoot by 0.12px, which no one will see;
  - **the stamp's** overshoot is intended.
- **Side stripes, 18:**
  - **ten are decorative stripes shown at rest:** `.stale-notice`, the lens rows, `.commission-chip`, `.city-buildable`, `.city-not-yet-row`, `.faith-rite-chip`, `.diplo-seat.is-war`, `.bead-card`, `.wager-card` and `.abacus-wager`;
  - four mark a state (hover, focus, selected);
  - four are not the pattern (an underline, a block-quote rule, two status bands inside a card).
- **Em-dashes:** about 19 real prose em-dashes in `index.html` (the controls, setup and chronicle text). The other 21 are placeholders for figures. On `mapgen.html` it is a false positive.
- **Flat type hierarchy** on four pages: a false positive, because the scan read the pages without their imported CSS.
- **A real accessibility bug:** `.statecraft-sheet` and `.pamphlet-sheet` are in none of the 28 `prefers-reduced-motion` blocks, so they still rise for a player who asked for reduced motion.
- **Emoji:** 36 of the 50 tech glyphs default to emoji presentation, with no variation selector and no `font-variant-emoji`, so they draw in full colour on macOS. The other 14 depend on font fallback.

**Where A and B agree:**
- A's springs are B's bounce easing, and B measures them: only the great-person card bounces visibly.
- A's fourteen left stripes are B's ten decorative stripes plus four state markers.
- A's colour emoji are confirmed by the glyphs' default presentation.

**Where B adds to A:** the reduced-motion gap on two sheets, and the prose em-dashes, which the house Writing rules also discourage.

**Still unconfirmed by a rendered look:** emoji colour on Windows, the top bar at 1024px, the small caps, and whether the draft offer shows chair fit. C2b has since added the chair fit to the hand line.
