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

---

## The user's review of the Scholar's Study, iteration 1 (2026-10-16)

The user left 42 comments on the canvas (https://claude.ai/artifact/48NaMcoLoubABSoqcVPkgw). These are the decisions, board by board. Iteration 2 applies them.

**The direction (Main):**
- Approved: the top bar and its colours; the news toasts; flat panels, with the hard shadow only on played things.
- Approved: the new layout of the corner panel (the leader, the research and the next draft). Change: on hover, show all the menus (faith, leader, supply) at once. Do not require a click for each one.
- Change: the seal under a seated card shows only the turn number. Remove the words "sealed to turn".
- Approved: no eyebrow. Not decided: the fonts (see Type).

**Icons and glyphs (Marks):**
- Keep the old yield icons, with two exceptions. The new colours are approved.
  - Gold: use a coin, not the bag. Make the coin simpler.
  - Faith: use a candle, but make it simpler and give it a different flame.
- The bead (plain glass, on its wire) is approved. It replaces `◉`.
- The four cuts for the bead families are cancelled. Keep the current family marks.
- Keep the old icons for the two meters, for the draft's two answers (ask again and pass), and for the manicule.
- The news toast marks are approved.
- The tech marks are deferred. The emoji stay for now. A later pass will use real art, not icons.

**Type and labels (Type):**
- Approved: no eyebrows; the board's structure.
- The fonts are not approved. The user prefers the playful italic of the current display face (Instrument Serif). Make five font treatments to choose from, in a range from occult and serious to playful and silly.

**Contrast and colour roles (Ink):**
- Approved: the palette, the yield inks, the contrast values and the faint hint text.
- End Turn: keep the old, wider button shape, with the new cinnabar colour.

**The big moments (Moments):**
- Approved: the age plate.
- The Magnum Opus close:
  - Approved: beat 1 (black ink, the city) and beat 2 (parchment, the builder).
  - Remove beat 3 (gilt).
  - Replace beat 4 with a full-screen page that animates the existing 3D Abacus.
- Approved: the standings page.

**Fewer ornaments (Ornament):**
- Approved: the board as a whole, the commission chip's tab, and the war seal on a seat.
- Keep the current look of Statecraft and of the Census.
- The Ledger as an account book is approved. Make a full-page render, so the user can comment on details.
- The Reliquary must change. It must feel like a deck of cards that you flip through.
- The bead card: keep the change, but use the star mark for now.

---

## The user's review of the Scholar's Study, iteration 2 (2026-11-16)

Given in the session, not as canvas comments. The user's words:

> "unfortunately, i still like the current set of fonts. Could we find a playful, modern font that's not instrument serif? I really like it but its a bit too recognizable, we could have it lean a bit more historic but i want a font that feels playful and polished. I think the ledger looks good, but I like the graphs as a visual, could you incorporate the current set of graphs into the design? The reliquary is great, lets have that be its own screen instead of a small popover (a full modal instead of the current small floating element that exists). What i don't like about the corner panel is that it opens to the side, could we try a version where clicking it expands the view in place? i'd also like the unexpanded view to show the technology name and a little bit more detail than what we have now. I also want to experiment with some quicker ways to get to the religious screen, clicking the corner panel and then clicking the religious screen feels a bit too difficult at the moment. Right now, i'd say diplomacy, trade routes, and religion are probably the buttons i click the most, with the standings as runner up."

The decisions, board by board. Iteration 3 applies them.

**Fonts:**
- None of the five treatments is chosen. The current set of fonts stays, except the display face.
- Find a new display face in place of Instrument Serif, which is "a bit too recognizable": playful, modern and polished. It may lean a little more historic.

**The Ledger:**
- The account book is approved.
- Add the Ledger's current graphs to the design. The user likes them as a visual.

**The Reliquary:**
- The deck of cards is approved ("great").
- It becomes its own full screen (a full modal), not the small floating panel of today.

**The corner panel:**
- It must not open to the side. Try a version that expands in place on a click.
- The collapsed view shows the technology's name, and a little more detail than today.
- Try quicker ways to reach the faith screen. Two clicks through the panel is too slow.
- The user's most-used buttons: diplomacy, trade routes and religion, then the standings.

---

## Queued for the redesign: diplomacy and the deal notice (the user, 2026-11-16)

> "to queue with the UI redesign. We should make the diplomacy screen and deal notifier fit in with the design of the rest of the game (same UX elements and styling, it's a bit different currently). We should also grey out luxury resources for trade that the other person already has access to, and not show luxury resources that both players have access to altogether. I want to consider more diplomatic options in the future, so make sure that the UX is easily extendable."

- **The diplomacy screen and the deal notice** take the same elements and styling as the rest of the game. Today they differ.
- **Luxuries in a deal:**
  - a luxury that the other player already has access to is shown greyed out;
  - a luxury that both players have access to is not shown at all.
- **Room to grow:** more diplomatic options will come, so the layout must take new kinds of deal item and new actions without a redesign.
- A board for it joins the Scholar's Study canvas (`Diplomacy.dc.html`).

---

## The user's review of the Scholar's Study, iteration 3 (2026-11-16)

Given in the session. The orchestrator recommended display face C (Bona Nova) with E (Newsreader) as the safe choice, corner panel A with C's live figures, and luxury rule 1. The user:

> "I think B/E are my favorites, let's go with E for now. Reliquary looks great. Let's do A with C's live figures, i agree. your recommendation for the luxury rule makes sense, option #1."

- **Display face: E, Newsreader,** "for now". B (Ibarra Real Nova) is the user's other favourite and stays on the board as the alternative. Newsreader replaces Instrument Serif wherever it is the display face. Fraunces, Instrument Sans and IBM Plex Mono stay.
- **The Reliquary: approved** as a full sheet (`Reliquary.dc.html`, iteration 3).
- **The corner panel: variant A** (`Corner.dc.html`): four buttons in the panel for diplomacy, routes, faith and standings, and the panel grows down in place on a click. The Faith and Routes buttons carry variant C's live figures. The collapsed panel shows the technology's name and more detail, as drawn.
- **The luxury rule: option 1.** In a deal, a luxury is not shown when both sides have their own copy. It is shown greyed when the other side has it only on loan from a deal that will end, with the source and the turns left.
- **Not yet reviewed:** the Ledger with its graphs, and the rest of the Diplomacy board.

### Build order

The boards in `docs/plans/mockups/scholars-study/` are the spec of record, with the review sections above saying what is approved. Batches, one at a time in the main tree:

| Batch | What | Boards |
|---|---|---|
| **SS1** | The foundation: Newsreader as the display face; no small label over a heading; the palette, the yield inks and the contrast fixes; flat panels, with the hard shadow only on played things; End Turn's cinnabar colour in its wide shape; the coin, the candle and the glass bead; the news toasts; the two sheets that ignore reduced motion; the ten decorative side stripes | Display, Type, Ink, Marks, Main, Ornament |
| **SS2** | The corner panel, variant A with live figures | Corner |
| **SS3** | The Reliquary as a full sheet | Reliquary |
| **SS4** | The luxury rule in the deal table | Diplomacy (the rule only) |
| later | The big moments, the Ledger, the diplomacy screen and the deal notice, the top bar | after the user's review of each |

---

## After SS1: spacing with the new display face (the user, 2026-11-16)

> "could we go through and double check the spacing in elements with the new typeface, for example the 'your turn, pachacuti' element seems uncentered vertically now"

Newsreader has other vertical metrics than Instrument Serif, so text set in it can sit high or low in a box that was tuned for the old face. Batch **SS1b**: go through every element set in the display face, check its vertical centring and its spacing against its neighbours, and correct it. The turn card ("Your turn, Pachacuti") is the first case.

**The news toasts' size (the user, 2026-11-16):** *"the new toast banners are slightly too large, lets shrink them a bit"*. Part of SS1b: the toasts become a little smaller (padding, type and mark together, about a seventh), and stay readable.

---

## The rest of the redesign is approved (the user, 2026-11-16)

> "the other elements of the UI overhaul are approved, make sure those get scheduled after the current pass."

So the boards that were "not yet reviewed" are approved as drawn: the Ledger with its graphs, and the whole Diplomacy board (the screen and the deal notice). With the earlier approvals, every board on the canvas is now approved except what a review cancelled or kept as it was (the four cuts for the bead families; the tech marks, deferred; Statecraft's and the Census's present look; beat 3 of the Opus close).

### Build order after SS4

One batch at a time in the main tree, after SS1b and SS2 to SS4:

| Batch | What | Boards |
|---|---|---|
| **SS5** | The Ledger as an account book, with the sparklines and the stacked plate | Ledger |
| **SS6** | The diplomacy screen as a full sheet with the deal table, and the deal notice as a card with Accept, Refuse and "Change it at the table". It needs three small interface changes the board assumes: the notice sends the answer itself; the sheet opens with a rival's offer loaded; a real reading of what a luxury gives | Diplomacy |
| **SS7** | The big moments: the age plate; the Opus close, beats 1 and 2; the full-screen page that animates the existing 3D Abacus in place of beat 4; the standings page | Moments |
| **SS8** | What SS1 left: the type-size tokens and the 11 px floor, the top bar's tab labels and the other mono capitals, the sheet motion, the seal under a seated card showing only the turn number, and the bead card with the star mark | Type, Main, Ornament |

## The corner panel, second pass (asked 2026-11-16)

The user, after playing the SS2 build: *"could we do another pass on the corner
panel? the spacing feels awkward, i'm not sure if we should even have labels on
the bottom row at all. Could we use the skills we have at our disposal to design
something better? factor in the top bar too, we probably don't need these menu
items in multiple places. Give me 3 options"*

- Three options, drawn as boards, for the user to choose from. Nothing is built
  until the user picks one.
- Each option covers the corner panel and the top bar together, and says where
  each screen's one door is (Diplomacy, Trade routes, Faith, Standings, and the
  other tabs the top bar holds today).
