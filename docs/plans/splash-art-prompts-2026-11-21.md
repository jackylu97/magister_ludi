# Splash art prompts: what the game still lacks (2026-11-21)

The user, 2026-11-21: *"can you give me prompts for all remaining splash art, i'd like to do the religious beliefs too"*.

- This page has one Midjourney prompt for each painting that has a picture window and no painting.
- It changes no game data and no code.
- Eleven people changed on 2026-11-21 (`docs/plans/great-people-cultures-2026-11-21.md`). Their prompts here are for the new people. The row ids did not change.
- A web page with a Copy button for each prompt was made from the same text, for the user to work from.
- The style is not new. Section 1 says where each style block came from.

## 1. The house style, recovered

**Source.** `docs/splash-art-brief-2026-11-19.md` holds the prompts that an earlier turn of this session wrote. The session transcript holds the same text and no later wording: it has no `--sref`, `--stylize` or `--style raw` value. The user added the style reference and those values in Midjourney, so they are not recorded anywhere. Keep the ones that you used for the first 20 portraits and the 23 gods.

**What the finished pictures show** (I looked at `people/alJazari`, `people/tomoeGozen`, `people/eaNasir`, `beliefs/sacredFire`, `beliefs/patronOfMerchants`, `beliefs/desertFathers`, `leaders/cleopatra`, `governments/merchantLeague`):

- Colour: a cobalt and ultramarine sky, orange, salmon and terracotta in the light, cream at the brightest places, blue-violet shadows.
- Paint: flat gouache shapes with hard edges, no outlines, a fine paper grain.
- People: the view is from a little below, so the head stands against plain sky. The face is three or four flat planes. The cloth has large patterns. The object is low, near the hands.
- Beliefs: one object on a plinth or on plain ground, in the centre, with plain sky around it and one diagonal shadow.
- Landscapes: tall cumulus clouds lit apricot, dark cypress at a lower corner, a low sun from the left.
- The earlier brief asked for a level view of a person. Midjourney gave a view from below, and it works. The prompt words are unchanged, so expect the same view.

### The fixed tails

Each prompt below is a subject part, then one of these tails, word for word. The first three are the tails of the earlier brief. The fourth is the wording that the brief used for a dusk picture (the age IV paintings).

**Portrait tail (great people, 5:6)**

```text
half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

**Emblem tail (beliefs, 1:1)**

```text
one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

**Landscape tail (title, 16:9)**

```text
flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm late-afternoon sun from the left, cream and salmon-orange stone, blue-violet shadows, deep ultramarine sky, towering apricot-lit cumulus clouds, dark olive cypress and pines, matte, very little fine detail --ar 16:9 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

**Dusk tail (title idea 3, 16:9)**

```text
flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, matte, very little fine detail, a few tall cumulus clouds lit orange from below at the far right --ar 16:9 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

- The earlier title prompt used `--ar 21:9`. The game now asks for a 16:9 file (`public/art/splash/README.md`), so the title tails here say `--ar 16:9`. This is the one change to a recovered tail.
- The portrait tail fixes the light and the sky. So the variety between people is in the pose, the object, the setting and the colours of the dress.

### Rules for the subject part

- A person: the name in plain letters, then the role, the place and the century. Then the age, the face in two or three words, the dress, and the object in the hands. Then "low behind him" or "low behind her" and one piece of setting. Then the two or three colours that lead.
- The name helps Midjourney with dress and period. The prompt does not claim a likeness. The line above each prompt says what is known of the person's looks.
- A belief: one object, where it stands, and its lead colours. No scene. No symbol of a living religion (no cross, crescent, six-pointed star or sacred syllable). Minarets, Temple Spires, The Open Kitchen and The Eternal Flame show a building or an object with no symbol on it.
- A thing that could carry writing is "blank", "plain" or "smooth" (a tablet, a page, a coin, a banner).
- Keep these words out: poster, print, card (as the kind of picture), cover, framed, cinematic, detailed, intricate, realistic, map, chart, diagram, symbol, inscription.
- Nothing tall goes into the top fifth of a portrait: a spear, a staff or a standard is held low.

## 2. How to use this page

1. Use the style reference and the values that made the first 20 portraits (for people) and the 23 gods (for beliefs). A finished portrait is the best second reference for a new portrait.
2. Paste a prompt. Add your `--sref` and other values at the end.
3. Save the full-size picture under the name on the prompt's line, in the folder on that line. The name is the thing's own name. A `.png`, `.jpg` or `.webp` file works.
4. Tell Claude that the pictures are there. Claude runs the script and puts them in the game.

| Kind | Shape | Folder | Keep in mind |
|---|---|---|---|
| Great person | 5:6 | `art-masters/people/` | The window has a round arch. Keep the head out of the top corners. |
| Belief | 1:1 | `art-masters/beliefs/` | The window is an arch. The subject sits in the centre and lower two thirds. |
| Title | 16:9 | `art-masters/title/` | About 5:2 shows, cut from the middle. The name sits on the upper left sky. Save the one you keep as `title.png`. |

<details><summary>For the developer: how a picture gets into the game</summary>

- `scripts/splashArt.py` already knows every name on this page: 137 in `PEOPLE`, 33 in `BELIEFS`, and a `title` kind (16:9, at most 1600 wide, `title.jpg`), added 2026-11-21. It maps the name to the row id and writes `public/art/splash/<kind>/<row id>.jpg`.
- Run `python3 scripts/splashArt.py people` (or `beliefs`, or `title`). Then add the row id of each new picture to `src/ui/greatPersonPaintings.ts`, `src/ui/beliefPictures.ts` or `TITLE_PAINTINGS` in `src/ui/titlePainting.ts`. A test fails if a list and its folder disagree.
- Thirteen rows kept the id of an earlier person: `ibn_jubayr` maps to `ibnBattuta`, `jacques_coeur` to `cosimoDeMedici`, and the eleven rows of `docs/plans/great-people-cultures-2026-11-21.md` (for example `amanitore` maps to `heroOfAlexandria` and `piye` to `artemisia`). `hero_of_alexandria` maps to `heronOfAlexandria`. The table is `PEOPLE` in `scripts/splashArt.py`.
- The ids on this page's anchors are `gp-<row id>`, `fb-<row id>`, `eb-<row id>`, `title-1` to `title-3`.

</details>

## 3. What is missing (checked against the data, 2026-11-21)

| Kind | Live rows | Painted | Prompts here |
|---|---|---|---|
| Great people | 157 | 20 | 137 (age II 45, age III 43, age IV 45, age V 4) |
| Follower beliefs | 17 | 0 | 17 |
| Enhancer beliefs | 16 (2 more are retired) | 0 | 16 |
| Title | 1 | 0 | 3 ideas for the 1 painting |
| Rites | 9 (2 more are retired) | no window | 9, optional |
| Consecrations | 5 (1 more is retired) | no window | 5, optional |

**Complete, no prompt needed:** wonders 34 of 34, leaders 16 of 16 live, governments 13 of 13 live, pantheon beliefs 23 of 23 live, ages 12 of 12 (three sets of four), endings 2 of 2.

**A frame with no painting that was not on the list:** the holy city tablet (Faith sheet and In play screen) has the same arched window as a belief and shows a drawn mark. The code gives it no file slot, so it has no prompt here.

**No picture window, so no prompt:** buildings (the Great Archive and the four faith houses included), improvements, units, technologies, Orders, Doctrines, resources.

**Rites and consecrations** show no picture today. On the Faith sheet they are cards with a glyph (`src/ui/bonusesTab.ts`: only gods, follower beliefs, enhancer beliefs, other faiths and the holy city get the arched window). Their prompts are in section 8 in case a window is added.

**The four people of age V** are live rows, and the game has four ages built. Do them last.

### The 20 people to do first

These are the names a player will look for. They are marked **First 20** below.

Sun Tzu, Leonidas, Thales of Miletus, Hippocrates, Aesop, Julius Caesar, Euclid, Hypatia, Virgil, Sophocles, Zhuge Liang, Spartacus, Leonardo, Michelangelo, Dante Alighieri, Johannes Gutenberg, Copernicus, Filippo Brunelleschi, Dürer, Yi Sun-sin.

## 4. Great people, age II (45, 5:6)

In the order scholars, artists, engineers, merchants, generals. You can stop after any person: the earliest age comes first.

#### Ahmes

Scholar, age II. Egyptian scribe who copied a book of arithmetic, about 1550 BC. No likeness. Save as: `art-masters/people/ahmes.png`.

```text
Ahmes, an Egyptian scribe of the sixteenth century BC, a man of about thirty-five with brown skin, a short black wig and a white linen kilt, seated cross-legged with a papyrus roll across his knees and a reed pen in his hand, a wooden ink palette beside him, low behind him a hall of painted papyrus-shaped columns, white linen and terracotta lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Kidinnu

Scholar, age II. Babylonian astronomer, fourth century BC. No likeness. Save as: `art-masters/people/kidinnu.png`.

```text
Kidinnu, a Babylonian astronomer of the fourth century BC, a man of about fifty with a curled dark beard, a long fringed robe in deep red, a smooth clay tablet in one hand, his other hand raised toward the sky, low behind him the flat brick roof of a temple tower and a pale daytime moon, deep red and sand colours lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Thales of Miletus

Scholar, age II · **First 20**. Greek sage of Miletus, about 600 BC. The ancient busts are imagined. Save as: `art-masters/people/thales_of_miletus.png`.

```text
Thales of Miletus, a Greek sage of the sixth century BC, an old man with a white beard and a bald crown, a plain cream wool cloak, a shallow bronze bowl of water held in both hands, his eyes raised from it to the sky, low behind him the harbour of an Ionian town with two ships with square sails, cream and bronze lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Tapputi

Scholar, age II. Perfume maker in a Mesopotamian palace, about 1200 BC. The first chemist known by name. No likeness. Save as: `art-masters/people/tapputi.png`.

```text
Tapputi, a perfume maker of a Mesopotamian palace about 1200 BC, a woman of about forty with brown skin and dark hair under a headband, a long fringed wool dress in deep blue, pouring oil from a small jar into a clay pot on a low fire, a basket of flowers beside her, low behind her a courtyard of glazed brick, deep blue and orange lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Pāṇini

Scholar, age II. Indian grammarian of Gandhara, about the fifth century BC. No likeness. Save as: `art-masters/people/panini.png`.

```text
Panini, a grammarian of ancient north-west India about the fifth century BC, a man of about fifty with brown skin and hair in a topknot, a white cotton lower garment and an ochre shawl over one shoulder, seated cross-legged, counting on the fingers of one raised hand as he recites, low behind him a great banyan tree and far mountains, white and ochre lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Hippocrates

Scholar, age II · **First 20**. Greek physician of Kos, about 460 to 370 BC. Ancient busts show a bald, bearded old man. Save as: `art-masters/people/hippocrates.png`.

```text
Hippocrates, a Greek physician of the island of Kos in the fifth century BC, a bald old man with a full white beard, a cream cloak over one shoulder, a small bronze cup in one hand and a bundle of green herbs in the other, low behind him a great plane tree and the white terraces of a healing sanctuary above the sea, cream and olive green lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Anaximander

Scholar, age II. Greek philosopher of Miletus, about 610 to 546 BC. No likeness. Save as: `art-masters/people/anaximander.png`.

