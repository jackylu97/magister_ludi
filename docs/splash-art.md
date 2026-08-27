# Splash art — where illustration belongs in this interface

Working doc (2026-08-27). The art itself is the user's lane (Midjourney; design-notes Entry
VII: "portraits are the Midjourney art's real home"). This doc is about *where* a painted
plate earns its place in an interface whose language is ink, parchment and drawn marks, how
big, and what stands in the frame until the art exists. Companion: `docs/art-pass.md`
(the flourish set, the frontispiece, age plates), `docs/great-people.md` (eighty faces),
`docs/wonders.md`.

## What the reference games do

| game | where art appears | the lesson |
|---|---|---|
| **Civilization IV–VI** | leader screens (full-bleed, animated in VI), wonder **completion movies** (V: a painted plate with a quote; VI: the build animates *in the map*), tech-quote splashes, era-dawn screens | a wonder wants a *moment*, not a tooltip; Civ VI's move into the map is the same instinct as our "world's one spectacle" — the plate and the sculpt are two halves of one reveal |
| **Old World** (Mohawk) | painted **portraits** of every leader and their kin; ~3,000 events sharing a small library of **scene plates** behind text; wonders as painted cards | portraits carry identity at *small* sizes (a 96px face in a list is still a person); scene art is **reused** — one plate serves many events, so a library of ~30 scenes covers a game |
| **Crusader Kings III** | event windows: a painted **backdrop** behind 3D characters | Paradox's stated rule: the illustration *supports the subject*, never competes — low contrast, nothing that expects to move, composition pulling the eye to the character. Our equivalent: a plate never carries rules text; the ledger does |
| **Sultan's Game** | every card a gilded painted plate; the board a worn cloth; the court in deep red | a card-centric game can afford art on *every* card because cards are the unit of play; the frame (gilt, ornate) does the register work, the painting does the identity work |
| **Slay the Spire / Inscryption** | a small painted vignette in a frame; the frame's colour and shape encode class/rarity | the **frame is data, the picture is flavour** — exactly our tarot cards: line accent, emblem chip, tier rim |
| **Humankind** | full-screen era/culture selection plates; illustrated science, unit and building entries | full-bleed plates for *choices that define a run*; small plates in lists for everything else |

Two rules fall out of this for us:

1. **Art marks a moment or a face, never a mechanic.** A plate appears where a *decision that
   defines the run* is made (recruit, adopt, found a god), where *the world changed* (a
   wonder, an age closing, a capital taken), or where a *person* is (a leader, a great person).
   It never appears on a control, a ledger, a hover, or a per-turn surface — those stay ink.
2. **Frame does the register; picture does the identity.** Every plate sits in the same
   hairline-gilt double frame on parchment as the turn card (`.gilt-frame`), so a painting in a
   different style still reads as *ours*. The frame is what we control; the paintings vary.

## The insertion points, ranked

Ranked by *vibe per painting* — how much one plate buys — with the size the surface actually
needs, the aspect, and what stands in until the art exists (every slot must look finished with
no art, because most rows will have none for a long time).