- The bottom row's labels are in question: each option says whether the four
  buttons carry labels, figures, marks only, or are gone.
- What stays from SS2: the card grows in place on a click or Q, the live
  figures come from the game's own readings, and every screen is reachable by a
  key.

### The user's comments on the three options (2026-11-17)

Options page: https://claude.ai/artifact/MGrda9cDan7VtugHxkBreB. The user
prefers A, finds B *"worse than A strictly"*, and asked to see A and C again
with these comments applied.

- **A, the two top lines:** *"clicking mathematics should open the tech tree,
  clicking the 'next draft' should open the orders screen. Could we have these
  look more like clickable buttons? Clicking the banner or anywhere else in the
  panel should enlarge it."*
- **A, the faith figure:** *"What should the faith panel show when all pantheons
  have been taken? Should the second number just show the cost of a prophet? or
  maybe just the number of rites running? these both feel unintutive to the
  player even thought they're both helpful."* Open: the next drawing proposes
  the states.
- **A, the top bar:** *"i like how much real estate is left on the top bar. It
  might be better to have the renown go on the left side, move the age and turn
  counter to the right, and have nothing in the middle (left/right aligned
  scheme with no middle)."*
- **A, the row of keys and names in the open card** (W Diplomacy, E Routes,
  H Faith, S Standings): *"this row feels awkward to me"*.
- **C, the routes and faith lines:** *"what if routes/faith only showed on
  hover, and the panel expanded on hover? is that hard to implement in a way
  that it's fast/responsive"*.

### The corner panel: option A revised is approved (2026-11-17). Batch SS2b.

The user: *"ok lets go with option A, please take a look at my comments"*. The
board is the section "Option A, revised" of
https://claude.ai/artifact/MGrda9cDan7VtugHxkBreB; its source is kept in the
repo as `docs/plans/mockups/scholars-study/corner-panel-options.html`.

The user's comments on the revised board decide the open choices:

- **The two top lines:** underlined names with an arrow (*"i like this one"*),
  not the raised keys the main drawing used. The technology's name opens the
  star chart. "Next draft" opens Statecraft. The banner and every other part of
  the card that is not a button grow the card.
- **The open card:** four ordinary rows for the four screens: mark, name,
  figure, key (*"this one for sure"*). No row of names under the marks.
- **The faith dot:** *"why is this state needed when the previous one exists?
  pantheons are drafted regardless of player input, but i can see this being
  useful for a prophet. I think we should use this dot for when a prophet is
  available and no more dot after all religion beliefs have been chosen."* So:
  no dot for a god that waits for a name. The dot shows when the seat can call
  a prophet. Once every belief of the seat's religion is chosen, the dot never
  shows.
- **The top bar:** two groups with nothing in the middle. Left: yields, meters,
  renown and beads. Right: turn and age, then the ? and menu buttons. The three
  tabs leave the bar.
- **Taken as drawn (the user did not comment):** the faith number is the faith
  banked, with "banked/cost" only while the next god has a price; a free route
  slot colours the routes figure; beads sit on the left with renown; S opens
  Standings; the game menu loses its Statecraft row.
- **The faith dot, made exact (2026-11-17):** the user: *"enough faith to buy a prophet is the right interpretation"*. The dot shows when the seat has the faith to buy a prophet now, not when a prophet stands on the map.

## Requests of 2026-11-17, after the corner panel landed

The user: *"ok, lets get rid of the visual test section in the hamburger menu.
Let's also do a pass on the orders screen - right now its hard to scroll and
see all your cards, and the way they're slotted on the left gets cramped as you
get larger governments. Could we do a few options for usability/readability?
Also, the leader screen could use some work, it's too large and gets cut off
currently. Also, i dont want to confuse new players. Let's have the religion
pane stay grayed out until divination is researched, and lets have the trade
route screen be greyed out until currency is researched. The diplomacy screen
also could be more condensed, could we do a layout pass where the user doesn't
have to scroll down to see the deals, and overall make the screen a bit more
compact when there are lots of luxuries and options available."*