```text
Anaximander, a Greek philosopher of Miletus in the sixth century BC, a man of about sixty with a grey beard, a blue-grey cloak, bending to set an upright bronze pointer on a smooth round stone dial, watching its shadow, low behind him a rocky headland and the open sea, blue-grey and pale stone lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Baudhāyana

Scholar, age II. Vedic priest and geometer of India, about 800 BC. No likeness. Save as: `art-masters/people/baudhayana.png`.

```text
Baudhayana, a priest and geometer of Vedic India about 800 BC, a man of about forty-five with brown skin, a bare chest with a thread across it, a white lower cloth and hair in a knot, stretching a cord between two wooden pegs across a square platform of fired bricks, low behind him a thatched hall and a river plain, brick orange and white lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Peseshet

Scholar, age II. Egyptian overseer of women physicians, Old Kingdom, about 2400 BC. Only her title is known. Save as: `art-masters/people/peseshet.png`.

```text
Peseshet, an Egyptian physician of the Old Kingdom about 2400 BC, a woman of about forty with brown skin, a shoulder-length black wig, a long white linen dress with wide straps and a turquoise bead collar, a small alabaster jar in one hand and a roll of linen bandage in the other, low behind her a limestone court with date palms, white and turquoise lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Solon

Scholar, age II. Athenian lawgiver and poet, about 630 to 560 BC. The busts are later. Save as: `art-masters/people/solon.png`.

```text
Solon, a lawgiver of Athens about 590 BC, a man of about sixty with a grey beard, a cream cloak wrapped so that one arm rests inside it, his free hand on a waist-high wooden frame that holds plain blank boards, low behind him the bare rock of the Acropolis and olive trees, cream and olive lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Sin-lēqi-unninni

Artist, age II. Babylonian scholar who wrote the standard Epic of Gilgamesh, about 1200 BC. No likeness. Save as: `art-masters/people/sin_leqi_unninni.png`.

```text
Sin-leqi-unninni, a Babylonian scholar and scribe about 1200 BC, a man of about fifty with a squared dark beard and a tall cap, a long fringed robe in ochre, a smooth clay tablet and a reed stylus in his hands, standing on a city wall, low behind him the great brick walls and gate of Uruk, ochre and brick orange lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Ilimilku

Artist, age II. Scribe of Ugarit who wrote down the stories of the storm god, about 1300 BC. No likeness. Save as: `art-masters/people/ilimilku.png`.

```text
Ilimilku, a scribe of a Bronze Age port city in Syria about 1300 BC, a man of about thirty-five with a short beard and a headband, a long wrapped robe with a red and blue border, a smooth clay tablet held against his chest, low behind him a stone harbour town and one dark storm cloud far out over the sea, red and deep blue lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Hesiod

Artist, age II. Greek farmer and poet of Boeotia, about 700 BC. The busts are imagined. Save as: `art-masters/people/hesiod.png`.

```text
Hesiod, a farmer and poet of early Greece about 700 BC, a weathered man of about fifty with a rough beard, a short wool tunic and a sheepskin over his shoulders, leaning on a shepherd's staff held low, a laurel branch in his hand, low behind him a ploughed field with a tiny ox team below a mountain, earth brown and olive lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Aesop

Artist, age II · **First 20**. Teller of fables in Greek tradition, sixth century BC. He may be legend. Save as: `art-masters/people/aesop.png`.

```text
Aesop, a teller of fables in sixth-century BC Greece, a short stooped man of about fifty with a lively lined face, a plain brown tunic, seated on a low stone wall with one hand raised as he tells a story, a tortoise on the wall beside him, low behind him a village well and a vineyard, brown and vine green lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Exekias

Artist, age II. Athenian potter and vase painter, about 540 BC. No likeness. Save as: `art-masters/people/exekias.png`.

```text
Exekias, a potter and vase painter of Athens about 540 BC, a man of about forty with a short beard, a working tunic that leaves one shoulder bare, painting a black figure with a fine brush on a large orange clay jar held on his knee, low behind him a kiln with thin smoke and a shelf of pots, terracotta orange and black lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Telesilla

Artist, age II. Poet of Argos, about 500 BC. Later writers say she armed the women and held the walls. Save as: `art-masters/people/telesilla.png`.

```text
Telesilla, a poet of the Greek city of Argos about 500 BC, a woman of about thirty-five with dark hair bound up, a long pleated dress in deep red, a bronze helmet held under one arm and a small lyre hung at her side, low behind her a stone city wall with tiny women holding spears, deep red and bronze lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Thutmose the Sculptor

Artist, age II. Court sculptor at Amarna, about 1345 BC. The painted head of Nefertiti was found in his workshop. Save as: `art-masters/people/thutmose_the_sculptor.png`.

```text
Thutmose, a court sculptor of Egypt about 1345 BC, a man of about forty-five with brown skin and a shaved head, a white kilt dusted with plaster, a small bronze chisel in his hand, working on a painted limestone head of a queen with a tall flat-topped blue crown on a low stand, low behind him a mud-brick workshop court, blue and cream lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Senenmut

Engineer, age II. Steward and architect of Hatshepsut, about 1470 BC. Statues of him exist. Save as: `art-masters/people/senenmut.png`.

```text
Senenmut, an Egyptian royal steward and architect about 1470 BC, a man of about forty-five with brown skin, a shoulder-length wig and a long white kilt, a coiled measuring cord in his hand, low behind him three long terraces of columns and a ramp below tall orange cliffs, white and orange lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Amenhotep son of Hapu

Engineer, age II. Egyptian official and builder, about 1400 BC. Statues show him as a seated scribe. Save as: `art-masters/people/amenhotep_son_of_hapu.png`.

```text
Amenhotep son of Hapu, an Egyptian royal official of the fourteenth century BC, an old man with brown skin, a long wig and a long linen kilt tied high on the chest, seated as a scribe with a papyrus roll on his knee, low behind him two huge seated stone statues of a king on a flat plain, white and sand colours lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Bezalel

Engineer, age II. The craftsman of the Book of Exodus. A figure of scripture; no likeness. Save as: `art-masters/people/bezalel.png`.

```text
Bezalel, a master goldsmith of the Bronze Age Levant, a man of about forty with a dark beard, a simple knee-length wool tunic in blue, a small hammer in his hand over a sheet of beaten gold on a wooden block, low behind him a goat-hair tent and a desert camp below a bare mountain, gold and deep blue lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Pushyagupta

Engineer, age II. Governor under Chandragupta Maurya who dammed Lake Sudarshana below Mount Girnar, about 320 BC. One rock text names him. No likeness. Save as: `art-masters/people/pushyagupta.png`.

```text
Pushyagupta, a provincial governor of Maurya India about 320 BC, a man of about fifty with brown skin, a moustache and a large white turban, a bare chest, a long white lower cloth and a blue sash, a wooden measuring rod held low, low behind him an earth dam that holds a still lake at the foot of a steep rocky mountain, with green fields below, white and lake blue lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Lu Ban

Engineer, age II. Master carpenter of the state of Lu, about 480 BC. The patron of Chinese builders. No likeness. Save as: `art-masters/people/lu_ban.png`.

```text
Lu Ban, a master carpenter of ancient China about 480 BC, a man of about fifty with hair in a topknot under a cloth, a short belted indigo work robe with the sleeves tied back, a wooden frame saw in one hand and a carpenter's square in the other, low behind him the timber frame of a hall going up, indigo and fresh wood colours lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Anacharsis

Engineer, age II. Scythian prince and sage who came to Athens, about 590 BC. The Greeks credited him with the bellows and the anchor. No likeness. Save as: `art-masters/people/anacharsis.png`.

```text
Anacharsis, a Scythian prince and sage of the sixth century BC, a man of about forty-five with a long fair-brown beard, a soft pointed felt cap with ear flaps, a belted red wool jacket with a patterned edge and trousers, working a leather bellows with both hands over a small clay forge fire, low behind him open grassland with a felt-covered wagon and two horses, red and felt grey lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Artachaees

Engineer, age II. Persian noble who directed the canal of Xerxes through the Athos peninsula, about 480 BC. Herodotus calls him the tallest man in Persia. Save as: `art-masters/people/artachaees.png`.

```text
Artachaees, a Persian noble and engineer of 480 BC, a very tall man of about fifty with a long curled dark beard, a saffron yellow tunic with a purple border and trousers, a surveyor's rod held low, his other arm pointing along the water, low behind him a straight canal through a low neck of land with a tiny warship in it and a far mountain, saffron and purple lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Ineni

Engineer, age II. Egyptian architect to four kings, about 1500 BC. He cut the first royal tomb in the Valley of the Kings. Save as: `art-masters/people/ineni.png`.

```text
Ineni, an Egyptian royal architect about 1500 BC, a man of about fifty-five with brown skin, a short wig and a long white kilt, a rolled papyrus plan held close against his chest with both hands, low behind him a narrow dry valley of pale cliffs with one small dark doorway cut in the rock, white and pale orange lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Sunshu Ao

Engineer, age II. Minister of Chu who built the Peony Dam reservoir, about 600 BC. No likeness. Save as: `art-masters/people/sunshu_ao.png`.

```text
Sunshu Ao, a minister of the state of Chu in ancient China about 600 BC, a man of about fifty with a thin beard, a narrow cap and a long dark red robe with wide sleeves, a bamboo measuring rod in his hand, low behind him a long earth dam that holds a wide still lake above green rice fields, dark red and green lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Kushim

Merchant, age II. Temple accountant of Uruk, about 3300 BC. Perhaps the first person named in writing. Save as: `art-masters/people/kushim.png`.

```text
Kushim, a temple accountant of the Sumerian city of Uruk about 3300 BC, a man of about forty with brown skin and a shaved head, a bare chest and a long tufted wool skirt, a small smooth clay tablet in one hand, tall sealed jars of barley beside him, low behind him a brick temple storehouse with a buttressed wall, sand and barley gold lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Aššur-idī

Merchant, age II. Old Assyrian merchant of the Kanesh letters, about 1900 BC. No likeness. Save as: `art-masters/people/assur_idi.png`.

```text
Assur-idi, a merchant of the city of Assur about 1900 BC, an old man with a white beard, a fringed wool robe wrapped over one shoulder, a small sealed clay letter in his hand, low behind him a string of tiny black donkeys with packs leaving a mud-brick city gate, wool cream and brick orange lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Lamassī

Merchant, age II. Woman of Assur who wove cloth for the trade with Anatolia, about 1900 BC. No likeness. Save as: `art-masters/people/lamassi.png`.

```text
Lamassi, an Assyrian woman of the nineteenth century BC, about forty, with brown skin, a long wrapped wool dress in madder red and a head cloth, a folded bolt of fine cloth over her arm and a small clay letter in her hand, low behind her a mud-brick courtyard with an upright loom, madder red and cream lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Hanno the Navigator

Merchant, age II. Carthaginian captain who sailed down the coast of West Africa, about 500 BC. No likeness. Save as: `art-masters/people/hanno_the_navigator.png`.

```text
Hanno, a sea captain of Carthage about 500 BC, a man of about forty-five with a dark curled beard, a low round cap and a long belted tunic in purple-red, one hand on the high curved stern post of his ship, low behind him rowed ships with square sails along a green coast with one smoking mountain, purple-red and green lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Fan Li