| # | surface | trigger | plate size · aspect | count needed | no-art fallback | status |
|---|---|---|---|---|---|---|
| 1 | **Great-person recruit offer** | the renown draft opens | card plate **~200×240, 5:6**, in the tarot frame above the legacy text | one per person — start with the ~20 defining/strong of Heroes and Empire; the rest use the fallback indefinitely | the family emblem chip large, the tier accent, the epigram — the card already reads without a face | ready: the offer face exists (Entry XXXII UI pass) |
| 2 | **Leader plates** | setup (seat picker) · the turn card · the seat strip at 24px | **portrait 3:4** at three sizes: 320px (setup), 96px (turn card), 24px (strip, circle-cropped) | one per leader (Entry III roster, unbuilt) | the seat's **heraldic charge** on its tincture, which is what the strip shows today — the charge *is* the fallback and it is already good | waits on the leader system |
| 3 | **Wonder completion** | `realiseItem` claims a wonder (every seat is told) | **landscape plate 16:9, ~960×540**, full-bleed inside the gilt double frame, the plain chronicle line beneath | one per wonder (18 in the first pass) | the marvel sculpt framed by the camera (`frameCells` on the city) with the announcement card over it — a 3D reveal, Civ VI's answer | needs the wonder rows; the card is the turn card's class |
| 4 | **Age plates** | an age closes (`highestAge` advances) | **landscape 16:9** behind the age's deeds tableau (art-pass L4) | five (one per age) | the deeds tableau alone — it is drawn from the mark families and stands on its own | waits on the age-plate pass (art-pass pass two) |
| 5 | **Frontispiece** | the landing screen | **one square or 4:5 plate ~480px** beneath the title, or a full-bleed backdrop at low contrast behind the parchment sheet (CK3's rule) | one | the astrolabe device and the epigraph — already shipped and finished-looking | ready now: a single slot in `index.html`'s marquee |
| 6 | **Belief cards** | consecration offer; the pantheon column | **small vignette ~120×120, 1:1** in the eyebrow where the axis glyph sits | eighteen | the drawn belief mark set (the open art gap) — build that first; a painting is the upgrade | waits on the drawn belief marks |
| 7 | **Government adoption** | the Doctrine offer / the charter | **banner 3:1, ~720×240** across the top of the adoption sheet, one per government | ten | the government's line emblem large + the tier numeral | ready: the adoption sheet exists |
| 8 | **Discovery claims** | a ruin/village is entered | small plate **4:3, ~320×240** on the offer card | two (ruin, village) plus perhaps one per age | the site mark — already drawn | ready; low priority |
| 9 | **Capital taken / eliminated** | capture, elimination | a turn-card class announcement, same 16:9 frame as the wonder | two generic plates | the turn card's gilt frame with the plain line | ready; the event is rare and the plate is reused |
| 10 | **The Abacus** | victory / the score screen | a backdrop plate behind the 3D abacus, low contrast | one | the abacus itself | waits on the Bead Race |
| — | **Tech/research** | — | none: the star chart *is* the art of that screen | — | — | refused |
| — | **City screen** | — | none: the framed city on the vignette is the plate | — | — | refused |
| — | **Units, tiles, hovers** | — | none: drawn marks only | — | — | refused |

## The three that matter

**Recruits (1)** buy the most: a painted face turns "a scholar, ● tier" into *Hypatia*, the
draft is the game's most frequent defining choice, and the roster is where the wunderkammer
register lives. Twenty paintings cover the two ages a first game actually reaches. The frame
already exists; a plate is a `portrait: "…"` field on the `greatPeople.json` row and an
`<img>` slot in the card face that collapses to the emblem when absent.

**Wonders (3)** are the cinematic moment the game currently lacks entirely — every seat is
told, so it is a *shared* moment, and Civ has trained every player to expect one. The 3D
fallback (frame the city, card over it) is good enough that the paintings can arrive one at a
time.

**Leaders (2)** carry identity at every size but wait on a leader system; the charge is a
genuinely good stand-in, which is why heraldry shipped first.

## Rules for the paintings themselves (for the Midjourney lane)

- **One style, stated once**: engraved-and-hand-tinted — the woodcut/copperplate line with a
  wash, so it sits beside ink marks rather than fighting them; never photoreal, never painterly
  soft. Sultan's Game's gilding is the register; CK3's low contrast is the discipline.
- **Composition pulls to one subject**, background quiet, nothing that expects to move (CK3's
  rule) — the plate sits *behind* or *beside* text and must not compete with it.
- **Portraits at 3:4, three-quarter view, eyes level**, so a 24px crop still reads as a face.
- **Landscape plates at 16:9 with the subject in the upper two-thirds** — the announcement line
  sits across the bottom.
- **Paper, not pixels**: the plate is masked with a soft-edged rectangle and a hairline inner
  rule so the paper of the card shows at the edge; no hard rectangular photo edges anywhere.
- Deliver at 2× the slot size; the build stores WebP, served from `public/art/…`, referenced by
  a field on the data row, never by convention from an id.

## A slot mechanism (one, shared)

One component: `artPlate({ src?, aspect, fallback })` — renders the framed image when `src`
exists and the fallback node otherwise, in the same frame either way, so a screen never has two
layouts. Rows carry the field (`portrait`, `plate`); the component owns the frame, the mask and
the loading state (the paper shows, then the plate fades in — respecting reduced motion). That
is the whole implementation cost apart from the slots themselves, and it is what lets art land
one painting at a time.

## Revisions

*(yours — edit away; ✎ marks what changed)*