- **SS9a, build:** the visual test section leaves the game menu. The Faith door
  is greyed until the seat has researched Divination, and the Routes door until
  it has researched Currency. A greyed door says in plain words what opens it.
- **SS9b, build:** the leader screen fits the window and is not cut off.
- **SS6, build, with new requirements:** the diplomacy screen is more compact.
  The deals are in view with no scrolling, and the screen stays compact with
  many luxuries and options. These join the approved SS6 board and the luxury
  rule of SS4.
- **Orders screen, design first:** a few options for usability and readability.
  The problems: it is hard to scroll and see all the cards, and the chairs on
  the left get cramped with a large government. Nothing is built until the user
  picks one.

- **Diplomacy: design first, by Fable (2026-11-17).** The user: *"let's have
  fable do the diplomacy screen too, i want it to have similar design elements
  as the rest of the game (it's designed differently and sticks out currently),
  and I want a couple ideas in terms of layout"*. So SS6 is not built from the
  earlier board yet. A designer draws two or three layouts that share the
  design elements of the other screens (the Ledger, the Reliquary, the corner
  panel) and meet the requirements above: the deals in view with no scrolling,
  and a compact screen with many luxuries and options. The user picks one, then
  it is built.

- **The corner panel's banner, design pass (2026-11-17).** The user, after
  playing SS2b: *"the banner in the corner panel also looks bad. Could we do a
  design pass where we have the icon show much more prominently? that also
  would give more space to click to expand"*. A designer draws a few variants
  of the banner area with the seat's charge (its icon) much larger; the larger
  area is also the handle that grows the card. Nothing is built until the user
  picks one.

### The orders screen, second round (2026-11-17)

Options page: https://claude.ai/artifact/TBJA3XLCXeMmneKpvPGEka. The user:
*"1 is the best of these options for the order screen, but i still dont quite
like it. my issues: they no longer feel like cards, and they no longer feel
occult/themed. If anything, i want to find ways for the art direction to come
across even more strongly. how about: can we think of a few ways to make the
cards still feel like a deck, like you're building a hand out of a set of
cards? And then the orders screen is like playing those cards, i want to make
the design language remind players of roguelike deckbuilders, which could be an
intriguing aspect about the game to people"*

- Option 1's structure (the council on top, every card in view) is the base.
- The second round draws a few ways to make the Orders feel like a deck and a
  hand, and seating feel like playing a card, with the occult art direction
  stronger than today, not weaker. The language should remind a player of
  roguelike deckbuilders.
- The usability gains of the first round stay: every chair and card can be
  seen without long scrolling, and a card's text can be read.

- **The banner, second round (2026-11-17).** Options page:
  https://claude.ai/artifact/Eo15sVSRB8ymkvZr8C2Rfa. The user: *"ok i like
  option B for the corner banner, except we need to center the "Q" indicator in
  the UX. Could we combine this with the pennant? the flag doesn't need to be so
  long so we still have the Q indicator, lets make the pennant wider too bto
  leave space for the user to click"*. So: variant B (the corner seal) is the
  base; its shape becomes a pennant like variant C's, shorter and wider, so
  that the Q key mark still fits under it, centred on it; the wider flag is the
  click area.

- **Diplomacy, second round (2026-11-17).** Options page:
  https://claude.ai/artifact/NckitQHjpDjZn98akL2dMA. The user: *"for the
  diplomacy screen: i like B but i might be too wide. could we show what it
  would lok like on smaller screens?"* Layout B (the treaty desk) is the base.
  The next drawing shows it at smaller window sizes. The leader screen (SS9b)
  is approved: *"the leaader screen looks great, approved"*.

- **The orders screen, third round (2026-11-17).** Round two page:
  https://claude.ai/artifact/GuJDZkFbEvGKmDDzZz1gtT. The user: *"i like A for
  the orders screen, but not a strong preference. The biggest thing missing is a
  spot to see the effects of your cards. THat should be fairly prominent once
  the card is played to see its effect."* Read as: the first direction (the
  hand) is the base, held loosely. A played card's effect must be easy to see
  on the table, prominently, without lifting each card.

- **The banner: take 2 is chosen, larger and pressable (2026-11-17). Batch
  SS2c.** The user: *"for the corner banner, i like take 2, but i want the
  banner to be fairly bigger and look someehwat 'clickable'"*. Take 2 of the
  second round (https://claude.ai/artifact/Eo15sVSRB8ymkvZr8C2Rfa) is the short
  swallowtail pennant hung from the top bar, with the Q key and the arrow
  centred under it. Built larger than drawn (the drawing was 44 px wide with a
  26 px charge), and with the look of a thing to press: the solid ink shadow
  and the small move on hover that End Turn has, as take 3 drew.

- **Diplomacy: layout B is approved (2026-11-17). Batch SS6.** The user: *"ok
  the diplomacy layout looks great, lets run with it"*. The board is
  `docs/plans/mockups/scholars-study/diplomacy-options.html`, the second round
  at its top: layout B (the treaty desk) as one responsive system. The banner's
  board is `corner-banner-options.html` in the same folder.
  - Sheet: the window less 56 px wide, at most 1180 px; the window less 90 px
    high, at most 860 px; centred.
  - Under 1100 px of sheet width: the rail of courts is a strip of shields, and
    the right column folds into one line with a drawer.
  - Under 720 px of sheet height: 22 px rows and the short head.
  - The paper stays in the middle with the propose control at its foot. Only a
    side's luxury list scrolls, inside its tray.
  - Taken as drawn, because the user chose none: the short loan note
    ("loan 9t · French"), the drawer on a narrow window, the title, the
    envoy's last word, Declare war under "Other acts", gold and rights above
    luxuries, and the deal notice.
  - **Chips for the trade items (2026-11-17).** The user: *"lets do chips for
    the trade items, i like that a bit better"*. In layout B's trays, the items
    a side can give are chips, as layout C of the first round drew them, not
    24 px rows. A chip still shows the greyed state and the loan (the turns
    left on the chip; the lender in its title and when it is selected), and a
    refused item still gives the reducer's sentence.

- **The orders screen, fourth round (2026-11-17).** Round three page:
  https://claude.ai/artifact/9TdMM8xTGgWk8WptF9VJPM. The user: *"doctrines
  should also be fairly prominent i'm realizing. i like A and C, i think A
  slightly better, except with the effect text appearing on the card, styled a
  bit better."* Way A (bigger played cards) is the base, with the effect text
  on the card itself in a better style, and the Doctrines prominent.

- **The orders screen, fifth round: the card itself (2026-11-17).** Round four
  page: https://claude.ai/artifact/TJukDPfW1EpeYmdK3KLSkt. The user: *"sorry
  not what i meant, i want the bonus text to be incorporated into the card
  design more artfullly, remember these should feel like arcane cards, a
  renaissance card game or something along those lines"*. Round four made the
  played card a tidy text panel. The user wants the effect to be part of the
  card's art: an arcane card of a Renaissance card game, with the bonus text
  worked into its design. This round is about the card's face only.

- **The Order card's face is approved: face 1, the emblem (2026-11-17). Batch
  SS10.** The user: *"i'm sold, face 1 is great, please build it. it look sgreat
  i'm excited"*. The board is
  `docs/plans/mockups/scholars-study/order-card-faces.html` (round five),
  "Face 1, the emblem": the name as the motto, the suit as an engraved device in
  a framed picture field, the effect as the subscription beneath, opened by a
  red initial, the first figure lifted into a small tablet in the picture, the
  live line as a colophon at the foot, rarity as the richness of the border, a
  Doctrine in the heaviest gilt frame, a seal as red cord and wax.
  - Taken as drawn, because the user approved the page as it stands: EB
    Garamond for the effect and IM Fell English for names and plates, on cards
    only; rubric red for figures and yield words; the taller card (210 by 258).
  - The screen it sits in is round four's structure
    (`orders-screen-round4.html` in the same folder): the cloth, the played
    cards in rows, the gilt register of Doctrines with the government card, the
    hand, H for the whole hand and D for the binder. A last board redraws that
    screen with the taller face before the screen is built.
  - Build order: the card face first, as one module generated from a card's
    data, shown in the flair gallery; then the orders screen; then the draft
    offer in the same face.

- **The orders screen's final board is approved (2026-11-17). Batch SS10
  part 2.** The user: *"you're free to proceed with the orders page."* The
  board is `docs/plans/mockups/scholars-study/orders-screen-final-board.html`,
  with its build spec. It is built after the card face module (part 1). Part 3
  is the draft offer in the same face.
- **Where else the card's look can go (asked 2026-11-17).** The user: *"could
  you look for other spots where the aesthetic here could be extended to the
  rest of the game?"* A designer surveys every surface of the game and
  proposes where the emblem card's language (engraved devices, rubrication,
  rarity as the richness of a border, the period faces, seals and cord) should
  spread, ranked by gain and work. Nothing is built from it until the user
  picks.