Merchant, age II. Minister of Yue who left court and made three fortunes in trade, fifth century BC. No likeness. Save as: `art-masters/people/fan_li.png`.

```text
Fan Li, a minister and merchant of ancient China in the fifth century BC, a man of about fifty-five with a thin grey beard, a plain blue-grey robe and a straw hat hung on his back, standing in a small flat boat with a pole, a few sacks and jars at his feet, low behind him a wide misty lake with reeds, blue-grey and straw lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Harkhuf

Merchant, age II. Governor of Elephantine who led four caravans into Nubia, about 2250 BC. A relief of him exists. Save as: `art-masters/people/harkhuf.png`.

```text
Harkhuf, an Egyptian governor and caravan leader about 2250 BC, a man of about forty-five with brown skin, a short wig and a white kilt, a long staff held low, an elephant tusk and logs of black ebony beside him, low behind him a file of tiny loaded donkeys among granite boulders by the Nile, white and ebony black lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Colaeus of Samos

Merchant, age II. Ship's master of Samos, blown past the Pillars of Hercules to Tartessos, about 630 BC. No likeness. Save as: `art-masters/people/colaeus_of_samos.png`.

```text
Colaeus, a Greek ship's master of Samos about 630 BC, a sun-browned man of about forty with a short beard, a simple tunic and a felt cap, lifting a silver ingot from a heap of them on the deck, low behind him a square sail and two great rocky headlands with the open western sea between them, silver and sea blue lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Wenamun

Merchant, age II. Egyptian temple agent sent to buy cedar, about 1075 BC. His report may be a story. Save as: `art-masters/people/wenamun.png`.

```text
Wenamun, an Egyptian temple agent about 1075 BC, a thin tired man of about fifty with brown skin and a shaved head, a long pleated linen robe, seated on a coil of rope on a beach with a small wooden shrine box beside him, low behind him a harbour town with stacked cedar logs and two ships, white and cedar red lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Iddin-Marduk

Merchant, age II. Babylonian trader of onions and barley, about 550 BC. Hundreds of his tablets survive. Save as: `art-masters/people/iddin_marduk.png`.

```text
Iddin-Marduk, a trader of Babylon about 550 BC, a stout man of about fifty with a curled beard, a round cap and a long tunic with a fringed ochre shawl, a string of onions in one hand and a smooth clay tablet in the other, low behind him a river barge heaped with onions on a canal with date palms, ochre and onion red lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Ahmose son of Ebana

General, age II. Egyptian naval officer in the wars against the Hyksos, about 1550 BC. No likeness. Save as: `art-masters/people/ahmose_son_of_ebana.png`.

```text
Ahmose son of Ebana, an Egyptian naval officer of the sixteenth century BC, a strong man of about forty with brown skin, a short wig and a white kilt, gold collar necklaces given for courage, a bronze axe held low in his hand, low behind him a river warship with a row of oars on the Nile, gold and white lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Piyamaradu

General, age II. Warlord of western Anatolia who troubled the Hittite kings, thirteenth century BC. His dress is not recorded. Save as: `art-masters/people/piyamaradu.png`.

```text
Piyamaradu, a warlord of the Late Bronze Age on the coast of western Anatolia, a hard man of about forty-five with a dark beard, a bronze scale corslet and a simple conical helmet, a spear held low across his body, low behind him a rocky Aegean coast with beached ships, bronze and sea blue lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Sinuhe

General, age II. The hero of an Egyptian tale, a courtier who fled to the Levant, about 1900 BC. A figure of literature. Save as: `art-masters/people/sinuhe.png`.

```text
Sinuhe, an Egyptian courtier in exile in the Levant about 1900 BC, a man of about forty-five with brown skin and a short beard, a striped wool cloak of the Levant over an Egyptian linen kilt, a bow slung at his shoulder, looking back over the road, low behind him a dry hill road with a few goats, striped red and cream lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Deborah

General, age II. Judge and prophet of the Book of Judges. A figure of scripture; no likeness. Save as: `art-masters/people/deborah.png`.

```text
Deborah, a judge and leader of the hill tribes of ancient Israel, a woman of about fifty in a long wool tunic and a mantle that covers her hair, in undyed cream and deep blue, one hand raised to give judgement, seated, low behind her the trunk and fronds of a date palm on a hill above a wide plain, cream and deep blue lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Fu Hao

General, age II. Shang queen and general, about 1200 BC. Her tomb held bronze axes and jade. No likeness. Save as: `art-masters/people/fu_hao.png`.

```text
Fu Hao, a queen and general of Shang dynasty China about 1200 BC, a woman of about thirty-five with black hair pinned up, a dark red robe with a patterned border and a jade pendant, a broad flat bronze axe held low across her body, low behind her a rammed-earth wall and tiny two-horse chariots, jade green, bronze and dark red lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Sun Tzu

General, age II · **First 20**. Chinese general and author of The Art of War, about 500 BC. No likeness; he may be legend. Save as: `art-masters/people/sun_tzu.png`.

```text
Sun Tzu, a general and writer of ancient China about 500 BC, a calm man of about fifty with a thin beard and hair in a topknot, dark lacquered leather armour laced over a red robe, a rolled book of bamboo slips in one hand, low behind him a misty river valley with tiny ranks of soldiers and banners, red and lacquer black lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Leonidas

General, age II · **First 20**. King of Sparta who held the pass at Thermopylae, 480 BC. No certain likeness. Save as: `art-masters/people/leonidas.png`.

```text
Leonidas, a king of Sparta in 480 BC, a strong man of about fifty-five with long hair and a grey-streaked beard, a bronze breastplate and a red cloak, a bronze helmet with a horsehair crest under one arm, a large round bronze shield at his side, low behind him a narrow pass between steep cliffs and the sea, red and bronze lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Djehuty

General, age II. General of Thutmose III, about 1450 BC. The tale says he took Joppa with soldiers hidden in baskets. Save as: `art-masters/people/djehuty.png`.

```text
Djehuty, an Egyptian general about 1450 BC, a man of about forty-five with brown skin, a short wig, a white kilt and a gold collar, a mace of command held low, one hand on the lid of a great woven basket in a row of them, low behind him the walls of a hill town on the coast, white, gold and basket tan lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Piye

General, age II. King of Kush who conquered Egypt, ruled about 747 to 716 BC. The reliefs of him are damaged. Save as: `art-masters/people/piye.png`.

```text
Piye, a king of Kush of the eighth century BC, a strong man of about forty-five with dark brown skin, a close-fitting cap crown with two cobras at the brow, a broad gold collar, a ram-head pendant and a white kilt, a mace held low, standing at the prow of a river warship, low behind him the Nile with tiny ships and a walled city on the bank, gold and white lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Tomyris

General, age II. Queen of the Massagetae who defeated Cyrus, about 530 BC. No likeness. Save as: `art-masters/people/tomyris.png`.

```text
Tomyris, a queen of the nomads of the Central Asian steppe about 530 BC, a woman of about forty-five with long dark braids, a low pointed felt cap and a red caftan sewn with small gold plaques over trousers, a short bow in a case at her hip, low behind her wide grassland with tiny riders and a river, red and gold lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

## 5. Great people, age III (43, 5:6)

#### Omar Khayyam

Scholar, age III. Persian mathematician, astronomer and poet of Nishapur, 1048 to 1131. No portrait from life. Save as: `art-masters/people/omar_khayyam.png`.

```text
Omar Khayyam, a Persian mathematician and astronomer of Nishapur about the year 1100, a man of about fifty-five with a grey beard, a white turban and a long turquoise robe with a sash, a brass astrolabe in one hand and a small clay wine cup in the other, seated, low behind him a walled garden with a blossoming tree and a far line of snow mountains, turquoise and blossom pink lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Ptahhotep

Scholar, age III. Egyptian vizier and author of maxims, about 2400 BC. No likeness. Save as: `art-masters/people/ptahhotep.png`.

```text
Ptahhotep, an old Egyptian vizier of the Old Kingdom about 2400 BC, a man with brown skin, a shoulder-length wig, a wide bead collar and a long white kilt, a tall staff held low in one hand, the other hand open as he teaches, low behind him a pillared limestone court, white and bead blue lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Hypatia

Scholar, age III · **First 20**. Philosopher and mathematician of Alexandria, died 415. No likeness. Save as: `art-masters/people/hypatia.png`.

```text
Hypatia, a philosopher and mathematician of Alexandria about the year 400, a composed woman of about fifty with olive skin and dark hair with some grey bound up at the back, a pale philosopher's cloak over a long tunic with a deep blue border, a scroll in one hand, low behind her a colonnade, the sea and a far lighthouse, pale cream and deep blue lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Zhang Heng

Scholar, age III. Han scholar who made a device that showed the direction of an earthquake, 78 to 139. No likeness. Save as: `art-masters/people/zhang_heng.png`.

```text
Zhang Heng, a scholar-official of Han China about the year 130, a man of about fifty with a thin beard, a small black cap over a topknot and a wide-sleeved dark robe, one hand on a large bronze jar ringed with small dragon heads, low behind him a tiled observatory terrace, bronze and dark blue lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Eratosthenes

Scholar, age III. Greek scholar of Alexandria who measured the Earth, about 276 to 194 BC. No likeness. Save as: `art-masters/people/eratosthenes.png`.

```text
Eratosthenes, a Greek scholar of Alexandria in the third century BC, a man of about sixty with a grey beard and a cream cloak, crouching to measure the short shadow of an upright staff on the ground with a cord, low behind him a sunlit court with a round stone well, cream and sand lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Maria Hebraea

Scholar, age III. Alchemist of Alexandria, first to third century. The still and the water bath are hers. No likeness. Save as: `art-masters/people/maria_hebraea.png`.

```text
Maria Hebraea, an alchemist of Roman Alexandria about the second century, a woman of about fifty with olive skin, her hair under a plain cloth veil, a long tunic and mantle in deep blue, tending a copper still with three spouts over a small clay furnace, a glass flask in her hand, low behind her flat city roofs, copper orange and deep blue lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Euclid

Scholar, age III · **First 20**. Greek mathematician of Alexandria, about 300 BC. No likeness. Save as: `art-masters/people/euclid.png`.

```text
Euclid, a Greek mathematician of Alexandria about 300 BC, a man of about fifty-five with a grey beard and a bald forehead, a cream cloak, holding up a pair of bronze dividers in one hand and a wooden board with one plain triangle on it in the other, low behind him a long library colonnade and a palm, cream and bronze lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Ban Zhao

Scholar, age III. Han historian who finished the Book of Han, about 45 to 116. No likeness. Save as: `art-masters/people/ban_zhao.png`.

```text
Ban Zhao, a historian and teacher at the court of Han China about the year 100, a woman of about sixty with grey hair in a low knot, layered silk robes with wide sleeves in dark red and cream, a writing brush in her hand over bamboo slips unrolled on a low table, low behind her a hall with shelves of rolled scrolls, dark red and cream lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Qu Yuan

Artist, age III. Poet and minister of the state of Chu, about 340 to 278 BC. No likeness. Save as: `art-masters/people/qu_yuan.png`.

```text
Qu Yuan, a poet and minister of ancient China in the third century BC, a thin man of about sixty with a long thin beard, a tall narrow hat and a long pale robe with very wide sleeves, a spray of orchids in one hand, walking, low behind him a misty river bank with reeds, pale grey-green and cream lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Sima Qian

Artist, age III. Grand Historian of Han China, about 145 to 86 BC. No likeness. Save as: `art-masters/people/sima_qian.png`.

```text
Sima Qian, the court historian of Han China about 100 BC, a man of about fifty-five with a lined, clean-shaven face, a black official's cap and a dark robe with wide sleeves, writing with a brush on a strip of bamboo, bundles of bamboo slips piled beside him, low behind him a plain courtyard with one pine, black and bamboo yellow lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Phidias

Artist, age III. Athenian sculptor, about 480 to 430 BC. No certain likeness. Save as: `art-masters/people/phidias.png`.

```text
Phidias, an Athenian sculptor of the fifth century BC, a strong bald man of about fifty with a beard, a short working tunic that leaves one shoulder bare, a mallet and chisel at rest in his hands, beside him the great sandalled foot of a gold and ivory statue, low behind him the Acropolis far away, ivory and gold lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Virgil

Artist, age III · **First 20**. Roman poet, 70 to 19 BC. A mosaic of him is much later. Save as: `art-masters/people/virgil.png`.

```text
Virgil, a Roman poet about 25 BC, a lean man of about forty-five with short dark hair, clean-shaven, a white toga over a tunic, a scroll resting in one hand, seated on a field wall, low behind him Italian farmland with straw beehives, umbrella pines and a tiny ox team, white and pine green lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Kālidāsa

Artist, age III. Sanskrit poet and playwright of Gupta India, about the fifth century. No likeness. Save as: `art-masters/people/kalidasa.png`.

```text
Kalidasa, a court poet of Gupta India about the fifth century, a man of about thirty-five with brown skin, long hair in a knot and gold earrings, a saffron shawl over a bare shoulder and a white lower cloth, a palm leaf and a stylus in his hands, his face lifted to one great cloud, low behind him a hill terrace with a flowering tree, saffron and white lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Wang Xizhi

Artist, age III. Chinese calligrapher of the Eastern Jin, 303 to 361. No portrait from life. Save as: `art-masters/people/wang_xizhi.png`.

```text
Wang Xizhi, a calligrapher of fourth-century China, a man of about fifty with a thin beard, a loose pale robe with very wide sleeves and a soft gauze cap, a brush held upright over a blank sheet on a low table, low behind him a pavilion by a winding stream with bamboo and two white geese, pale cream and bamboo green lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Cai Yan

Artist, age III. Han poet and musician, taken north by raiders for twelve years, about 200. No likeness. Save as: `art-masters/people/cai_yan.png`.

```text
Cai Yan, a poet and musician of Han China about the year 200, a woman of about thirty-five with black hair in a high knot, dark blue robes with a red border under a fur-trimmed cloak of the north, a long wooden zither across her lap, low behind her open steppe with round felt tents and tiny horses, dark blue and red lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Sophocles

Artist, age III · **First 20**. Athenian playwright, about 497 to 406 BC. Ancient statues exist. Save as: `art-masters/people/sophocles.png`.

```text
Sophocles, an Athenian playwright of the fifth century BC, a dignified old man with a full white beard and a cloth band round his hair, a cream cloak, a theatre mask of painted linen held at his chest in one hand, low behind him the curved stone seats of a hillside theatre, cream and terracotta lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Tiruvalluvar

Artist, age III. Tamil poet and sage, author of the Kural. His dates are uncertain; the usual picture is modern. Save as: `art-masters/people/tiruvalluvar.png`.

```text
Tiruvalluvar, a Tamil poet and sage of early south India, a man of about sixty with brown skin, a long white beard and hair in a top knot, a plain white cloth, seated cross-legged with a palm-leaf book in his left hand and an iron stylus in his right, low behind him a weaver's loom under a thatched roof and coconut palms, white and palm green lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Auvaiyar

Artist, age III. Tamil poet who walked from court to court, early centuries. The stories of her are later. Save as: `art-masters/people/auvaiyar.png`.

```text
Auvaiyar, a wandering Tamil poet of early south India, an old woman with brown skin and white hair in a knot, a plain white cotton wrap, a walking staff in one hand and the other hand raised as she speaks, low behind her a red earth road between two hill forts with tall palmyra palms, white and red earth lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Hemiunu

Engineer, age III. Vizier who directed the building of the Great Pyramid, about 2570 BC. His statue shows a heavy man. Save as: `art-masters/people/hemiunu.png`.

```text
Hemiunu, an Egyptian vizier of the Old Kingdom about 2570 BC, a heavy broad man of about fifty with brown skin and short hair, a white linen kilt, a knotted measuring cord stretched between his hands, low behind him a great pyramid half built with a long ramp and tiny hauling gangs, white and pale limestone lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Li Bing

Engineer, age III. Governor of Shu who built the Dujiangyan river works, about 256 BC. A later statue exists. Save as: `art-masters/people/li_bing.png`.

```text
Li Bing, a governor of the state of Qin in the third century BC, a man of about fifty with a short beard, a dark robe and a flat cap, a measuring rod in his hand, low behind him a wide river divided by a long barrier of stone and bamboo baskets below green mountains, dark blue and river green lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Amanitore

Engineer, age III. Ruling queen of Kush, first century. Temple reliefs at Naqa show her as a broad, strong woman. Save as: `art-masters/people/amanitore.png`.

```text
Amanitore, a ruling queen of Kush in the first century, a powerful broad woman of about forty-five with dark brown skin, a close cap crown with a cobra at the brow, a wide bead collar and a long fringed robe, a coiled measuring cord in one hand, low behind her a small sandstone temple with a tall sloping gateway on a dry plain with acacia trees, gold and sandstone orange lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Cai Lun

Engineer, age III. Han court official who made paper a craft, about 105. No likeness. Save as: `art-masters/people/cai_lun.png`.

```text
Cai Lun, a court official of Han China about the year 105, a clean-shaven man of about fifty in a black official's cap and a dark robe with the sleeves tied back, lifting a wooden screen with a wet blank sheet on it from a vat, low behind him blank sheets drying on a courtyard wall and a mulberry tree, cream and dark blue lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Hero of Alexandria

Engineer, age III. Hero of Alexandria, Greek engineer of the first century, maker of a steam-driven sphere. No likeness. Save as: `art-masters/people/hero_of_alexandria.png`.

```text
Hero of Alexandria, a Greek engineer of the first century, a man of about forty-five with a dark curly beard, a tunic and an ochre cloak, his hand beside a small bronze sphere with two bent nozzles that spins on a stand above a steaming cauldron, low behind him a temple front with tall doors, bronze and ochre lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Gyōki

Engineer, age III. Japanese Buddhist monk who built bridges, roads and ponds, 668 to 749. A later wooden statue exists. Save as: `art-masters/people/gyoki.png`.

```text
Gyoki, a Japanese Buddhist monk of the eighth century, a lean old man of about seventy with a shaved head, a plain grey-brown robe with a dark patched stole, a walking staff held low and a string of wooden beads, low behind him a new wooden bridge across a river with tiny workers who carry baskets of earth, grey-brown and fresh wood colours lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### al-Hasan ibn Sulayman

Engineer, age III. Sultan of Kilwa on the Swahili coast, ruled about 1310 to 1333. No likeness. Save as: `art-masters/people/al_hasan_ibn_sulayman.png`.

```text
Al-Hasan ibn Sulayman, a sultan of the Swahili island port of Kilwa in the fourteenth century, a man of about forty-five with dark brown skin and a short beard, a large white turban, a white robe under an open coat of green silk, a few plain gold coins in one open hand, low behind him a white coral-stone palace with domes above a harbour with a dhow, white and green lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Zheng Guo

Engineer, age III. Engineer sent to Qin as a spy, who built the canal that fed it, about 246 BC. No likeness. Save as: `art-masters/people/zheng_guo.png`.

```text
Zheng Guo, a water engineer in the state of Qin about 246 BC, a man of about forty-five with a thin beard, a plain dark robe tucked up for work and a flat cap, a surveyor's staff with a small cloth flag in his hand, low behind him a long straight canal across a yellow plain with tiny diggers, loess yellow and dark blue lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Nanaivandak

Merchant, age III. Sogdian merchant whose letter home from China was never delivered, about 313. No likeness. Save as: `art-masters/people/nanaivandak.png`.

```text
Nanaivandak, a Sogdian merchant of the fourth century, a man of about forty with a beard, a belted knee-length caftan with a patterned border and a soft pointed cap, a folded letter in his hand, low behind him a mud-brick watchtower on a desert road and two tiny camels, caftan red and sand lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Zoskales

Merchant, age III. Ruler of the Red Sea coast at Adulis, about the year 100. One Greek sailing guide names him. No likeness. Save as: `art-masters/people/zoskales.png`.

```text
Zoskales, a ruler of the Red Sea coast of ancient Eritrea about the year 100, a man of about fifty with dark brown skin and a short beard, a white robe with a red border and a gold headband, one hand on a great elephant tusk beside him, a tortoise shell at his feet, low behind him a bay and a ship with a square sail, white and red lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Crassus

Merchant, age III. The richest man of Rome, about 115 to 53 BC. A bust is thought to show him. Save as: `art-masters/people/crassus.png`.

```text
Crassus, a Roman senator of the first century BC, a lean man of about fifty-five with short grey hair, clean-shaven, a white toga with a wide purple stripe, one hand on the lid of an iron-bound chest, low behind him the columns of the Roman forum, white and purple lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Jang Bogo

Merchant, age III. Korean sea commander and merchant of Silla, died between 841 and 846. The usual picture is modern. Save as: `art-masters/people/jang_bogo.png`.

```text
Jang Bogo, a Korean sea commander and merchant of the ninth century, a strong man of about forty-five with a short black beard and a black cloth cap over a topknot, a coat of small iron plates over a dark blue robe, one hand on his sword hilt, low behind him a wooden fort on a small green island and two merchant ships with ribbed sails, dark blue and iron grey lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Lü Buwei

Merchant, age III. Merchant who put a hostage prince on the throne of Qin and became chancellor, about 250 BC. No likeness. Save as: `art-masters/people/lu_buwei.png`.

```text
Lu Buwei, a merchant and chancellor of the state of Qin about 250 BC, a shrewd man of about fifty with a thin moustache and beard, a rich dark silk robe with a patterned border, holding up a pale green jade disc between his fingers to look at it, low behind him the gate tower of a walled city and tiny wagons, jade green and dark silk lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Anāthapiṇḍika

Merchant, age III. Banker of Shravasti in the time of the Buddha, about the fifth century BC. Known from Buddhist scripture. No likeness. Save as: `art-masters/people/anathapindika.png`.

```text
Anathapindika, a banker of the north Indian city of Shravasti about the fifth century BC, a stout man of about fifty-five with brown skin, a large white turban and gold earrings, a bare chest with a fine white lower cloth and an orange shawl, pouring square gold coins from a cloth bag onto the ground, low behind him a grove of mango trees with an ox cart, orange and white lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Widow Qing of Ba

Merchant, age III. Owner of cinnabar mines in Ba, honoured by the First Emperor, third century BC. No likeness. Save as: `art-masters/people/widow_qing_of_ba.png`.

```text
Widow Qing of Ba, a mine owner of south-west China in the third century BC, a woman of about sixty with grey hair in a low knot, a plain dark robe with a red border, a lump of bright red stone in her open hand, low behind her a steep green mountain with a timbered mine mouth above a river gorge, cinnabar red and green lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Marcus Ulpius Yarhai