- **SS7 is built now, in the approved look (2026-11-17).** The user, asked
  whether to hold it for the arcane look: *"build ss7 now. I want to see which
  aesthetic i like better"*. So the big moments and the full-screen abacus are
  built from their approved boards as they are, without the emblem card's
  language, so that the user can compare the two looks in play. The survey's
  frontispiece stays a later choice.

- **The built card face: three choices (2026-11-17).** The user, on the built
  face: *"it looks good. feel free to shorten the 8 cards. live total. no red
  initial is fine"*.
  - The eight cards whose text does not fit the face (seven charters and the
    Doctrine The House of Worship) get shorter text. Their meaning does not
    change.
    - Done for seven of the eight (2026-11-17), in the describers and not
      on the rows, so every card of the same kind got shorter words:
      a charter technology's gifts ("Mechanics gives the Onager trait:
      Catapult and Trebuchet +1 range"), two yields paid for one count
      ("+1 science and +1 culture per …", with "at most +30% each"), plain
      gains in the same cities ("+3 happiness and +30% production toward
      buildings, in every city with an Assembly Hall"), and bought buildings
      opened in the same cities (The House of Worship is one sentence).
      `test/fixtures/cardText.json` holds every changed text.
    - The Surveyors' Charter still does not fit at 11 px. It opens a
      technology, the Aqueduct before Engineering and the Qanat, and it
      prints what each does. Shorter words alone do not close the gap. It
      needs a decision. Two measured options: do not print what the Aqueduct
      does (the text then fits at 12 px), or print the whole card as one
      sentence (11.5 px).
  - The tablet in the picture shows the live total: what the card pays now.
  - A card whose effect starts with a figure has no red initial, and gets no
    ornament in its place.

- **The Surveyors' Charter and SS8 (2026-11-17).** The user: *"drop the
  aqueduct desctiption. ss8 can proceed"*.
  - The Surveyors' Charter no longer prints what the Aqueduct does. The
    Aqueduct's name stays a keyword link, which shows its full text. This is a
    stated exception to the note of 2026-09-05 that a charter says what its
    building does: the Aqueduct is an ordinary building that the charter only
    opens early.
  - SS8 is built now: type sizes, top bar labels, sheet motion and wording, as
    the build table states. It also takes the design checker's finding that
    `index.html` has a flat type hierarchy.

- **The orders screen is full screen (2026-11-17).** The user, after playing
  part A: *"i think its awkward that this whole thing lives in a frame within a
  modal, lets have it be full screen like the tech tree screen, the white modal
  bezels look bad"*. The cloth fills the window, as the star chart does. There
  is no parchment sheet round it and no white border. The head (what your cards
  pay, Revert, Confirm, close) sits on the cloth. The room this frees goes
  first to the hand, so that card names are in view more often, and then to
  larger cards on small windows.

## One style for the game: merging the arcane and the modern look (2026-11-18)

The user, 2026-11-16, on the two looks now in the game: "I'm a bit torn. I like
the game's aesthetic currently (slightly modern, playful) which i think fits
our graphics a bit better. But i love the art direction of the new cards."

The user, 2026-11-18: "I want to think about how to merge the arcane and modern
styles that we have currently, could you have it do a few options for the
interface and card designs? Ideally the design direction stays roughly in line
with the graphics that exist in the game. Give them heavy license to be
creative, i like the direction of the orders page looking more like a
deckbuilder, maybe have one option where there's heavy use of the card motif
throughout the game (i.e. wonders, beliefs, etc all shown as cards)".

- This is a design board, not a build. A few options, each shown on the
  interface and on the cards.
- Each option must sit well on the game's own graphics (the toon diorama).
- One option uses the card motif through the whole game: wonders, beliefs and
  the like all shown as cards.
- The designer has heavy licence to be creative.
- Nothing is built until the user picks.

### The user's first reading of the one-style board (2026-11-18)

Board: `scratchpad/onestyle/one-style-options.html`, published at
https://claude.ai/artifact/PcZtdfdNKYZHgfdnZ1wJKv. The user: "tbh i hate the
look of C. B seems impractical to me for UX reasons, but it does raise an
interesting idea -- what if all empire-wide abilities were symbolized by cards,
and the orders/doctrines page were just a list of all cards in play".

- **C (Cut-Paper Tarot) is rejected.**
- **B (cards everywhere) is rejected as a whole**, for UX reasons.
- **New idea to draw: "cards in play".** Every empire-wide ability is a card,
  and the orders screen lists every card in play. The rules already keep this
  list: `liveEffects` in `src/sim/statecraft/evaluator.ts` walks eleven sources
  in one order (the government, its Doctrines, the seated Orders, malices,
  beliefs, wonders, great people's legacies, timed effects, bead caps,
  technologies that carry a rule, holy cities). A second board draws this on
  option A's base. Nothing is built until the user picks.
- A and D are not yet ruled.

### The cards-in-play board, and the table that follows it (2026-11-18)

Board: `scratchpad/onestyle/cards-in-play.html`, published at
https://claude.ai/artifact/BGL63xYwjnQKo9Zg6RAjD6. The user: "hmmm i dont like
any of these. how can we make it look/feel like an actual card game? I'm
imagining a 'hand' that's played in the middle, as if its a hand thats being
played, and maybe the permanent effects are positioned in specific spots like
how a card game has different zones for different effect cards? There is an
overwhelming number of cards tbh".

Proposed in reply and accepted ("ok that makes sense to me"): a card table with
zones. Only what the player chose and placed is a card (the council, the
government, the Doctrines, the hand). Passive effects are not full cards.

The user's further rulings, same day: "i think R feels somewhat close in terms
of function (piles of permanent abilities). Resources and technologies should
definitely not be cards. Maybe wonders and beliefs are separate form order
cards but also contain some graphic element to them? I'm thinking that the
wonders should eventually have splash art".

- Layouts P, Q and R are rejected as drawn. R's function (piles of permanent
  abilities, one pile a kind) is close to what the user wants.