Merchant, age III. Marcus Ulpius Yarhai, patron of the desert caravans of Palmyra, second century. Statues were raised to him; none is known to survive. Save as: `art-masters/people/marcus_ulpius_yarhai.png`.

```text
Yarhai, a caravan patron of the desert city of Palmyra in the second century, a man of about fifty with a curled beard, a low round cap, a long tunic with an embroidered central band, loose trousers and a cloak, low behind him a long street of columns in an oasis city with date palms and a line of tiny camels, embroidered red and sand lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Sang Hongyang

Merchant, age III. Han official who set up the state trade in salt and iron, 152 to 80 BC. No likeness. Save as: `art-masters/people/sang_hongyang.png`.

```text
Sang Hongyang, a finance official of Han China about 100 BC, a man of about fifty with a thin beard, a black official's cap and a dark robe, laying out short bamboo counting rods in rows on a low table, low behind him white heaps of salt beside salt pans and the smoke of an iron furnace, salt white and dark blue lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Han Xin

General, age III. Han general who won at Jingxing with his back to a river, 205 BC. No likeness. Save as: `art-masters/people/han_xin.png`.

```text
Han Xin, a general of early Han China about 205 BC, a lean man of about thirty with hair in a topknot, armour of small lacquered plates in dark red and black, a long sword at his belt, low behind him a wide river with tiny ranks of soldiers along the bank and red banners, dark red and black lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Gaius Marius

General, age III. Roman general who reformed the legions, 157 to 86 BC. A bust is thought to show him. Save as: `art-masters/people/gaius_marius.png`.

```text
Gaius Marius, a Roman general about 100 BC, a stern man of about fifty-five with short grey hair, a bronze muscle breastplate and a red cloak, one hand on a silver eagle standard on a pole that stands below shoulder height, low behind him a tiny column of marching soldiers with packs, red and silver lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Spartacus

General, age III · **First 20**. Thracian gladiator who led a slave revolt, died 71 BC. No likeness. Save as: `art-masters/people/spartacus.png`.

```text
Spartacus, a Thracian man of the first century BC, about thirty-five, with short dark hair and a short beard, a plain rough tunic and a wide leather belt, a short curved sword held low, a broken iron chain at his wrist, low behind him the green slope of a volcano above a bay, rough brown and green lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Julius Caesar

General, age III · **First 20**. Roman general and statesman, 100 to 44 BC. Busts from his time exist. Save as: `art-masters/people/julius_caesar.png`.

```text
Julius Caesar, a Roman general and statesman of the first century BC, a lean man of about fifty-five with thin hair, clean-shaven, a sharp face, a laurel wreath, a bronze muscle breastplate and a general's red cloak, one hand on the pommel of his sword, low behind him a small river with a tiny column of soldiers crossing, red and bronze lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Zhuge Liang

General, age III · **First 20**. Chancellor and strategist of Shu Han, 181 to 234. The usual picture is later. Save as: `art-masters/people/zhuge_liang.png`.

```text
Zhuge Liang, a chancellor and strategist of third-century China, a calm man of about forty-five with a long thin beard, a soft dark headcloth, a pale robe with dark borders, a fan of white crane feathers held at his chest, low behind him misty mountains and a wooden camp wall with tiny banners, pale cream and dark blue lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Trưng Trắc

General, age III. Vietnamese leader who raised sixty-five towns against Han rule, 40 AD. No likeness. Save as: `art-masters/people/trung_trac.png`.

```text
Trung Trac, a leader of the Vietnamese rising of the year 40, a woman of about thirty with black hair bound in a cloth, a yellow tunic with a wide belt and bronze armlets, a short sword held low, low behind her the head and back of a war elephant and a green river delta of rice fields, yellow and green lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Modu Chanyu

General, age III. Founder of the Xiongnu empire, ruled about 209 to 174 BC. No likeness. Save as: `art-masters/people/modu_chanyu.png`.

```text
Modu, a ruler of the Xiongnu nomads about 200 BC, a hard man of about forty-five with a long moustache and braided hair, a fur-trimmed felt cap, a belted leather coat with a gold belt plaque, a short curved bow in one hand and one arrow in the other, low behind him wide grassland and a tiny horse herd, leather brown and gold lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Chanakya

General, age III. Minister of the first Maurya emperor, about 300 BC. No likeness. Save as: `art-masters/people/chanakya.png`.

```text
Chanakya, a minister of the Maurya court in India about 300 BC, a thin man of about sixty with brown skin, a shaved head with one long lock at the back, a bare chest with a thread across it and a white cloth, a palm-leaf book under one arm and one finger raised, low behind him the timber wall and gate of a city by a wide river, white and timber brown lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

## 6. Great people, age IV and age V (49, 5:6)

#### Maimonides

Scholar, age IV. Rabbi, philosopher and physician, 1138 to 1204. The usual portrait is much later. Save as: `art-masters/people/maimonides.png`.

```text
Maimonides, a Jewish scholar and physician of twelfth-century Cairo, a man of about sixty with a grey beard, a white turban and a dark blue robe, a bound book open in his hands, low behind him a shaded courtyard in old Cairo with a carved wooden screen, dark blue and white lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Roger Bacon

Scholar, age IV. English friar who wrote on optics and on experiment, about 1220 to 1292. No likeness. Save as: `art-masters/people/roger_bacon.png`.

```text
Roger Bacon, an English Franciscan friar of the thirteenth century, a man of about fifty with a shaved crown, a grey-brown habit with a rope belt, a round glass lens held up to the light in one hand, low behind him a stone study window and the towers of medieval Oxford, grey-brown and pale stone lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Āryabhaṭa

Scholar, age IV. Indian mathematician and astronomer, 476 to 550. No likeness. Save as: `art-masters/people/aryabhata.png`.

```text
Aryabhata, an Indian astronomer about the year 500, a man of about forty with brown skin, a white cotton lower garment and a shawl over one shoulder, standing beside an upright shadow staff and a plain bronze sphere of rings, one hand on a ring, low behind him a brick terrace above a wide river plain, white and bronze lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Paracelsus

Scholar, age IV. Swiss physician and alchemist, 1493 to 1541. Portraits exist. Save as: `art-masters/people/paracelsus.png`.

```text
Paracelsus, a Swiss physician of the early sixteenth century, a stout man of about forty-five with a bald crown, a dark gown with a fur collar, both hands on the round pommel of a long sword that stands point down, low behind him a bench with glass flasks and a small furnace, dark green and glass blue lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Tycho Brahe

Scholar, age IV. Danish astronomer, 1546 to 1601. He had a metal nose. Portraits exist. Save as: `art-masters/people/tycho_brahe.png`.

```text
Tycho Brahe, a Danish nobleman and astronomer of the late sixteenth century, a man of about forty-five with a long moustache and a small brass plate over the bridge of his nose, a wide white ruff and a dark doublet, one hand on a great brass quadrant, low behind him a castle on a flat island, black, white and brass lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### John Dee

Scholar, age IV. English mathematician and astrologer, 1527 to about 1609. A portrait exists. Save as: `art-masters/people/john_dee.png`.

```text
John Dee, an English scholar of the late sixteenth century, an old man with a long pointed white beard, a black skullcap and a black gown with a small white ruff, a polished black stone mirror held in both hands, low behind him a study shelf with books and a globe with no markings, black and white lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Copernicus

Scholar, age IV · **First 20**. Polish canon and astronomer, 1473 to 1543. A portrait exists. Save as: `art-masters/people/copernicus.png`.

```text
Copernicus, a Polish church canon and astronomer of the early sixteenth century, a clean-shaven man of about fifty with dark hair to the jaw, a red jerkin with a fur lining, a small brass model of rings around a central gold ball in his hand, low behind him a brick tower on the wall of a cathedral town by the sea, red and brick orange lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Ibn al-Haytham

Scholar, age IV. Arab scholar of light and sight, about 965 to 1040. No likeness. Save as: `art-masters/people/ibn_al_haytham.png`.

```text
Ibn al-Haytham, a scholar of light in eleventh-century Cairo, a man of about fifty-five with a grey beard, a white turban and a plain dark blue robe, a small wooden box with a pinhole in one hand, a spot of sunlight falling from it onto his other palm, low behind him the flat roofs and domes of Cairo, dark blue and white lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Ibn Khaldun

Scholar, age IV. Historian from Tunis, 1332 to 1406. No portrait from life. Save as: `art-masters/people/ibn_khaldun.png`.

```text
Ibn Khaldun, a historian and judge of fourteenth-century North Africa, a man of about sixty with a full grey beard, a large white turban and a long hooded wool cloak in cream and brown stripes, a thick bound book under one arm, low behind him a mud-brick fort on a hill above a dry plain with a few tiny nomad tents, cream and brown lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Brahmagupta

Scholar, age IV. Indian mathematician who gave rules for zero, 598 to about 668. No likeness. Save as: `art-masters/people/brahmagupta.png`.

```text
Brahmagupta, an Indian mathematician and astronomer of the seventh century, a man of about forty-five with brown skin and a moustache, a white turban and a saffron shawl over one shoulder, placing small shells in rows on a sand counting board with one place left empty, low behind him a stone observatory terrace below a dry hill, saffron and white lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Sei Shōnagon

Artist, age IV. Court lady of Heian Japan and author of The Pillow Book, about 966 to 1025. No likeness. Save as: `art-masters/people/sei_shonagon.png`.

```text
Sei Shonagon, a court lady of Heian Japan about the year 1000, a woman of about thirty with very long black hair, layered silk robes with wide sleeves in plum and pale green, a folded paper book and a brush in her hands, low behind her a palace veranda with rolled bamboo blinds and a garden in light snow, plum and pale green lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Christine de Pizan

Artist, age IV. Court writer in France, 1364 to about 1430. Her own manuscripts show her in a blue gown. Save as: `art-masters/people/christine_de_pizan.png`.

```text
Christine de Pizan, a court writer of France about 1410, a woman of about forty-five in a plain blue gown and a white cloth headdress with two soft points, writing with a quill in a large blank book at a sloped desk, low behind her a stone window that looks on a walled city, blue and white lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Dürer

Artist, age IV · **First 20**. Painter and printmaker of Nuremberg, 1471 to 1528. Self-portraits exist. Save as: `art-masters/people/durer.png`.

```text
Albrecht Durer, a painter and printmaker of Nuremberg about 1500, a man of about thirty with long curled brown hair and a short beard, a coat with a brown fur collar, an engraver's steel tool in his hand over a copper plate, low behind him a workshop window and the steep roofs of a German town, fur brown and copper lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Li Bai

Artist, age IV. Tang poet, 701 to 762. The known pictures are later. Save as: `art-masters/people/li_bai.png`.

```text
Li Bai, a poet of Tang China in the eighth century, a man of about forty-five with a thin beard and moustache, a loose white robe and a soft black cap, raising a small wine cup toward the sky with one hand, low behind him a river with one small boat, far mountains and a pale daytime moon, white and river blue lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Dante Alighieri

Artist, age IV · **First 20**. Florentine poet, 1265 to 1321. Early portraits show a long nose, a red gown and a cap. Save as: `art-masters/people/dante_alighieri.png`.