- **Resources and technologies are never cards.**
- **Wonders and beliefs get their own forms**, different from an Order card,
  each with a graphic element. A wonder's form has room for splash art later.
- A third board draws one table, at mid game and late game. Nothing is built
  until the user picks.

### Two tabs: Council and In play (2026-11-18)

Board before this: `scratchpad/onestyle/card-table.html`, published at
https://claude.ai/artifact/Acrdga9ZieQGMwhJPJpsLz. The user: "what if we had two
modes - one screen where you play cards, and another where you see all cards in
play. these can be separate tabs or separate screens altogether."

Proposed in reply: two tabs of the one orders screen. The user: "yeah lets do
it. I also want the effects of each card and the total effects be prominent as
well."

- **Tab 1, Council:** where the player plays cards. Chairs with full cards,
  the government with tucked Doctrines, a full fan of held cards, the draft
  pile, and a thin rail of four small piles (a count each) that is the door to
  tab 2.
- **Tab 2, In play:** where the player reads. The council smaller and not
  movable, every pile open (wonders, beliefs, legacies, running out), the
  totals, and the breakdown with resources and technologies as plain rows.
- **What each card pays, and the totals, are prominent on both tabs.**
- A fourth board draws both tabs. Nothing is built until the user picks.

### The user's comments on the two-tabs board (2026-11-18)

Board: `scratchpad/onestyle/two-tabs.html`, published at
https://claude.ai/artifact/ARv274SuBRisKUrrchqR2G. The user's comments on the
page, in their words:

- **E2, the pay plate, is chosen.** "i like the pay plate slightly better. lets
  use the same font as the cards, but the coloring is great. no need to add
  non-yield effects or one time effects (gain faith on kill for example) as
  part of the pay plate." So: the figure is the foot of the card itself, in the
  card's own typeface, in the yield's colour. It shows yields paid each turn
  only. A rule card and a card that pays on an occasion get no plate figure.
- **N1, the totals band, is chosen, without the income share.** "N1 is great,
  no need to show the total or the percentage of what the player makes in a
  turn."
- **In play becomes a separate screen, not a tab.** On the Council drawing:
  "i like this, but it's a bit busy. Let's just have the 'in play' screen be a
  different screen altogether".
- **The rail of small piles leaves the Council screen.** "this panel is
  probably unneeded".
- **Confirm moves to the bottom right, above the hand.** "i think the player
  expects the 'next action' button to be there because its the pattern on the
  main screen."
- **A new wonder lands in the In play screen.** On the arrival frame: "this is
  great, but have it drop into the now separate 'in play' screen."
- **The open piles on In play are too busy.** On the wonders zone: "this feels
  a bit busy again, could we have these stack like the doctrines, and make them
  expandable?"
- **A question on percentages**, answered in chat: inside one stage the
  percentages are summed; the town stage and the empire stage multiply
  (`applyStages`, `docs/yields.md`).

Also, the user, 2026-11-18, on the abacus bead count (13 drawn, 7 in the rule):
"lets not finalize that now, i want to also rethink how wagers work." The bead
count stays as it is until the wager rethink.

### The age plate and the bead moment go full screen (2026-11-18)