```text
Dante Alighieri, a Florentine poet about the year 1300, a lean man of about forty-five, clean-shaven, with a long hooked nose, a long red gown and a red cap with ear flaps over a white coif, a closed book held to his chest, low behind him a walled city of towers on a river and a dark wood on a hill, red and white lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Ferdowsi

Artist, age IV. Persian poet of Tus, author of the Book of Kings, about 940 to 1020. No portrait from life. Save as: `art-masters/people/ferdowsi.png`.

```text
Ferdowsi, a Persian poet of the city of Tus about the year 1000, an old man with a long white beard, a white turban and a deep green robe with a sash, a large bound book open on his knee and a reed pen in his hand, low behind him a walled garden with cypress trees and a far snow mountain, deep green and white lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Michelangelo

Artist, age IV · **First 20**. Florentine sculptor and painter, 1475 to 1564. Portraits exist. Save as: `art-masters/people/michelangelo.png`.

```text
Michelangelo, a Florentine sculptor about 1510, a man of about forty with dark curly hair, a short forked beard and a flattened nose, a dusty work shirt with rolled sleeves and a leather apron, one hand flat on a rough block of white marble from which a shoulder is half cut, a chisel in the other hand, low behind him a white marble quarry, marble white and leather brown lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Li Qingzhao

Artist, age IV. Song poet, 1084 to about 1155. No portrait from life. Save as: `art-masters/people/li_qingzhao.png`.

```text
Li Qingzhao, a poet of Song China in the twelfth century, a woman of about forty with black hair in a high knot with one pin, a long narrow-sleeved silk jacket in pale green over a skirt, a sprig of yellow chrysanthemums in one hand, low behind her a wooden lattice window and a garden with a bare plum tree, pale green and yellow lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Hildegard of Bingen

Artist, age IV. German abbess, composer and writer, 1098 to 1179. Manuscripts of her time show her writing. Save as: `art-masters/people/hildegard_of_bingen.png`.

```text
Hildegard of Bingen, a German abbess of the twelfth century, a woman of about sixty in a black habit with a white wimple and a black veil, a wax writing tablet and a stylus in her hands, her face lifted, low behind her a stone abbey with round-arched windows on a hill of vineyards above a river, black, white and vine green lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Su Song

Engineer, age IV. Scholar-official of Song China who built a water-driven clock tower, 1020 to 1101. No portrait from life. Save as: `art-masters/people/su_song.png`.

```text
Su Song, a scholar-official of Song China in the eleventh century, a man of about sixty with a thin grey beard, a black cap with two long straight wings and a red round-collared robe, a toothed bronze wheel in his hands, low behind him a wooden clock tower of several storeys with a bronze sphere of rings on its roof, red and bronze lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Villard de Honnecourt

Engineer, age IV. Travelling draughtsman of northern France, about 1230. No likeness. Save as: `art-masters/people/villard_de_honnecourt.png`.

```text
Villard de Honnecourt, a travelling draughtsman of thirteenth-century France, a man of about thirty-five in a hooded wool tunic in moss green, drawing with a pen in a small parchment book, his eyes on the building, low behind him a cathedral wall with flying buttresses in wooden scaffolding, moss green and pale stone lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Leonardo

Engineer, age IV · **First 20**. Painter and engineer of Florence and Milan, 1452 to 1519. A drawing of an old bearded man is thought to be him. Save as: `art-masters/people/leonardo.png`.

```text
Leonardo da Vinci, an Italian painter and engineer about the year 1500, an old man with long grey hair and a long beard, a soft dark cap and a rose-coloured gown, a small wooden model of a bat-like wing held in both hands, low behind him a workshop loggia and a valley with a winding river, rose and soft grey lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Taqī al-Dīn

Engineer, age IV. Ottoman astronomer and engineer, 1526 to 1585. His observatory in Istanbul was pulled down in 1580. Save as: `art-masters/people/taqi_al_din.png`.

```text
Taqi al-Din, an Ottoman astronomer of the sixteenth century, a man of about fifty with a grey beard, a large white turban and a blue kaftan, a brass astrolabe held up at chest height in one hand, low behind him a domed observatory tower above a city with slim towers, blue and brass lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Johannes Gutenberg

Engineer, age IV · **First 20**. Goldsmith and printer of Mainz, about 1400 to 1468. No portrait from life. Save as: `art-masters/people/johannes_gutenberg.png`.

```text
Johannes Gutenberg, a goldsmith and printer of Mainz about 1450, a man of about fifty with a long forked beard, a fur-trimmed cap and a dark gown, holding up one small piece of metal type between finger and thumb to look at it, low behind him a wooden screw press and plain blank sheets hung to dry, dark brown and paper cream lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Jang Yeong-sil

Engineer, age IV. Korean inventor at the court of King Sejong, about 1390 to 1442. No likeness. Save as: `art-masters/people/jang_yeong_sil.png`.

```text
Jang Yeong-sil, an inventor at the Korean court about 1440, a man of about forty-five with a thin beard, a black court cap with two short side wings and a blue official's robe, kneeling to hold a measuring stick in a tall bronze rain gauge on a stone base, low behind him tiled palace roofs, pines and mountains, blue and bronze lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Filippo Brunelleschi

Engineer, age IV · **First 20**. Florentine architect of the cathedral dome, 1377 to 1446. A death mask exists. Save as: `art-masters/people/filippo_brunelleschi.png`.

```text
Filippo Brunelleschi, a Florentine architect about 1430, a short man of about fifty-five, clean-shaven, in a red hooded cap and a plain dark gown, a wooden model of a ribbed dome held in both hands, low behind him a great eight-sided brick dome half built with wooden cranes, brick red and timber lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Guo Shoujing

Engineer, age IV. Yuan astronomer and water engineer, 1231 to 1316. No portrait from life. Save as: `art-masters/people/guo_shoujing.png`.

```text
Guo Shoujing, an astronomer and water engineer of thirteenth-century China, a man of about sixty with a thin grey beard, a round official's hat and a long blue robe that closes at the side, one hand on a bronze instrument of rings on a carved stand, low behind him a brick observatory tower and a canal with tiny barges, blue and bronze lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Benjamin of Tudela

Merchant, age IV. Jewish traveller from Navarre who recorded the communities he found, about 1170. No likeness. Save as: `art-masters/people/benjamin_of_tudela.png`.

```text
Benjamin of Tudela, a Jewish traveller of twelfth-century Spain, a man of about forty-five with a dark beard, a travelling cloak with a hood in dark blue, a staff in one hand and a small bound notebook in the other, low behind him a road down to a walled Mediterranean port, dark blue and sand lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Ibn Jubayr

Merchant, age IV. A traveller from Valencia who wrote of his pilgrimage, 1145 to 1217. No likeness. Save as: `art-masters/people/ibn_jubayr.png`.

```text
Ibn Jubayr, a traveller and writer from Muslim Spain about 1185, a man of about forty with a dark trimmed beard, a white turban and a dark wool travelling cloak over a pale robe, a notebook and a reed pen in his hands, standing at a ship's rail, low behind him a blue sea and a white port city, white and sea blue lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Francesco Datini

Merchant, age IV. Merchant of Prato, 1335 to 1410. Portraits show a red gown and cap. Save as: `art-masters/people/francesco_datini.png`.

```text
Francesco Datini, an Italian cloth merchant about 1400, a man of about sixty with a grey fringe of hair, a long red gown and a red cap, an account book open in his hands, low behind him an arched warehouse front with bales of cloth, red and cloth cream lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Jakob Fugger

Merchant, age IV. Banker of Augsburg, 1459 to 1525. A portrait shows a gold cap. Save as: `art-masters/people/jakob_fugger.png`.

```text
Jakob Fugger, a German banker about 1520, a lean clean-shaven man of about sixty, a close-fitting cap of gold cloth and a black coat with a fur collar, one hand on a closed ledger, low behind him a counting office with a tall cabinet of small plain drawers, gold and black lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Willem Beukelszoon

Merchant, age IV. Fisherman of Zeeland who is said to have found how to cure herring at sea, fourteenth century. No likeness. Save as: `art-masters/people/willem_beukelszoon.png`.

```text
Willem Beukelszoon, a fisherman of the medieval Low Countries, a weathered man of about fifty in a wool hood and a rough tunic, a small knife in one hand and a silver herring in the other, an oak barrel beside him, low behind him a broad fishing boat on a grey-blue sea, grey-blue and silver lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Gracia Mendes Nasi

Merchant, age IV. Jewish banker from Portugal who moved to Antwerp, Venice and Constantinople, 1510 to 1569. No certain portrait. Save as: `art-masters/people/gracia_mendes_nasi.png`.

```text
Gracia Mendes Nasi, a wealthy widow and banker of the sixteenth century, a woman of about fifty in a dark Renaissance gown with a high collar and a fine veil over her hair, a sealed letter in her hand, low behind her a window on a strait with ships and a city of domes, dark wine red and white lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Jacques Cœur

Merchant, age IV. A merchant of Bourges and treasurer to the king of France, about 1395 to 1456. A portrait exists. Save as: `art-masters/people/jacques_coeur.png`.

```text
Jacques Coeur, a French merchant about 1445, a clean-shaven man of about fifty with hair cut in a bowl shape, a rich red gown edged with fur and a draped cloth hat, a sealed purse in one hand and gloves in the other, low behind him a stone house with a steep roof and a turret and a tiny merchant galley in a harbour, red and slate blue lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Aḥmad ibn Mājid

Merchant, age IV. Master pilot of the Indian Ocean, from Oman, about 1432 to 1500. No likeness. Save as: `art-masters/people/ahmad_ibn_majid.png`.

```text
Ahmad ibn Majid, an Arab master pilot of the Indian Ocean about 1490, a sun-browned man of about fifty-five with a grey beard, a wrapped turban and a long white robe with a sash, holding a small wooden board on a knotted cord out toward the horizon, low behind him the deck and great triangular sail of a dhow, white and sea green lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Fatima al-Fihri

Merchant, age IV. Founder of the mosque and school of al-Qarawiyyin in Fez, 859. The story comes from later writers. Save as: `art-masters/people/fatima_al_fihri.png`.

```text
Fatima al-Fihri, a merchant's daughter of ninth-century Fez, a woman of about forty in a long deep green robe and a large white veil that covers her hair, a ring of iron keys in one hand, low behind her a courtyard of horseshoe arches with green tiled roofs and a fountain, deep green and white lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Jan Žižka

General, age IV. Czech general of the Hussite wars, about 1360 to 1424. Blind in one eye, later in both. Save as: `art-masters/people/jan_zizka.png`.

```text
Jan Zizka, a Czech commander of the early fifteenth century, an old heavy man with a grey moustache and a cloth patch over one eye, a fur cap, a mail collar over a padded coat, a mace held low in his hand, low behind him a line of armoured farm wagons on a hilltop, padded brown and iron grey lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### El Cid

General, age IV. Castilian knight who took Valencia, about 1043 to 1099. No likeness. Save as: `art-masters/people/el_cid.png`.

```text
El Cid, a Castilian knight of the eleventh century, a man of about fifty with a full dark beard, a long mail coat, a round helmet with a nose bar under one arm, a long shield with a pointed foot at his side, low behind him the walls of a sunlit city near the sea, iron grey and sun orange lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Nzinga of Ndongo

General, age IV. Queen of Ndongo and Matamba, about 1583 to 1663. The known pictures are later European prints. Save as: `art-masters/people/nzinga_of_ndongo.png`.

```text
Nzinga, a queen of seventeenth-century Angola, a dignified Central African woman of about fifty with dark brown skin, fine wrapped cloths in red and white, bead necklaces and a small crown-like cap, a ceremonial axe held low, seated upright, low behind her green highlands above a wide river, red and green lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Yi Sun-sin

General, age IV · **First 20**. Korean admiral, 1545 to 1598. The standard portrait is modern. Save as: `art-masters/people/yi_sun_sin.png`.

```text
Yi Sun-sin, a Korean admiral of the late sixteenth century, a calm man of about fifty with a thin beard, a coat of fabric armour with rows of round brass studs in dark red, a helmet with a small red tassel under one arm, low behind him an armoured warship with a covered roof among green islands, dark red and brass lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Lautaro

General, age IV. Mapuche war leader, about 1534 to 1557. No likeness. Save as: `art-masters/people/lautaro.png`.

```text
Lautaro, a young Mapuche war leader of sixteenth-century Chile, a man of about twenty-two with brown skin and long black hair held by a woven headband, a dark wool poncho with a pale stepped pattern, a long lance held low, low behind him a forest of tall umbrella-shaped pines below a snow volcano and one horse, dark blue and snow white lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Belisarius

General, age IV. Byzantine general under Justinian, about 500 to 565. A mosaic may show him. Save as: `art-masters/people/belisarius.png`.

```text
Belisarius, a Byzantine general of the sixth century, a man of about forty-five with a short dark beard, a gilded scale cuirass and a white cloak fastened at the right shoulder with a brooch, a plumed helmet under one arm, low behind him the land walls of a great city with square towers and a few tiny horsemen, white and gold lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Gajah Mada

General, age IV. Prime minister of Majapahit, died about 1364. The usual face is a modern guess. Save as: `art-masters/people/gajah_mada.png`.

```text
Gajah Mada, a prime minister of the Javanese kingdom of Majapahit in the fourteenth century, a broad strong man of about fifty with brown skin, a bare chest, hair in a top bun, gold armbands and a patterned lower cloth with a wide sash, one fist on his chest, low behind him a split gateway of red brick and a sea with tiny ships, brick red and gold lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Amina of Zazzau

General, age IV. Hausa warrior queen of Zazzau, sixteenth century. The sources are later chronicles and oral tradition. Save as: `art-masters/people/amina_of_zazzau.png`.

```text
Amina, a warrior queen of the Hausa city of Zazzau in the sixteenth century, a woman of about forty with dark brown skin, a wrapped indigo head cloth and long indigo robes under a quilted armour coat, a straight sword held low, low behind her a high mud-brick city wall with a gate and a horse in quilted armour, indigo and clay orange lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Tlacaelel

General, age IV. Chief counsellor to three Mexica rulers, about 1397 to 1487. The sources are from after the conquest. Save as: `art-masters/people/tlacaelel.png`.

```text
Tlacaelel, a chief counsellor of the Mexica in the fifteenth century, an old man with brown skin and a lined face, hair bound up, a turquoise-blue cloak knotted at one shoulder and jade ear plugs, a fan of green feathers held at his chest, low behind him a twin-shrine pyramid in an island city on a lake, turquoise and green lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Bashō

Artist, age V. Japanese poet and traveller, 1644 to 1694. Pictures by his pupils exist. Save as: `art-masters/people/basho.png`.

```text
Basho, a Japanese poet and traveller of the seventeenth century, a thin man of about fifty with a shaved head, a plain dark robe like a monk's, a walking staff in his hand and a wide woven hat hung on his back, low behind him a narrow road through pines and a broad-leafed banana plant, ink grey and leaf green lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Sor Juana

Artist, age V. Poet and scholar, a nun in Mexico City, 1648 to 1695. The portraits are later. Save as: `art-masters/people/sor_juana.png`.

```text
Sor Juana, a nun and scholar of seventeenth-century Mexico City, a woman of about forty in a white habit with a black veil and a large round painted medallion on her chest, a quill in her hand over a blank page, low behind her a convent cell with tall shelves of books, white and black lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Vaucanson

Engineer, age V. French maker of automata, 1709 to 1782. Portraits exist. Save as: `art-masters/people/vaucanson.png`.

```text
Jacques de Vaucanson, a French inventor of the eighteenth century, a man of about forty in a powdered wig and a plain blue coat, one hand on a life-size mechanical duck of gilded copper on a stand, low behind him a workshop with a tall window and a bench of small gears, blue and gilded copper lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Gustavus Adolphus

General, age V. King of Sweden, 1594 to 1632. Portraits exist. Save as: `art-masters/people/gustavus_adolphus.png`.

```text
Gustavus Adolphus, a king of Sweden in the Thirty Years' War, a large fair man of about thirty-five with a pointed blond beard and moustache, a pale leather coat with a wide lace collar and a blue sash, one hand on a light field cannon, low behind him a northern plain with tiny ranks of soldiers, pale leather and blue lead, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

## 7. Follower beliefs (17, 1:1)

The window is an arch, so the top corners are cut. Each subject sits in the centre and the lower two thirds.

#### Cathedrals of the Sky

Follower belief. Temples give science and culture. Save as: `art-masters/beliefs/cathedrals_of_the_sky.png`.

```text
a tall pointed stone vault on four slim pillars with no walls, open to the sky, one tall cumulus cloud seen through it, cream stone with a salmon-orange sunlit side, it stands in the centre and lower two thirds with plain sky above, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Pilgrimage

Follower belief. Faith for followers in a town. Save as: `art-masters/beliefs/pilgrimage.png`.

```text
a wooden walking staff with a water gourd tied to it, planted upright beside a white road that winds to one small shrine on a far hill, the staff in the centre, cream road and sand-coloured ground, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Feast Days

Follower belief. Happiness for each city that follows. Save as: `art-masters/beliefs/feast_days.png`.

```text
a round golden loaf, a clay jug and a bowl of red fruit on a small table with a vermilion cloth, a green garland hung along its front edge, vermilion and gold lead, plain sky above, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Holy Water

Follower belief. More food in towns on fresh water. Save as: `art-masters/beliefs/holy_water.png`.

```text
a wide round stone basin on a short pedestal, full of still blue water with one ripple ring in the middle, a small clay cup on its rim, cream stone and deep blue water, plain sky above, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Lamps of the Shrine

Follower belief. Shrines give science. Save as: `art-masters/beliefs/lamps_of_the_shrine.png`.

```text
three small brass oil lamps with steady flames hanging on chains inside one plain round stone arch, the inside of the arch dark blue-violet, brass and flame orange lead, the arch in the centre and lower two thirds, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Choirs

Follower belief. Culture for citizens of a city that follows. Save as: `art-masters/beliefs/choirs.png`.

```text
five small singers in long cream robes standing in a row on one stone step, seen from far away, heads lifted, simple shapes with no features, long blue-violet shadows behind them, plain sky above, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Tithe Houses

Follower belief. Gold for citizens of a city that follows. Save as: `art-masters/beliefs/tithe_houses.png`.

```text
a tall stone barn with a steep roof and one great arched door, three full grain sacks and a wooden measuring tub beside the door, cream stone and terracotta roof, plain sky above, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### The Quiet Hours

Follower belief. Faith buildings give culture and happiness. Save as: `art-masters/beliefs/the_quiet_hours.png`.

```text
one bronze bell hanging still in a small stone arch on a flat roof, a thin cap of snow on the arch, one white dove resting on top, bronze and cream lead, the arch in the centre and lower two thirds, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Warrior Monks

Follower belief. Defenders of a city that follows are stronger. Save as: `art-masters/beliefs/warrior_monks.png`.

```text
a wooden staff and a plain round shield leaning beside a heavy closed monastery gate with iron studs in a high cream wall, the gate dark brown, the shield vermilion, plain sky above the wall, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Harvest Blessing

Follower belief. More food on farms. Save as: `art-masters/beliefs/harvest_blessing.png`.

```text
a wide woven basket full of grain ears and orange fruit on the ground at the edge of a ripe gold field, one green sprig laid across the top, gold and orange lead, plain sky above, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Guild of the Faithful

Follower belief. Buildings are made faster. Save as: `art-masters/beliefs/guild_of_the_faithful.png`.

```text
a mason's wooden square and a mallet resting on a cut cream stone block, a piece of wooden scaffolding and half of a round stone arch behind it, cream stone and timber brown lead, plain sky above, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Common Table

Follower belief. A city keeps food when it grows. Save as: `art-masters/beliefs/common_table.png`.

```text
a long plain wooden table seen from one end, a row of clay bowls along each side and one round loaf at the near end, timber brown and terracotta lead, plain sky above the far end, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Minarets

Follower belief. Unlocks the Mosque. Save as: `art-masters/beliefs/minarets.png`.

```text
one slim tall round tower with a small balcony near the top and a plain pointed cap, rising above low flat roofs and one small dome, the sunlit side salmon-orange and the shadow side blue-violet, no symbol on it, the tower in the centre, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Temple Spires

Follower belief. Unlocks the Wat. Save as: `art-masters/beliefs/temple_spires.png`.

```text
one gilded temple spire of many narrowing tiers rising from steep layered orange roofs above round dark green trees, gold and orange lead, no symbol on it, the spire in the centre, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### The Open Kitchen

Follower belief. Unlocks the Gurdwara. Save as: `art-masters/beliefs/the_open_kitchen.png`.

```text
a great round iron cooking pot on a low fire with a long ladle in it, white steam rising, a stack of round flat breads on a cloth beside it, iron black, flame orange and bread gold lead, plain sky above, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### The Eternal Flame

Follower belief. Unlocks the Dar-e Mehr. Save as: `art-masters/beliefs/the_eternal_flame.png`.

```text
a tall bronze fire vessel shaped like an urn with a steady flame, on a stone stand of three steps under a small plain canopy on four pillars, bronze and flame orange lead, no symbol on it, the canopy in the centre and lower two thirds, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### The Alms Box

Follower belief. Faith buys more in towns that follow. Save as: `art-masters/beliefs/the_alms_box.png`.

```text
a small wooden box with a coin slot in its lid on a stone ledge beside an open dark doorway, one gold coin lying on the lid, timber brown and gold lead, cream wall, plain sky above the wall, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

## 8. Enhancer beliefs (16, 1:1)

#### Reliquaries

Enhancer belief. Culture from the faith you make. Save as: `art-masters/beliefs/reliquaries.png`.

```text
a small gold casket with a pointed lid and one round crystal window in its front, on a plain stone shelf, a folded vermilion cloth under it, gold and vermilion lead, plain sky above, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Inquisition

Enhancer belief. Rival religions press your temple towns at half strength. Save as: `art-masters/beliefs/inquisition.png`.

```text
a tall empty judge's chair of dark wood with a high straight back on a stone platform of two steps, a closed book on its seat and one lit candle on the step, dark brown and candle orange lead, plain sky above, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### The Long Road

Enhancer belief. Your religion presses harder along roads and trade routes. Save as: `art-masters/beliefs/the_long_road.png`.

```text
a two-wheeled cart with a round cream cloth cover standing on a long straight pale road that runs to the horizon, seen from behind, a small lamp hung at its back, cream and sand lead, wide plain sky above, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Itinerant Preachers

Enhancer belief. Towns that follow press your religion further. Save as: `art-masters/beliefs/itinerant_preachers.png`.

```text
a pair of worn leather sandals, a walking staff and a small cloth bundle laid on a dusty pale road, the road goes on to a far hill, leather brown and dust cream lead, plain sky above, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### The Pulse of Bells