The user's comments on the turn-over pictures
(https://claude.ai/artifact/AduZQbsbdRE19kWDyxz3Ji), in their words:

- On the age plate and the bead sheet: "can we make both of these full screen?
  I'm happy to have it be a big moment, and i think the abacus needs more
  space."
- On the bead sheet: "too much text in this description, and the purple dot on
  the top feels amateurish. Let's just have the title "Wager of the Muse" and
  the abacus, full screen with the animation. Also, make sure that the original
  'Crimson' label is removed throughout the game and it reads your leader
  instead."

So:
- **The age plate is a full-screen page.**
- **A bead award is a full-screen page**: the title (for example "Wager of the
  Muse") and the 3D abacus with the bead's slide. No description paragraph, no
  coloured dot above the title.
- **A seat is named by its leader everywhere**, never by its colour ("Crimson").
- The bead count on the frame (13 drawn, 7 in the rule) stays open until the
  user rethinks the wagers.

### The user's comments on the Council and In play board (2026-11-18)

Board: `scratchpad/onestyle/council-and-in-play.html`, published at
https://claude.ai/artifact/Vue9nTgRZtsiF7D9pCPco6. The user's comments:

- **The door and the arrival (D1, A1 to A3) are approved.** "this looks great."
- **The totals band is too heavy**, on both screens. "lets have this look a bit
  more elegant, its a bit of an eyesore taking up so much space at the top."
- **"Running out" is renamed "Temporary".** "rename: temporary instead of
  running out."
- **Pieces in the In play stacks are one size.** On the late-game legacies
  stack: "the wonder and legacy cards get too thin, lets just keep the same
  size like how the council is structured. with each card the same size."
- No comment on the pay plate, the Council screen's layout, Confirm at the
  bottom right, or the stacks as an idea. Taken as accepted unless the user
  says otherwise.

### Happiness and authority on the cards and in In play (2026-11-18)

The user: "Could we also add happiness/authority as yields that cards can give,
and also put happiness/authority bonuses as items in the 'in play' section?
Later we should do a pass on the yield calculations for cards because i've
noticed they can be a bit weird".

- The rules already let a card pay into happiness and authority, and the card
  measurement reports it (`kind: 'meter'` lines in `src/sim/cardImpact.ts`;
  Festival Days pays contentment, Provincial Governors pays writ). So this is a
  display ruling: **happiness and authority show as figures beside the six
  yields** on the pay plate, on tucked edges, on stack totals and in the totals
  line.
- **In play lists what pays happiness and authority.** A piece that pays a
  meter shows it on its edge. Sources that are not cards (luxuries, buildings)
  are plain rows in the breakdown, as resources and technologies are.
- **Queued for later: a check of the card yield figures.** The user has seen
  figures that look wrong. Collect examples from the user first.

### The full-screen bead page: a line that congratulates (2026-11-18)

Pictures: https://claude.ai/artifact/XxAtvuNscC2pKbC7irouCj. The user: "maybe
the bead award screen needs some text congratulating the player. otherwise it
looks great."

- The full-screen age plate, the full-screen bead page and the leader names
  are approved as built.
- The bead page gets one short line that congratulates the player. Plain
  words, no number in the sentence, and it says why the bead came (a wager
  kept, or a grant).

### The Council and In play board is approved (2026-11-18)

The approved board is in the repo:
`docs/plans/mockups/scholars-study/council-and-in-play/council-and-in-play.html`
(published at https://claude.ai/artifact/Vue9nTgRZtsiF7D9pCPco6, version 2).
The user, 2026-11-18: "added comments, its looking great now". The comments on
version 2:

- "N4 is great": the totals are the fine line in the screen's head.
- On the head of the Council screen: "please make sure these are vertically
  centered in the real build". The title, the In play link, the totals and
  the close hint share one centre line.
- A new interaction: "clicking an already slotted card should make it 'held'
  and dropping away from a slot should remove it from a slot. useful if
  players just want to remove a card and not replace it with anything".

Taken as accepted, because the user saw them and did not object: the pay plate
replaces the figure tablet in the card's picture and the grey foot line; the
door on the map is a button with a count in the corner panel, with the link in
the Council screen's head and a key; the leader's crest is on In play; the
Council screen keeps the title "Orders & Doctrines".

**Build stages** (each one gated and landed on its own):

1. **The Council screen.** The pay plate on the card face (yields and the two
   meters, per turn only; no plate for a rule card or an occasion card; "+0"
   and the reason for a card that could pay and does not). The N4 totals line
   with happiness and authority, vertically centred in the head. Confirm and
   Revert at the bottom right above the hand. The larger fan. The 176 px card
   at eleven chairs. A held card shows the pending change on the totals line.
   A click on a seated card holds it, and a drop away from any chair takes it
   off its chair.
2. **Figures for wonders and temporary effects** in `explainCardImpact`
   (`src/sim/cardImpact.ts`), which today measures Orders, Doctrines, the
   government, beliefs and legacies.
3. **The In play screen**, its door in the corner panel, and the arrival of a
   wonder and a belief.

### The trade screen stays open after a send (2026-11-18)

The user: "the trade route screen should not close after buying a route,
oftentimes i want to purchase multiple." `dispatchSend` in
`src/ui/tradeScreen.ts` now draws the sheet again and does not close it.

### After the Council screen landed: figures and drag (2026-11-18)

The Council screen (stage 1) landed at `b29b4c8e`. Two faults show in it: a
card's pay plate and the totals can disagree (The Farming Garrisons' plate
reads +13 food, the food total +12, its chip -12), and the happiness and
authority totals miss cards whose effect the rules fold into a line no card
owns (The Forbidden Silks shows +16 happiness, the total +0).

The user, 2026-11-18, asked "Fix the card figures that disagree now, with
stage 2?": "yes". Asked "Real drag and drop, or click then click?": "could we
support both?"

- **Stage 2 now has two parts:** per-turn figures for wonders and temporary
  effects, and one reading that feeds the pay plate, the chip and the totals.
  A plate, the chips and the totals must agree for every card, for the six
  yields and for happiness and authority.
- **The Council screen supports drag and drop and click then click.**
- Meter colours stay ink, as built, unless the user chooses the board's green
  and brown.

- **Meter colours are ink** (the user, 2026-11-18: "yeah, ink is fine").
  Happiness and authority print in ink on a card's plate and in parchment in
  the screen's head, not in the board's green and brown.

### The 3D abacus: look B, Walnut and gilt (2026-11-19)

Board: `scratchpad/abacus-style/abacus-options.html`, published at
https://claude.ai/artifact/Na8KW6rafCpfhpteQH3wBo. The user, on B1: "yeah, this
one is great. Could we remove the stripe running down the bead? Otherwise lets
ship this".

- **Look B is the abacus's look everywhere**: the bead page, the Abacus screen
  and the Opus close. Dark walnut, gilt fittings, turned knobs and feet, the
  brass plaque with the age numeral, a stud in each seat's colour, an ivory
  bead for a place not earned, on the parchment page.
- **No gilt band on the beads.**
- Looks A, C and D are not built into the game.
- The number of places a rod stays as it is (13) until the wager rework.
- The options' code is on branch `worktree-agent-a500e56fb98dd2862` as a
  work-in-progress commit.

### After the In play screen was built: the user's comments (2026-11-18)

The user saw the stage 3 pictures and the Council screen in play. In the
user's words:

> "could you take a look at the orders page? i think it could use more
> vertical space for the title and government slot areas, that should be
> the focus of the page, and there's too much room for the hand i think, so
> it feels squashed. I'd also like for few government seats to be clustered
> in the middle with negative space around it instead of having it be evenly
> spaced (dont need to change the screen when more slots appear). Lets also
> re-use the convention of the 'x' to close as in the technology screen. For
> the in-play build, could you find a more elegant way of handling the
> wrapping when there are multiple yields? We can dedicate the entire bottom
> of the card for yield descriptors and i'd rather have the card increase in
> size than to have the numbers truncated or have it overflow past the card
> boundary. yes to all decisions for me, for #4 we should show everything
> and handle the overflow better."

**The Council screen**
- Give more height to the head (the title) and to the area with the
  government and its chairs. That area is the focus of the page.
- Give less height to the hand.
- When the government has few chairs, put them in a cluster in the middle,
  with empty space on both sides. Do not spread them over the full width.
  The layout with many chairs stays as it is.
- Close with an "×" control, the same one the technology screen uses. The
  In play screen takes the same control.

**The In play screen**
- A piece with many yields: the whole bottom of the piece is for the yield
  figures. The figures wrap on whole figures. The piece grows taller when it
  needs more lines. No figure is cut off, shrunk until hard to read, or drawn
  past the edge of the piece. This replaces the "one edge size" rule where
  the two disagree: an edge may be taller than its neighbours.
- Show every figure (decision 4). Do not limit an edge to its largest two or
  three.
- A malice counts in the council stack's total (decision 1).
- The great houses stay in the Wonders stack (decision 2).
- A finished wonder gets a full-screen moment: the lapis plate of frame A1,
  as a page in the news queue (decision 3). The stage 3 report lists what it
  needs in `main.ts`.

**A wonder's picture windows (the user, 2026-11-18)**
- The user will paint splash art for wonders at 16:9.
- The full-screen wonder plate's picture window is exactly 16:9.
- The picture window on the top piece of the Wonders stack is 2:1, not the
  3:1 strip of stage 3. The user: "could we make the wonders card slightly
  taller for the wonders stack? 3:1 is possibly too extreme, maybe 2:1
  instead?" The piece grows taller to hold it. The window shows the centre
  band of the same picture.

### After stage 4: the user's answers (2026-11-19)

- **Council cards stay their present size.** "no need" to scale them up.
- **The chair cluster stays right of centre.** "right of center is fine".
- **Six chairs cluster too** ("sure"): two rows of three. Seven or more keep
  the wide layout.
- **The wonder plate keeps no effect text.** "keep it without text."
- **One page for a wonder.** "put the renown line on the plate, no second
  page." The plate carries the Triumph's renown line, and the Triumph page
  "A Marvel Raised" does not open for a wonder the plate has shown.

### The chair cluster sits in the space right of the government (2026-11-19)

The user, after the six-chair cluster landed: "the chairs feel awkward in the
center, they should be centered in the remaining space since the government is
in the left side (so ideally they're off-center to the right)… i actually
prefer the old 6 chair design, thats off-center right, lets use something like
that for all <7 chair arrangements."

- For fewer than seven chairs, the cluster is centred in the space between the
  government column's right edge and the page's right edge. It is not centred
  on the page.
- The model is the six-chair layout before stage 5 (picture
  `s5-before-six-1440.png`): rows of three, to the right of centre.
- Seven chairs or more keep the wide layout.
- This replaces the earlier line "The chair cluster stays right of centre",
  which described a layout that the build had in fact centred on the page.

### Wonder paintings, and a plate made for them (2026-11-19)

- The user painted splash art for all 34 wonders of the final set. The files
  are in `public/art/splash/wonders/`, listed in `src/ui/wonderPaintings.ts`,
  and shown by `wonderPicture(id)`.
- The user, on the first plate with a painting: "the full screen splash for
  wonders looks off. Could you do a simple design pass, have the art shine".
- A wonder with a painting now gets its own plate layout:
  - a near-black ground in place of the lapis page, so the page does not
    compete with the painting's sky;
  - the picture window as large as the page allows, still exactly 16:9;
  - the words on the foot of the painting over a dark fall-off: the name, the
    town and turn and what it pays on the left; the Triumph line and Continue
    on the right.
- A wonder without a painting keeps the lapis page with the engraved stand-in.

### The painted wonder's plate: a ribbon over the board (2026-11-19)

- The user played with the full dark page and found it "a bit jarring after
  playtesting. Could we have it still take up most of the screen, leaving room
  for the image, but having some of the background show?"
- From mock-ups, the user chose the painting over the dimmed board with a
  ribbon: "lets go with version 3, the slower arrival sounds great".
- What it is: a narrow lapis sash from the left edge of the window to the
  right, with gilt rules, a field of gilt dots, a line of stars, moons and
  suns along each edge, and a sun and a moon on the band beside the painting.
  The painting stands in front of it, about three quarters of the window's
  width, with the words on its foot. The board shows above and below under a
  light dim.
- The arrival is slow, in order: the board dims, the ribbon draws out from the
  centre, the sun and moon come up, the painting rises, the words show. About
  1.8 seconds in all. Reduced motion shows it at once.
- This replaces the near-black page of the entry above. A wonder without a
  painting still keeps the lapis page.

### Renown on the Council and In play screens (2026-11-19)

The user: "lets add renown to the in-play and orders yield screen, cards should
show additional renown that they generate".

- The totals line of the Council screen and of the In play screen gains
  renown, beside happiness and authority.
- A card or piece that adds renown each turn shows that figure on its plate,
  with the renown mark, in the same way as its other figures.
- The figure is the difference the card or piece makes to the seat's renown
  each turn (with it, less without it), as for the yields. It comes from the
  sim's own renown list (`explainRenown`), never from a second sum.
- A one-time renown grant (a Triumph, a completion) is not a per-turn figure
  and is not shown here.

### One style for the whole game: Quiet Table is the base (2026-11-19)

The user came back to the one-style board
(https://claude.ai/artifact/PcZtdfdNKYZHgfdnZ1wJKv, file
`scratchpad/onestyle/one-style-options.html`; option A is "Quiet Table", B
"The Whole Deck", C "Cut-Paper Tarot", D "The Magister's Table"):

> "the quiet table feels the closest to what i want. Could we iterate on that
> design… With the splash art spots in mind, could we do a pass with
> incorporating the arcane look to the rest of the game, while keeping some of
> the flavor of the modern design?"

- **Quiet Table (option A) is the base** for the screens that still wear the
  older modern look.
- The next board iterates on it with three things in mind:
  - the screens that are built in the arcane look (the Council, In play, the
    wonder plate with its ribbon, the age plate);
  - the user's gouache paintings and the places splash art could go (leaders,
    ages, great people, the title screen, the ending, governments, capital
    taken and elimination);
  - keeping some of the modern design's flavour, not replacing it.
- B, C and D stay rejected or unchosen. Nothing is built until the user picks
  from the new board.

### The Council screen: show which chair a card acts on (2026-11-19)

The user, in a comment on the Magisterial design pass (The Grand Vizier, "The
card in your first Economic chair pays its yields twice"): "For cards with
effects like this, could we add a highlight effect to the chair that it
targets when slotted?"

- When a seated card acts on another chair (it doubles, copies or changes the
  card in a named chair), the chair it acts on is marked on the Council
  screen. The mark also shows while the card is held over the council, so the
  player sees the target before they seat it.
- The target comes from the sim's own reading of the card (its `slotPosition`
  or the same data the evaluator reads), never from a list of card names.

### Renown on a card's printed face (2026-11-19)

After renown landed on the Council and In play screens, the user: "card's
printed face yes, #2 yes."

- A card's printed face shows the renown it pays each turn wherever card text
  is printed: draft offers, the Reliquary, the faith screen, the Compendium.
  It uses the laurel, as the plates do.
- The split of renown by family stays in the In play breakdown only. A card
  that only moves renown between families shows no figure on its plate.

### Quiet Table, second pass: the user's comments (2026-11-19)

Board: https://claude.ai/artifact/69ecqnXE3YEy85YsdDxU3p, repo copy in
`docs/plans/mockups/scholars-study/quiet-table-second-pass/`. The user
commented on the frames and said in chat: "Any thing we're missing? Lets add a
screen for the faith page, it feels a bit outdated." The comments, in the
user's words, with the element each sits on:

| Frame | On | The user's comment |
|---|---|---|
| 1 HUD, quiet | the frame's title | "lets go with this one" |
| 1 HUD, quiet | a mark in a toast (the 7th element, an svg) | "make the icon smaller, so the toast isn't so large, i'd like to keep it the same size. the icon doesn't need so much detail" |
| 1 HUD, quiet | the 10th element of the frame | "this was fine as it was, don't need the icon here" |
| 2 City, quiet | the picture marked "stand-in" in the build list | "pictures here are too busy, lets keep the build queue the same" |
| 2 City, quiet | "Wonders here" | "i like the wonders segment" |
| 2 City, quiet | "Buildings" | "the buildings section is great, let's have a spot for empire buildings too, they should be separate" |
| 2 City, quiet | the left panel (growth) | "could you incorporate levying and the faith panel too, to see how it looks." |
| 3 Star chart | the paper panel | "i don't like the panel as much, the technology screen seems fine for now. 'click a star to aim' is unclear, lets clean that up for the player." |
| 4 Working sheet | the frame's title | "Cool, i like the light touch. Let's keep the tab text the same (can set out, shut are nondescriptive)" |
| 5 Diplomacy, quiet | the frame's title | "this feels busy now, there are 5 columns. could we have the leader selector on the left be incorporated differently? I like the idea of the main focus being on the portrait of the leader, i'd like their speaking to be more prominent too, as that gives the game more flavor." |
| 5 Diplomacy, richer | the frame's title | "this is probably too much" |
| 6 Great person offer, quiet | the sheet | "great" |
| 7 Government banners | the frame's title | "Great, love it" |
| 8 Age plate, ribbon | the frame | "great" |
| 8 Age plate, own page | the frame | "i like the ribbon better, so it doesn't take you out of the game." |
| 9 Title | the title | "great, i like this. Lets make the tag line \"a game for the ages\"" |
| 9 Ending, victory | the frame's title | "Great, approved." |
| 10 Kit | the tooltip | "great, one thing i've been meaning to add: show who owns the tile, if it's owned, otherwise don't show anything." |
| 10 Kit | the toast "The Great Library is finished." with a painting | "we already have the wonder completed screen, so this isn't necessary. Painted things probably will all have their own screen, so no need to put it in a toast" |
| 10 Kit | the sheet head "The Ledger" (two strengths) | "the quiet one seems better for me" |
| 10 Kit | the "Declare war" button | "lets make the declare war button more forceful/important" |
| 10 Kit | the whole strip | "outside of comments, these are great" |

What follows from them:
- **HUD: the quiet level.** Toasts keep their present size; a seal in a toast is
  small and simple; one element keeps no icon at all.
- **City screen: the quiet level,** with the build queue unchanged (no
  pictures in it), the wonders segment kept, a separate segment for empire
  buildings, and levying and the faith panel drawn in.
- **The technology screen stays as it is.** Only the hint "click a star to
  aim" is rewritten so a new player understands it.
- **Working sheets: the light touch,** with today's tab words kept.
- **Diplomacy is redrawn:** fewer columns, the leader selector moved out of
  the left column, the portrait the main focus, the leader's words prominent.
  The richer ribbon version is rejected.
- **Great person offer on paper, government banners, the age plate on the
  ribbon, the title screen and the victory ending are approved.** The title's
  tag line is "a game for the ages".
- **No painting in a toast.** Painted things get their own screen.
- **The hex tooltip shows who owns the tile** when it is owned, and nothing
  when it is not.
- **The Declare war button is made more forceful.**
- **A faith screen is added to the board** (the user: "it feels a bit
  outdated").

### Quiet Table, third pass: the user's comments (2026-11-19)

Board: https://claude.ai/artifact/62VT2ck8a6Ucn8Cjb1AfGw, repo copy in
`docs/plans/mockups/scholars-study/quiet-table-third-pass/`. The comments, in
the user's words:

| Frame | On | The user's comment |
|---|---|---|
| a1 HUD, quiet | a figure ("67") in a panel of the HUD | "i'm noticing in playtesting that these can overflow. Could we slightly lower the text size here and make it so the panel can expand instead of overflowing?" |
| a4 Technology hint | the recommended rewrite | "'click a technology to research it'" |
| a9 Ending, a loss | the frame | "great" |
| a11 Declare war | version A | "great go with A" |
| b1 City, a town with everything on | the head row | "this is too cluttered, could you make it a bit simpler and less overwhelming for new players? The build list doesn't require icons, i think it looked good as it did earlier with the gear. The bottom bar feels too busy." |
| b2 Diplomacy, layout B (the large portrait) | the frame's title | "I like this one better actually. What happens if you click standing and deals? Also, i'm worried there wont be enough room on the top bar for all portraits, could you make that a bit better? The bar from A could work, but i'm not like, excited about it." |
| c1 Faith, Bonuses tab | the head | "lets move bonuses to the third tab. Could we have a reworked version of the religion and followers tab too? it looks quite dated. The proposed pages look good" |
| c3 Order draft offer | the sheet | "The text below the card isn't needed. Lets make sure this is basically the same as the great people draft screen, just with order cards. There feels like too much negative space on the bottom. Make sure to preserve the animations, maybe adding a flipping effect here and have the cards reveal themselves one by one?" |
| c4 Reliquary | the frame | "Great" |
| c5 Setup, the leader step | the frame | "faces on both the chip and the right panel seems unneeded. Could we have more of a focus on the leader portrait?" |
| c6 Unit panel and forecast | the forecast | "lets make sure this forecast is on the bottom left, where it used to be." |

What follows:
- **Approved now:** the loss ending; Declare war version A (a solid dark red
  button, then a sheet that names what follows; Enter does not confirm); the
  Reliquary; the faith sheet's Rites and Bonuses pages as drawn.
- **The technology hint reads "click a technology to research it"** in place
  of "click a star to aim".
- **HUD figures must not overflow.** The type in that panel is a little
  smaller, and the panel grows with its content.
- **City screen: simpler.** Less on screen for a new player; the build list
  with no icons, as it was with the gear; a quieter foot. To redraw.
- **Diplomacy: layout B,** the large portrait. To settle: what Standing and
  Deals open, and a better way to show the other courts than a row of faces in
  the head.
- **Faith: Bonuses becomes the third tab,** and the Religion and followers tab
  is redrawn.
- **Order draft: the same sheet as the great person offer, with Order cards.**
  No text under the cards, less empty space at the foot, today's animations
  kept, and the cards turned over one by one.
- **Setup: one face, not two.** More weight on the chosen leader's portrait.
- **The combat forecast stays at the bottom left,** where it is today.

### Quiet Table: build stage 1 (2026-11-19)

The user approved a first build while the fourth pass is drawn ("yeah
great!"). It holds only what the user has approved on the third-pass board
(`docs/plans/mockups/scholars-study/quiet-table-third-pass/`) and needs no new
art:

1. **The kit** (frame a10): the sheet head at the quiet level (the ink rule
   over a gilt hairline) with the × on every sheet that builds on the modal
   shell; the button styles; a toast about a held thing carries a small plain
   seal (a ring and a dot) and keeps today's toast size; no painting in any
   toast; one HUD element keeps no icon (the dispatch).
2. **The hex tooltip** shows who owns the tile when it is owned, and no line
   when it is not.
3. **The technology hint** reads "click a technology to research it" in place
   of "click a star to aim". The rest of the line is made as plain.
4. **Working sheets** (frame a3): the light touch on the caravans sheet, with
   today's tab words kept.
5. **Declare war, version A** (frame a11): a solid dark red button set apart
   from Propose, then a sheet that names what follows. Enter does not confirm.
6. **The title screen's tag line** is "a game for the ages".

Not in this stage: the great person card and the Reliquary (stage 2), the
Order draft, the city screen, diplomacy, faith, setup, the unit panel, the HUD
overflow fix (all wait for the fourth pass), the age plate on the ribbon and
the endings (they wait for paintings or their own stage).