Enhancer belief. A proclamation reaches further and presses harder. Save as: `art-masters/beliefs/the_pulse_of_bells.png`.

```text
one large bronze bell swung far to one side in an open wooden frame on a bare hilltop, its clapper in mid-swing and the rope flying, bronze and timber lead, the bell in the centre and lower two thirds, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Ecclesia

Enhancer belief. Each holy site gives faith for towns that follow. Save as: `art-masters/beliefs/ecclesia.png`.

```text
a ring of nine low stone seats around one flat round stone in the middle, on a bare green hilltop, seen from a little above, cream stone and sage green lead, long blue-violet shadows, plain sky above, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Apostles

Enhancer belief. Faith buys apostles for less. Save as: `art-masters/beliefs/apostles.png`.

```text
twelve small robed figures walking in one line along the ridge of a hill against the sky, each with a staff, seen from far away, simple shapes with no features, cream robes on a dark olive ridge, plain sky above, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Sacred Cartography

Enhancer belief. Trade routes press your religion at both ends. Save as: `art-masters/beliefs/sacred_cartography.png`.

```text
a wide unrolled sheet of parchment on a wooden table, painted with plain blue sea shapes and cream land shapes and nothing else, a pair of brass dividers standing on it, two small stones on its corners, cream and blue lead, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Holy Order

Enhancer belief. Unlocks Knights Templar, bought with faith. Save as: `art-masters/beliefs/holy_order.png`.

```text
a plain straight sword standing point down in a square stone block, a white cloak hung over its hilt and falling to the ground, steel grey and white lead, long blue-violet shadow, plain sky above, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Congregation

Enhancer belief. Faith for every town in the world that follows. Save as: `art-masters/beliefs/congregation.png`.

```text
a crowd of many small figures seen from behind, all facing one tall bright open doorway in a cream wall, warm light from the door on their heads, simple shapes with no features, the door in the centre, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Pilgrims' Coin

Enhancer belief. Gold for every city in the world that follows. Save as: `art-masters/beliefs/pilgrims_coin.png`.

```text
a small leather purse lying open on a worn stone step with a few plain gold coins spilled beside it, a pilgrim's staff leaning on the wall behind, leather brown and gold lead, plain sky above the wall, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### World Church

Enhancer belief. Culture for every empire that follows you. Save as: `art-masters/beliefs/world_church.png`.

```text
two different towers on two low hills, one round with a dome and one square with a pointed roof, joined by one high stone bridge of a single arch, cream and salmon-orange stone, no symbol on them, plain sky above, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### The Long Prayer

Enhancer belief. Culture for citizens in the world who follow you. Save as: `art-masters/beliefs/the_long_prayer.png`.

```text
one small kneeling robed figure seen from behind on a flat roof, before a large low round orange sun, a small mat under the figure, the figure dark blue-violet against the sun, the sun in the centre, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### The Crusade

Enhancer belief. Your units are stronger in foreign land that follows you. Save as: `art-masters/beliefs/the_crusade.png`.

```text
one tall plain white banner on a lance planted in the ground on a bare hill, the cloth streaming to the right, a small walled town far below, white and sand lead, no mark on the banner, plain sky around it, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Marvels of the Faith

Enhancer belief. Science and culture for cities that follow and hold a wonder. Save as: `art-masters/beliefs/marvels_of_the_faith.png`.

```text
one great cream dome half hidden in wooden scaffolding with a wooden crane on its top, a block of stone hanging from the crane's rope, cream and timber brown lead, the dome in the centre and lower two thirds, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### The Scriptoria

Enhancer belief. Science for faith buildings in a city that follows you. Save as: `art-masters/beliefs/the_scriptoria.png`.

```text
a sloped wooden writing desk with a large open book of blank cream pages, a quill standing in an inkhorn and one lit candle on its ledge, timber brown and cream lead, a small arched window of sky behind, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

## 9. Title screen (3 ideas for 1 painting, 16:9)

- The game shows about 5:2 of the picture, cut from the middle of its height. About a seventh is lost at the top and at the foot.
- The name, a small ornament and the tag line sit on the left part of the sky, over a soft dark fade.
- This is the largest picture in the game. Upscale it.

#### The magister's table

Themes: the master of the game, the abacus of beads, the ruler's table of cards, the star chart. Quiet space: the whole upper left is plain sky. The table sits in the middle band, right of centre. Nothing important is in the top seventh or the bottom seventh. Save the one you keep as: `art-masters/title/title.png`.

```text
a high stone terrace above a long coast, in the middle band and right of centre a wide stone table that holds a tall wooden abacus with rows of gold and lapis beads, a fan of five plain blank cards and a small bronze sphere of rings, one small robed figure seen from behind stands at the table, far below a coast with four small cities of different building traditions, the upper left half of the picture is open plain deep ultramarine sky with one pale daytime crescent moon, towering clouds only at the far right, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm late-afternoon sun from the left, cream and salmon-orange stone, blue-violet shadows, deep ultramarine sky, towering apricot-lit cumulus clouds, dark olive cypress and pines, matte, very little fine detail --ar 16:9 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### The long count of ages

Themes: the four ages in one view. It repeats the four forms of the age paintings (stone, gate, tower, sphere). Quiet space: the forms grow from left to right, so the left half of the sky is empty above the low standing stone. The title sits there. All four forms are in the middle band. Save the one you keep as: `art-masters/title/title.png`.

```text
a wide plain with a level horizon in the middle band, four forms stand along it from left to right and grow taller, at the far left one small rough standing stone, then a stone gate of two pillars and a lintel, then a round tower of five storeys of arches, and at the right a great golden sphere of open rings on a dark stone tower, one straight pale road joins all four, no people, the upper left half of the picture is open plain deep ultramarine sky, towering clouds only behind the tower and the sphere at the right, a few accents of gold, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm late-afternoon sun from the left, cream and salmon-orange stone, blue-violet shadows, deep ultramarine sky, towering apricot-lit cumulus clouds, dark olive cypress and pines, matte, very little fine detail --ar 16:9 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### The Great Work at dusk

Themes: the Magnum Opus as the way to win, and the star chart. A dusk picture, so it uses the shorter style words that the dusk age paintings used. Quiet space: the upper left is deep dusk sky with a few small stars, the darkest and calmest part. The tower and its glow are right of centre in the middle band. Save the one you keep as: `art-masters/title/title.png`.

```text
a round stone tower with a domed roof on a hill, right of centre in the middle band, its open top holds a glowing glass vessel on a furnace that lights the dome gold from inside, a great brass sphere of rings on the terrace beside it, one small robed figure on the terrace seen from behind, a sleeping town of small domes and towers along the valley below, dusk just after sunset, a band of orange at the horizon under a deep ultramarine and violet sky, the upper left half of the picture is open plain dark sky with seven small four-pointed cream stars and a thin crescent moon, the furnace glow and the gold are the brightest things, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, matte, very little fine detail, a few tall cumulus clouds lit orange from below at the far right --ar 16:9 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

## 10. Optional: rites and consecrations (no picture window today)

#### Rite of the Harvest

Rite, no picture window today. Food hexes give more food.

```text
three tall ears of wheat tied with a red cord and a small clay bowl of milk on a flat field stone at the edge of cut stubble, gold and cream lead, plain sky above, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Omen Reading

Rite, no picture window today. Science for each building in the town.

```text
five dark birds flying in a line above one bare forked staff planted on a hilltop, a shallow bronze bowl at the foot of the staff, bronze and blue-violet lead, wide plain sky, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Consecration of the Bounds

Rite, no picture window today. Luxury hexes give culture and the borders grow faster.

```text
one squat boundary stone with a green garland round it at the corner of a field, a single ploughed furrow running from it straight to the horizon, cream stone and earth brown lead, plain sky above, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Blessing of Arms

Rite, no picture window today. The town defends better.

```text
a plain bronze helmet on a square stone block, a small bowl of oil beside it and a green laurel sprig laid across the helmet, bronze and green lead, plain sky above, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Rite of Plenty

Rite, no picture window today. Resource hexes give gold.

```text
a tall heaped pile of melons, grapes, figs, pomegranates and round loaves on a low round table with a gold cloth, orange, purple and gold lead, plain sky above, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Rite of Fasting

Rite, no picture window today. The town does not grow, and gains science and culture.

```text
one empty clay bowl and one empty cup on a bare wooden table, a single thin lit candle between them, timber brown and cream lead, a long blue-violet shadow, wide plain sky above, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Votive Offering

Rite, no picture window today. Faith becomes production.

```text
a lit candle, one gold coin and a small clay figure standing in a row at the foot of a wooden scaffold pole, a mason's cut stone behind them, candle orange and cream lead, plain sky above, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Restoring of the Host

Rite, no picture window today. Heals your units in land that follows your religion.

```text
a round stone spring basin full of blue water with a clean white cloth over its rim, a bronze helmet and a round shield set down beside it, white and blue lead, plain sky above, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Rite of the Sabbath

Rite, no picture window today. The town builds nothing and gains its production as culture.

```text
a cold blacksmith's anvil with the hammer laid across it, a closed wooden shutter behind and one white dove sitting on the anvil's horn, iron black and white lead, plain sky above, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### The Scholars' Crypt

Consecration, no picture window today. Science for followers in the city.

```text
a short flight of stone steps going down to a dark round-arched crypt door, three stacked books and a small lit lamp on the top step, cream stone and lamp orange lead, plain sky above, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### The Choir Loft

Consecration, no picture window today. Culture for followers in the city.

```text
a small wooden balcony on two stone brackets high on a cream wall, a music stand with an open blank book on it and a row of five plain wooden pipes behind, timber brown and cream lead, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### The Treasury of Relics

Consecration, no picture window today. Gold for faith buildings in the city.

```text
an open iron-bound wooden chest on a stone floor, in it a gold cup, a small gold casket and a folded red cloth, gold and red lead, the lid leaning back, plain sky above, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### The Masons' Chapel

Consecration, no picture window today. Wonders are made faster in the city.

```text
a tiny chapel of cut cream stone with its roof half done, a plumb line hanging in its open doorway and a trowel on the step, a wooden ladder against the wall, cream and timber lead, plain sky above, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### The Eternal Flame

Consecration, no picture window today. Faith for followers in the city.

```text
one steady flame in a deep round-topped niche in a cream stone wall, black soot above the niche and a small clay jug of oil on the ledge below it, flame orange and cream lead, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

## 11. What I am unsure of

- **The style reference and the values.** They are not in the repo or in the transcript. Only the user has them.
- **Likenesses.** Most of these people have no portrait from life. The age and the face in each prompt are my choice for a dignified figure.
- **Dress of the less recorded people.** Tapputi, Peseshet, Kushim, Piyamaradu, Ilimilku, Lamassī, Widow Qing, Yarhai, Auvaiyar, Amina, Tlacaelel, Anacharsis, Artachaees, Pushyagupta, Zoskales and Anāthapiṇḍika are described from their place and period.
- **Dates.** They are the usual ones, from memory. Many are approximate.
- **Names in a prompt.** If Midjourney refuses a name or gives a modern face, delete the name. The rest of the subject part still describes the person.
