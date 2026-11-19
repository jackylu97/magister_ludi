# Splash art brief: every painting the game needs, with Midjourney prompts

Written 2026-11-19. Keep this page open while you generate. It has three parts: the style in words, a checklist of every painting, and a prompt for each one.

- The 34 wonder paintings are done. They are the style reference for all other paintings.
- 170 more paintings have a place in the game. The first set is 79 of them. Each place has a stand-in, so no screen waits for art.
- For the ages there are four directions. The first is your idea: four abstract paintings of mankind's progress, in three versions (section 5).
- Each prompt is in a box that you can copy. A prompt has a subject line for that item, then the style words, then the parameters for its shape.
- The prompts do not include a style reference. Add your own (`--sref`) as section 2 says.
- This document changes no game data. The style ruling of record is `docs/splash-art.md`. The file rules are in `public/art/splash/README.md`.

## 1. The style

This is a description of the wonder paintings as they are. It is not a guess at the prompt that made them.

The paintings are in `public/art/splash/wonders/`. Good ones to look at: `hagiaSophia.jpg`, `pyramids.jpg`, `theOracle.jpg`, `terracottaArmy.jpg`, `stonehenge.jpg`, `greatMosqueOfDjenne.jpg`.

| Part | What the paintings show |
|---|---|
| Medium | Flat gouache or tempera, like a mid-century travel illustration. The colour is matte and opaque. You can see paper grain or a fine speckle in the flat areas (clear in `terracottaArmy`). The clouds have short, dry brush marks (clear in `hagiaSophia`). |
| Drawing | Simplified planes with hard edges. No outlines. Very little fine detail: a window is one dark shape, a tree is three or four shapes. Buildings look carved from blocks. |
| Sky | Deep ultramarine and lapis. It is darkest at the top and a little lighter near the horizon. Some paintings have one pale diagonal band of light across the sky (`hagiaSophia`, `machuPicchu`). |
| Clouds | Tall, sculpted cumulus clouds. The sun side is apricot and cream. The shadow side is violet-grey. They stand behind the subject and make its outline clear. |
| Stone and ground | Cream, sand and salmon-orange in the light. Strong orange-red where the light is low (`forbiddenCity`, `statueOfZeus`). The pyramids are almost white. |
| Shadows | Blue-violet, with hard edges. They are long, because the sun is low. A shadow is a flat shape, not a soft blur. |
| Plants | Dark olive-green cypress, pines and round shrubs. The sun side has a warm rim. They frame the picture at the bottom corners. |
| Light | Late afternoon. One sun, low, from one side (the left in most of them). Warm light, cool shadow. |
| Composition | One monument. A low viewpoint, so the monument stands against the sky. The sky takes a third to a half of the picture. Dark plants or rock at the bottom corners. |
| People | None, or a few tiny figures with no faces (`greatMosqueOfDjenne`). The Terracotta Army shows statues, in silhouette. |

The six palette anchors from `docs/splash-art.md` agree with the paintings:

| Anchor | Hex | Where you see it in the paintings |
|---|---|---|
| Vermilion and orange | `#e8542a` `#f08a2e` | Stone in low sun, palace walls, the warm side of clouds |
| Lapis and ultramarine | `#2c3e9e` `#3f5fd0` | The sky, the shadows |
| Gold | `#d9a521` | Small accents: a finial, a roof ridge |
| Cream paper | `#efe3c8` | Stone in full light, the tops of clouds |
| Sage and olive | `#8fae4a` `#6f8f3a` | Grass in the light |
| Deep teal-green | `#1f5c55` | Cypress, pines, shrubs in shadow |

### The long style block

Use this when you have no style reference, or when a set drifts away from the look.

```text
flat gouache and tempera painting on cream paper with visible paper grain, matte opaque colour, shapes built from simplified hard-edged planes, no outlines, very little fine detail, deep ultramarine and lapis sky that is darkest at the top, towering sculpted cumulus clouds lit apricot and cream on the sun side and violet-grey in shadow, cream, sand and salmon-orange stone in low warm late-afternoon sunlight from the left, long hard-edged blue-violet cast shadows, dark olive-green cypress, pines and round shrubs with warm rims, low viewpoint, one clear subject, calm and still, no people or only a few tiny figures
```

### The short style block

Use this with a style reference. Every landscape prompt below ends with it.

```text
flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm late-afternoon sun from the left, cream and salmon-orange stone, blue-violet shadows, deep ultramarine sky, towering apricot-lit cumulus clouds, dark olive cypress and pines, matte, very little fine detail
```

### The portrait style block

Portraits are new for this style: the wonder paintings have no faces. This block keeps the medium and the light, and adds the face. Every leader and great person prompt ends with it.

```text
flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail
```

### The emblem style block

For beliefs. One object, plain space around it.

```text
one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail
```

### Words to keep out of a prompt

- **poster**, **print**, **card**, **cover**, **framed**: these words often add lettering, a border or a frame. The style blocks say "painting" for this reason.
- **cinematic**, **film still**, **widescreen**: these words can add black bars at the top and bottom.
- **detailed**, **intricate**, **realistic**, **8k**: these words work against the flat planes.
- **illustration of a game**, **concept art**: these words pull the picture toward a glossy digital look.

## 2. How to hold the style in Midjourney

Parameter names and default values change between Midjourney versions. I describe only parameters that I am sure exist. Check the current Midjourney documentation before a long session.

### The order of a prompt

1. The subject, in plain descriptive phrases. Put the most important thing first.
2. The setting.
3. The light and the time of day.
4. The style block.
5. The parameters, at the end.

### The parameters

| Parameter | What it does | How to use it here |
|---|---|---|
| `--ar W:H` | Sets the shape of the picture. | Use one shape for each set: `16:9`, `3:4`, `5:6`, `3:1`, `1:1`, `21:9`. |
| `--sref` + image | A style reference. Midjourney copies the look of the image, not its subject. | Give it one to three wonder paintings (upload them or use their URLs). Use the same ones for a whole set. |
| `--sw` + number | The weight of the style reference. | If the style drifts, increase it. If domes or pyramids from the reference appear in the new picture, decrease it. I believe the range is 0 to 1000 and the default is 100; check this. |
| `--no` + words | Tells Midjourney what to leave out. Words are separated by commas. | Every prompt below ends with one `--no` list against text, borders and black bars. |
| `--stylize` or `--s` | How much of Midjourney's own taste is added. | Find a value that works, then keep it the same for the whole set. |
| `--style raw` | Less of Midjourney's own taste. | Try it if the pictures come out glossy, soft or too detailed. |
| `--chaos` or `--c` | How different the four results are from each other. | Keep it low for a set that must match. Increase it when you want new ideas for a composition. |
| `--seed` + number | Starts the picture from the same noise. | It makes two runs of one prompt more alike. It does not hold a place or a face reliably. Do not depend on it. |
| An image at the start of the prompt, with `--iw` | An image prompt. Midjourney copies content and composition from the image. | Use it for the four ages, to keep the same place (section 5). |
| `--tile` | Makes a repeating pattern. | Not needed. |

### Steps for a set

1. Choose two or three wonder paintings as the style reference. For landscapes I recommend `hagiaSophia` (clouds and a city), `pyramids` (flat planes) and `theOracle` (plants and a small building).
2. Generate one item. Adjust the style weight and `--stylize` until it looks like the wonders. Write the values down.
3. Use the same reference, the same values and the same shape for all other items of that kind.
4. For portraits: make the first portrait that you like. I recommend a person whose dress has large, simple shapes, such as Mansa Musa or Pachacuti. Then add that portrait as a second style reference for all other portraits. The wonder paintings alone can put a monument where the face must be.
5. If personalization is on in your account, keep it the same for the whole set, or turn it off. It changes the style.

### The same person in two paintings

- You do not need this for most of the work.
- A person can be a leader and also a great person (Ibn Battuta is). One painting can do both: paint the 3:4 portrait and cut the 5:6 picture from it. A 5:6 window cut from a 3:4 picture loses 10% of the height.
- If you want the same face in a second painting, Midjourney has a character reference (`--cref`, with `--cw` for its weight). In recent versions an omni reference (`--oref`, with `--ow`) replaces it. The name depends on the version; check before you use it.

### Size

- The wonder paintings are about 1456 pixels wide. This is Midjourney's size for 16:9 without an upscale.
- This size is enough for the small windows: an age (720 px wide), an ending (496 px), a leader (330 px), a great person (150 px), a government (330 px) and a belief (62 px).
- Two places are large: the full-screen wonder plate and the title. For these, use Midjourney's upscale, or export larger. A 2x upscale gives about 2900 pixels of width.
- Keep the largest file as the master. The game files are made smaller from it.

### Text, borders and black bars

- Some of the wonder masters have a black border. Wide shapes and the words in section 1 ("Words to keep out") cause most of them.
- Each prompt ends with `--no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark`.
- If a good picture has a border or some lettering, use Midjourney's editor to repaint that region, or cut it off.
- For wonders, `scripts/splashArt.py` cuts a black border off (at most a fifth of each side) and then cuts the middle to 16:9. The script does not handle the other kinds yet.

## 3. The checklist

| Kind | Shape | Count | Where it shows | Crop notes | Game folder and file name | Priority |
|---|---|---|---|---|---|---|
| Wonders | 16:9 | 34, done | The full-screen wonder plate (about 1100 px wide). The In play screen. A 60 by 34 px thumbnail in the city. | The In play screen cuts a 2:1 window from the centre. Nothing important in the top 6% or the bottom 6%. | `wonders/<wonder id>.jpg`. Wired. | Done |
| Ages | 16:9 | 4 | A 720 by 405 px window on a lapis ribbon over the map, when the world's age changes. | The age numeral and name are printed over the bottom third of the window. Keep the bottom third dark and simple. | `ages/age1.jpg` to `age4.jpg` | 1 |
| Endings | 16:9 | 2 | A 496 by 279 px window. The win is on a lapis page with the sun mark. The loss is on dark cloth with the moon mark. | Centre the subject. The loss is a dusk picture. | Proposed: `endings/win.jpg`, `endings/loss.jpg` | 1 |
| Leaders | 3:4 | 16 | Setup and diplomacy, up to 330 by 440 px. Smaller copies of 132 px and 48 px. A 28 px circle in lists. | Head in the upper middle. Plain sky behind the head, so that the small circle shows a face. | `leaders/<leader id>.jpg`, for example `pachacuti.jpg` | 2 |
| Great people | 5:6, arched top | 78 (20 first) | The great person card in the offer and in the Reliquary, 150 by 180 px. | The top of the window is a round arch. Keep the head below the top fifth. Keep the two top corners empty. | Proposed: `people/<person id>.jpg` | 3 |
| Governments | 3:1 | 13 | A banner of 330 by 110 px on the government's card. | Long and thin, and small. Three to five large shapes along a level horizon. | Proposed: `governments/<government id>.jpg` | 4 |
| Beliefs | 1:1, shown round | 56 (23 first) | A round vignette on a belief tablet. The fourth mock-up shows it at 62 px. The older plan said 120 px. | One object in the centre. The circle cuts all four corners. | `beliefs/<belief id>.jpg` | 5 |
| Title | 21:9 | 1 | The top of the title screen, full width (1000 by 412 in the mock-up). The title and "a game for the ages" are printed on the left. | Keep the left 45% simple and a little dark. Put the subject on the right. | Proposed: `title/title.jpg` | When convenient |

- Masters go in `art-masters/<kind>/` at the repo root. Git ignores that folder. Any file name is fine there.
- Game files go in `public/art/splash/<kind>/`. Only wonders are wired. The folders marked "proposed" do not exist yet; the builder can change the names.
- The mock-up table says the title is "16:9, shown wide". The banner in the mock-up is about 2.4 to 1, so I recommend 21:9. A 16:9 picture works too: the game then cuts a band from it.
- `public/art/splash/README.md` asks for 2560 by 1440 for an age. That was written before the ribbon ruling. The ribbon window is 720 px wide, so 1456 px is enough.

### Totals

| Kind | Needed | First set | Later |
|---|---|---|---|
| Ages | 4 | 4 | 0 |
| Endings | 2 | 2 | 0 |
| Leaders | 16 | 16 | 0 |
| Great people | 78 | 20 | 58 |
| Governments | 13 | 13 | 0 |
| Beliefs | 56 | 23 | 33 |
| Title | 1 | 1 | 0 |
| **Total** | **170** | **79** | **91** |

- Great people: `data/greatPeople.json` has 86 rows. 8 are retired (Senenmut, Kushim, Aššur-idī, Sima Qian, Han Xin, Shen Kuo, Snorri Sturluson, and Zheng He as a great person). 78 are live.
- Beliefs: `data/religion.json` has 23 live pantheon beliefs (the gods), 17 follower beliefs and 16 live enhancer beliefs. 3 rows are retired (The Living Rock, Theocratic Mandate, The Promised Land).
- Rites (11) and consecrations (6) have no art slot.
- Ages: four ages are built. A fifth age is planned and not built. If it is built, it needs a fifth painting.

### Recommended order

1. **Ages and endings.** Six paintings for six large moments. Every player sees them.
2. **Leaders.** Sixteen portraits. They are on the first screen of every game.
3. **The first 20 great people.**
4. **Governments.** Thirteen banners.
5. **Beliefs.** The 23 gods first.
6. **The title**, when you have a picture that you like. A good age painting can stand in until then.

## 4. Composition rules for each shape

| Shape | Do | Do not |
|---|---|---|
| 16:9 (ages, endings) | Keep the subject inside the middle 2:1 band. Leave the top 6% and the bottom 6% as plain sky and plain ground. For an age, keep the bottom third dark and simple, because words are printed there. | Do not put a tower top, a sun or a moon at the very top edge. |
| 3:4 (leaders) | Three-quarter view, eyes level, chest up. Plain sky behind the head. The setting is low in the frame, at the height of the shoulders. One strong light from the left, so that the face is two or three flat shapes. | Do not put a building, a banner or a hat brim behind or over the face. Do not use a profile or a view from below. |
| 5:6 arched (great people) | Half length. Head in the middle of the frame. Plain sky in the top fifth and in both top corners. The tool or object of the person is low, near the hands. | Do not let a headdress, a spear or a tower go into the top fifth. |
| 3:1 (governments) | A frieze: a procession, a row of seated people, a skyline, a wall with a gate. Shapes along the whole width. A level horizon. People are small silhouettes. | Do not use one tall monument (the shape cuts it), one face in the centre, or a deep corridor in perspective. |
| 1:1 round (beliefs) | One object in the centre, at 50% to 60% of the width. Plain sky or plain ground around it. It must read at the size of a coin. | Do not use a scene, a horizon with many things, or anything important in a corner. |
| 21:9 (title) | Subject on the right. A large, simple sky on the left for the title. | Do not put a bright cloud or a building in the left 45%. |

- Quiet edges on every picture: no important thing touches an edge.
- No text, no lettering, no borders, no frames, no black bars.
- People are dignified. Dress, buildings and landscape are correct for the person and the period. No caricature.

## 5. Ages (4, 16:9)

There are four directions. The first is your idea of 2026-11-19: "four abstract paintings that represent mankind's progress in each age", tied "to the unlocks and goals in each age". It comes in three versions, each with four ready prompts. The one valley (direction A) and the two others follow it.

### What each age is

The names and numerals are the ones the age plate prints. The unlocks are from `data/techs.json`. The goals are from the card-design skill's `age-goals.md`.

| Age | Name | Main unlocks | The player's goal | The one idea of the painting |
|---|---|---|---|---|
| I | The Age of Omens | Agriculture, Husbandry, Pottery, Mining, Stonecraft, Bronzeworking, Casting, The Wheel, Sailing, Calendar, Divination, Writing | Claim. Settle three or four towns, explore, find faith, reach the first government. | The first mark. People read the sky, plant a seed and stand a stone up. |
| II | The Age of Heroes | Currency, Code of Laws, Surveying, Chronology, Cataloguing, Optics, Irrigation, Wayfinding, Epic Poetry, The High Temple, Bronze Panoply, Siegecraft. Traders and prophets. The first great people. | Commit. Choose a plan: conquest, religion, trade or growth. | The measure. The coin, the law, the straight line, and one named person. |
| III | The Age of Empire | Engineering, Mathematics, Mechanics, Horology, Iron Working, The Silk Road, The Saddle, Shipwrights, Guildhalls, The Civil Service, Satrapies, Papermaking, Printing, Medicine, Theology | Grow into it. Tall or wide: roads, aqueducts, courthouses, large armies. | The network. Many parts joined into one: roads, arches, wheels. |
| IV | The Age of Cathedrals | The Astrolabe, Natural Philosophy, Scholarship, Alchemy, Chemistry, Machinery, Steel, Movable Type, Paper Money, The Counting Houses, Gunfounding. Universities, observatories, banks. The Magnum Opus. | Decide the game. Build the Magnum Opus, guard it, or stop its builder. | The Great Work. The heavens are measured and lead becomes gold. |

### The abstract direction (your idea): rules for all three versions

- The pictures keep the look of the wonder paintings: flat gouache, hard-edged planes, grained paper, one warm light, and the same palette (lapis, cream, salmon-orange, apricot, olive, blue-violet).
- **Each set is a sequence.** Three things change from age I to age IV in every set: the time of day (dawn, midday, late afternoon, dusk with the first stars), the amount of gold (none, a little, more, the most), and the size or number of the forms. The prompts say this, so that a set holds together.
- 16:9. Keep the subject in the middle 2:1 band.
- The ribbon prints the numeral and the name of the age over the bottom of the window. Each prompt asks for a dark, plain bottom third.
- **Abstract prompts often produce fake writing, numerals and small signs.** Three things prevent it. One: these prompts have a longer `--no` list. Two: do not use the words "diagram", "chart", "map", "manuscript", "symbol", "sign", "rune", "alphabet" or "inscription" in the prompt. Three: name plain objects and plain shapes, and say "blank", "plain" or "smooth" for a tablet, a sheet of paper or a coin.
- To keep a set consistent: generate age III first (it has the light of the wonder paintings). Then use it as a style reference, and as an image prompt with a low weight, for the other three. Keep the wonder paintings as a style reference too.
- If the wonder paintings put a building into a still life or a geometric picture, decrease `--sw`.

**My pick: take 3**, the one great form. It is the nearest to the wonder paintings, so the style reference helps, and one large form still reads in the 720 px window on the ribbon. Take 1 shows the unlocks most directly, but its small objects are hard to read at that size; take 2 is the most abstract and the most likely to produce fake signs.

### Take 1: a still life of each age's instruments

The tools and materials that the age opens, on a dark stone ledge against the sky. No people. In the sequence, the objects go from rough to fine and from few to many.

#### Age I, Omens: still life at dawn (`age-still-1`)

Shows: Agriculture (the sheaf and sickle), Pottery (the jar), Stonecraft (the stone), The Wheel, Writing (the blank tablet), Bronzeworking (the sickle blade). No gold.

```text
a still life of four large simple objects standing in a row on a stone ledge against an open sky, a rough upright stone slab, a tall plain clay jar, a sheaf of wheat with a bronze sickle leaning on it, a solid wooden cart wheel, and one small smooth blank clay tablet with a reed lying on it, no people, in the lower third a wide dark blue-violet stone ledge, plain and empty at its front edge, dawn, the sun still below the horizon, a pale pink and apricot band low in a deep ultramarine sky, cool blue-violet shadows, earth colours and cream only, no gold, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, matte, very little fine detail --ar 16:9 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark, numerals, numbers, glyphs, symbols, runes, diagram
```

#### Age II, Heroes: still life at midday (`age-still-2`)

Shows: Currency (the coins), Code of Laws (the scales), Surveying (the cord and weight), Optics (the lens), Cataloguing and Epic Poetry (the scrolls), Bronze Panoply (the helmet). A little gold.

```text
a still life of six large simple objects on a stone ledge against an open sky, a pair of bronze balance scales, a short stack of plain gold coins, a bronze helmet with a tall crest, three rolled scrolls tied with red cord, a knotted measuring cord with a hanging bronze weight, a round clear crystal lens on a small stand, no people, in the lower third a wide dark blue-violet stone ledge, plain and empty at its front edge, midday, high bright sun, short hard blue-violet shadows, cream and bronze with a few small accents of gold, deep ultramarine sky with tall white cumulus clouds, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, matte, very little fine detail --ar 16:9 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark, numerals, numbers, glyphs, symbols, runes, diagram
```

#### Age III, Empire: still life in late afternoon (`age-still-3`)

Shows: Engineering (the arches), Mechanics (the gears), Horology (the water clock), Papermaking and Printing (the blank sheets and the wooden block), The Silk Road (the silk), Iron Working (the tongs). More gold.

```text
a still life of eight large simple objects close together on a stone ledge against an open sky, a model of three stone arches, two large toothed wooden gears that mesh, a bronze water clock of two stacked vessels, a tall stack of blank cream paper sheets with a plain wooden block on top, a folded bolt of orange silk, a pair of iron tongs, a gold cup and a gold chain, no people, in the lower third a wide dark blue-violet stone ledge, plain and empty at its front edge, several accents of gold, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm late-afternoon sun from the left, cream and salmon-orange stone, blue-violet shadows, deep ultramarine sky, towering apricot-lit cumulus clouds, dark olive cypress and pines, matte, very little fine detail --ar 16:9 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark, numerals, numbers, glyphs, symbols, runes, diagram
```

#### Age IV, Cathedrals: still life at dusk (`age-still-4`)

Shows: Alchemy and Chemistry (the alembic and furnace), The Astrolabe, Natural Philosophy (the ring sphere), Steel (the blade), Paper Money and The Counting Houses (the ingots), the Magnum Opus (lead beside gold). The most gold.

```text
a still life of many fine instruments crowded on a stone ledge against a dusk sky, in the centre a tall glass alembic on a small brick furnace with glowing orange coals, a large brass astrolabe, a brass sphere of open rings, a bright steel blade, a dull grey lead ingot beside three bright gold ingots, glass flasks, the furnace glow and the gold are the brightest things in the picture, no people, in the lower third a wide dark blue-violet stone ledge, plain and empty at its front edge, dusk just after sunset, a band of orange at the horizon under a deep ultramarine and violet sky with the first few stars, objects in blue-violet shadow with warm gold rims, much gold, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, matte, very little fine detail --ar 16:9 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark, numerals, numbers, glyphs, symbols, runes, diagram
```

### Take 2: geometric abstraction

Shape and colour only, like early twentieth-century abstract painting, in the palette and the medium of the wonders. In the sequence, one circle grows and turns to gold: a small cream sun, a gold disc, a wheel, a great gold sphere.

#### Age I, Omens: the first mark (`age-geo-1`)

Shows: Calendar and Divination (the sun circle and the arc of small circles, the days), Agriculture (the row of seed shapes), Stonecraft and Writing (the one upright stroke). No gold.

```text
abstract painting of flat geometric shapes, no objects, no people, large calm shapes with wide plain areas between them, the lower third one plain dark blue-violet band, three kinds of shape only: one small cream circle low above the dark band like a rising sun, one tall narrow vermilion upright rectangle standing on the dark band, and one level row of seven small seed-shaped ovals, a thin arc of five small pale circles high in the sky, dawn colours, a pale pink and apricot band low in a deep ultramarine field, cream, vermilion and blue-violet only, no gold, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, matte, very little fine detail --ar 16:9 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark, numerals, numbers, glyphs, symbols, runes, diagram
```

#### Age II, Heroes: the grid and the measured line (`age-geo-2`)

Shows: Surveying and Irrigation (the grid and the straight line with even marks), Currency (the gold disc), Code of Laws (the balanced triangle), Chronology (the even spacing). A little gold.

```text
abstract painting of flat geometric shapes, no objects, no people, large calm shapes with wide plain areas between them, the lower third one plain dark blue-violet band, a square grid of nine cream and salmon-orange rectangles like the blocks of a town, one perfectly straight thin pale line that crosses the whole picture with small squares at even distances along it, one gold disc larger than a rising sun, one cream triangle balanced on its point, midday colours, bright cream and salmon-orange on a deep ultramarine field, short hard blue-violet shadow shapes, one accent of gold, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, matte, very little fine detail --ar 16:9 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark, numerals, numbers, glyphs, symbols, runes, diagram
```

#### Age III, Empire: the wheel and the network (`age-geo-3`)

Shows: Mechanics and Engineering (the wheels and the row of arches), The Silk Road and Satrapies (the straight lines that spread to the edges), Guildhalls and The Civil Service (many parts joined). More gold.

```text
abstract painting of flat geometric shapes, no objects, no people, large calm shapes with wide plain areas between them, the lower third one plain dark blue-violet band, one large wheel of eight spokes in the centre with a gold hub, five smaller circles around it joined to it and to each other by straight pale lines that spread to the edges of the picture like roads, a row of seven repeating round arches along the top of the dark band, small gold dots where the lines meet, many shapes, late afternoon colours, salmon-orange, apricot and cream on a deep ultramarine field, long hard blue-violet shadow shapes, several accents of gold, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, matte, very little fine detail --ar 16:9 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark, numerals, numbers, glyphs, symbols, runes, diagram
```

#### Age IV, Cathedrals: the sphere, the orbit and the gold (`age-geo-4`)

Shows: The Astrolabe and Natural Philosophy (the sphere and its rings), Alchemy and the Magnum Opus (the grey triangle that becomes a gold circle). The most gold.

```text
abstract painting of flat geometric shapes, no objects, no people, large calm shapes with wide plain areas between them, the lower third one plain dark blue-violet band, one great gold sphere that fills the height of the sky, three thin pale elliptical rings around it with a small sphere on each ring, at the lower left a row of three shapes that change from a dull grey triangle to an orange square to a small gold circle, a few small four-pointed cream stars, dusk colours, deep indigo and violet field with a band of orange at the bottom of the sky, the gold sphere is the brightest thing, much gold, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, matte, very little fine detail --ar 16:9 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark, numerals, numbers, glyphs, symbols, runes, diagram
```

### Take 3 (my pick): one great form for each age

A flat plain with a low horizon, and one great form on it. It is half a view and half an emblem. In the sequence, the form grows taller in each age, from a quarter of the height of the picture to almost all of the sky.

#### Age I, Omens: the standing stone (`age-form-1`)

Shows: Stonecraft (the stone), Calendar and Divination (the stone under the last stars, in line with the rising sun), Agriculture (the one furrowed field). The form is a quarter of the height. No gold.

```text
a wide flat plain with a low level horizon, the lower third of the picture a plain dark blue-violet foreground, one single rough standing stone in the centre, a quarter of the height of the picture, a small fire at its foot, one small furrowed field beside it, no buildings, no people, dawn, the sun just under the horizon exactly behind the stone, a pale pink and apricot band low in a deep ultramarine sky with the last few stars at the top, cool blue-violet shadows, cream and earth colours, no gold, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, matte, very little fine detail, a few low clouds lit pink from below --ar 16:9 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark, numerals, numbers, glyphs, symbols, runes, diagram
```

#### Age II, Heroes: the gate and the straight road (`age-form-2`)

Shows: Surveying and Code of Laws (the straight road and the gate that all must pass), Currency and Wayfinding (the road to the sea and the one sail), The High Temple (the gilded lintel). The form is half the height. A little gold.

```text
a wide flat plain with a low level horizon, the lower third of the picture a plain dark blue-violet foreground, one great stone gate of two tall pillars and a lintel in the centre, half the height of the picture, a perfectly straight pale road that runs from the foreground through the gate to the horizon, a thin line of sea at the horizon with one small square sail, the lintel of the gate is gilded, no people, midday, high bright sun, short hard blue-violet shadows, cream and sand-coloured stone, deep ultramarine sky with tall white cumulus clouds, one accent of gold, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, matte, very little fine detail --ar 16:9 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark, numerals, numbers, glyphs, symbols, runes, diagram
```

#### Age III, Empire: the tower of many storeys (`age-form-3`)

Shows: Engineering and Mathematics (the storeys of arches), The Silk Road and Satrapies (the roads that spread from the foot), Guildhalls and The Civil Service (many storeys, one tower). The form is three quarters of the height. More gold.

```text
a wide flat plain with a low level horizon, the lower third of the picture a plain dark blue-violet foreground, one great round tower of seven storeys in the centre, three quarters of the height of the picture, each storey a ring of round arches, the tower rises through towering cumulus clouds, five straight pale roads spread from its foot across the plain to the horizon, a long aqueduct on arches far away, the top storey is gilded, no people, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm late-afternoon sun from the left, cream and salmon-orange stone, blue-violet shadows, deep ultramarine sky, towering apricot-lit cumulus clouds, dark olive cypress and pines, matte, very little fine detail, several accents of gold --ar 16:9 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark, numerals, numbers, glyphs, symbols, runes, diagram
```

#### Age IV, Cathedrals: the great sphere at dusk (`age-form-4`)

Shows: The Astrolabe and Natural Philosophy (the sphere and its rings among the stars), Alchemy and Chemistry (the furnace glow), the Magnum Opus (the gold). The form fills the sky. The most gold.

```text
a wide flat plain with a low level horizon, the lower third of the picture a plain dark blue-violet foreground, one great golden sphere of open rings on a tall dark stone tower in the centre, the sphere and tower together fill almost the whole height of the sky, the sphere glows from inside like a furnace and lights the plain around the foot of the tower, small domes at the foot of the tower, no people, dusk just after sunset, a band of orange at the horizon under a deep ultramarine and violet sky, a thin crescent moon and the first stars, the tower in blue-violet shadow with warm rims, much gold, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, matte, very little fine detail, tall cumulus clouds lit orange from below --ar 16:9 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark, numerals, numbers, glyphs, symbols, runes, diagram
```

The one valley and the two other directions follow. They are as they were.

### Direction A: one place, painted four times

- The same valley and bay from the same viewpoint, at four stages and at four times of day.
- Three landmarks are in all four pictures: **the hill** (flat-topped, on the left), **the river mouth** (in the middle, where the river meets a small bay) and **the headland** (rocky, on the right).
- The buildings are from no one culture. This agrees with the frame of the game: magisters from every part of the world.
- The bottom third is a dark slope with plants, for the printed words.

#### Age I, Omens: dawn (`age-1`)

A camp and standing stones. Dawn light is cool, with a first band of pink.

```text
wide view from a high dark grassy slope looking down a valley to the sea, a flat-topped hill on the left, a river winding through the middle to a river mouth and a small bay, a rocky headland on the right, sea horizon one third down from the top, dark olive pines and shrubs along the bottom, a ring of tall standing stones on the flat hill, a small camp of hide tents and reed huts at the river mouth with thin smoke rising, dugout canoes on the shore, a signal fire on the headland, wild grassland, dawn, the sun just below the sea horizon, pale pink and apricot band low in a deep ultramarine sky, long cool blue-violet shadows, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, matte, very little fine detail, towering cumulus clouds lit pink from below --ar 16:9 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Age II, Heroes: midday (`age-2`)

A walled town with temples. The light is high and bright; the shadows are short.

```text
wide view from a high dark grassy slope looking down a valley to the sea, a flat-topped hill on the left, a river winding through the middle to a river mouth and a small bay, a rocky headland on the right, sea horizon one third down from the top, dark olive pines and shrubs along the bottom, a walled town of mud-brick and pale stone on the flat hill with a stepped temple at its top, a small harbour at the river mouth with a stone quay and three galleys with square sails, a stone beacon tower on the headland, small fields and orchards in the valley, midday, high bright sun, short hard blue-violet shadows, cream and sand-coloured stone, deep ultramarine sky, tall white and cream cumulus clouds, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, matte, very little fine detail --ar 16:9 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Age III, Empire: late afternoon (`age-3`)

A dense city, in the light of the wonder paintings.

```text
wide view from a high dark grassy slope looking down a valley to the sea, a flat-topped hill on the left, a river winding through the middle to a river mouth and a small bay, a rocky headland on the right, sea horizon one third down from the top, dark olive pines and shrubs along the bottom, a great dense city that fills the valley, a palace with colonnades and tiled roofs on the flat hill, an aqueduct on arches across the valley, two stone bridges over the river, a crowded harbour at the river mouth with many ships and a long market quay, a tall lighthouse on the headland, towers of several different building traditions, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm late-afternoon sun from the left, cream and salmon-orange stone, blue-violet shadows, deep ultramarine sky, towering apricot-lit cumulus clouds, dark olive cypress and pines, matte, very little fine detail --ar 16:9 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Age IV, Cathedrals: dusk (`age-4`)

Domes, spires and an observatory. The first stars and a thin moon. Lamps in the windows.

```text
wide view from a high dark grassy slope looking down a valley to the sea, a flat-topped hill on the left, a river winding through the middle to a river mouth and a small bay, a rocky headland on the right, sea horizon one third down from the top, dark olive pines and shrubs along the bottom, the same great city at dusk, a domed observatory on the flat hill, domes, spires, slim towers and tiered roofs across the valley, small warm lamp-lit windows, a lit lighthouse on the headland with its light on the water, ships at anchor at the river mouth, dusk just after sunset, a band of orange at the sea horizon under a deep ultramarine and violet sky, a thin crescent moon and the first few stars, buildings in blue-violet shadow with warm rims, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, matte, very little fine detail, tall cumulus clouds lit orange from below --ar 16:9 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

### How to keep the place the same

1. Generate age III first. It uses the light of the wonder paintings, so it is the easiest to match. Make many and choose the one with the clearest hill, river mouth and headland.
2. Put that picture at the start of the other three prompts as an image prompt. Keep the style reference too. The image prompt holds the layout; the words change the buildings and the time of day.
3. If the new picture is too much like age III, decrease the image weight (`--iw`). If the place changes, increase it.
4. Expect to choose the best of several for each age. The landmarks will not match exactly. Three clear landmarks in the same positions are enough for the eye.
5. If one landmark is wrong in a good picture, repaint that region in Midjourney's editor.

### Direction B: four places, one for each age

Four different places from four parts of the world. Each picture is easier to make, and each is like a wonder painting. There is no growth to follow from one age to the next.

| Age | Subject line |
|---|---|
| I Omens | a ring of painted standing poles and a great fire on a dark plain under a sky with a low red sun, a few tiny figures |
| II Heroes | a walled hill town above a bay with beaked galleys on the sand, a hero's burial mound in front |
| III Empire | a straight paved road through a triumphal gate to a great city of colonnades, a tiny marching column with standards |
| IV Cathedrals | a great domed and spired hall under scaffolding with wooden cranes, a city of workshops around it |

### Direction C: the magister's table, four times

One table by a window, with the instruments of each age: bones and knotted cords; a bronze bowl and clay tablets; scrolls and an armillary sphere; a brass astrolabe, lenses and a clock. The view in the window changes. This is an interior still life, and it is the farthest from the wonder paintings. I do not recommend it for the ribbon, where the picture is small.

## 6. Endings (2, 16:9)

- The game ends when a court closes the Great Work (the Magnum Opus).
- The win page is lapis, with the sun mark. The loss page is dark cloth, with the moon mark. You have not yet approved the loss page.
- If you take direction A for the ages, the endings can use the same valley: the morning after age IV for the win, and the night for the loss. Use the age IV picture as an image prompt.
- The loss is quiet, not a ruin. The page says "Your realm stands".

#### The win: sunrise over the finished Great Work (`ending-win`)

A gilt sphere on the hill takes the first light. The sun is a plain disc, like the game's sun mark.

```text
wide view from a high dark grassy slope looking down a valley to the sea, a flat-topped hill on the left, a river winding through the middle to a river mouth and a small bay, a rocky headland on the right, sea horizon one third down from the top, dark olive pines and shrubs along the bottom, a great city of domes and spires at sunrise, on the flat hill a huge gilded armillary sphere on a tall stone terrace shining in the first light, a plain round golden sun just above the sea horizon, banners on the towers, calm bright water, sunrise, warm gold light on every east face, long blue-violet shadows, deep ultramarine sky with tall cumulus clouds lit gold and apricot, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, matte, very little fine detail --ar 16:9 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### The loss: the same city under the moon (`ending-loss`)

Another court closed the Great Work. Your city is whole and quiet. A far light shines across the water.

```text
wide view from a high dark grassy slope looking down a valley to the sea, a flat-topped hill on the left, a river winding through the middle to a river mouth and a small bay, a rocky headland on the right, sea horizon one third down from the top, dark olive pines and shrubs along the bottom, a great city of domes and spires at night after dusk, most windows dark and a few small warm lamps, on the flat hill an unfinished armillary sphere in dark scaffolding, far across the bay on the horizon one small bright golden light, a large pale crescent moon and a few stars, still water with the moon's reflection, deep dusk, a last thin band of dull orange at the horizon, the whole scene in deep blue-violet and indigo, muted colour, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, matte, very little fine detail, quiet and still --ar 16:9 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

### Endings for the abstract direction

These two match take 3 (the great sphere of age IV). For take 1 or take 2, keep the light and the colours and change the form: the finished alembic full of gold, or the gold sphere alone.

#### The win: the Great Work completed, gold and the sun (`ending-win-abstract`)

The sphere of age IV is whole, and the sun stands behind it. Gold is in every part of the picture.

```text
a wide flat plain with a low level horizon, one great golden sphere of open rings on a tall stone tower in the centre, complete and bright, a large plain round golden sun exactly behind the sphere so that the rings cross its disc, gold light on the whole plain, long blue-violet shadows that spread from the tower toward the viewer, no people, sunrise, deep ultramarine sky at the top that turns to gold and apricot at the horizon, tall cumulus clouds lit gold, the picture is mostly gold and cream, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, matte, very little fine detail --ar 16:9 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark, numerals, numbers, glyphs, symbols, runes, diagram
```

#### The loss: the work lost to another, the moon and ash-blue (`ending-loss-abstract`)

Your sphere is dark and not finished. A far gold light on the horizon is the other court's work. The moon is the only large light.

```text
a wide flat plain with a low level horizon, one great sphere of open rings on a tall stone tower in the centre, dark and unfinished with one ring missing and cold with no glow, a large pale crescent moon high beside it, far away on the horizon at the right one very small bright golden light, no people, night just after dusk, the whole picture in ash-blue, grey-violet and indigo, muted colour, a few stars, the small far light is the only gold, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, matte, very little fine detail, quiet and still --ar 16:9 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark, numerals, numbers, glyphs, symbols, runes, diagram
```

Stand-alone options, if you use neither the valley nor the abstract direction:

- Win: a hall of the magisters on a cliff at sunrise, with a great bronze sphere on its roof and the sun behind it.
- Loss: an empty terrace at dusk with a covered instrument, an unlit lamp and a crescent moon over the sea.

## 7. Leaders (16, portrait 3:4)

- The roster is your ruling of 2026-11-19 (`docs/plans/leader-roster-pass-2026-11-19.md`): one leader for each pair of decks, and Ibn Battuta for every deck.
- The sixteen: Alexander the Great, Genghis Khan, Joan of Arc, Mehmed the Conqueror, Qin Shi Huang, Pachacuti, Jayavarman VII, Nezahualcoyotl, Cyrus the Great, Mansa Musa, Cleopatra, Lorenzo de' Medici, Harun al-Rashid, Justinian, Sejong the Great and Ibn Battuta.
- Jayavarman VII's rules are not final. The person is chosen, so the portrait is safe to paint.
- A portrait shows at up to 330 by 440 px in setup and in diplomacy, at 132 px and 48 px in lists, and as a 28 px circle.
- Each prompt follows the portrait note of the roster pass, with two changes. All sixteen have the same late-afternoon light, so that the set matches. A prop with writing on it (a codex, a printed page) is a closed book, because Midjourney makes false letters.
- File names: `leaders/<leader id>.jpg`. Five leaders have an id in `data/leaders.json` today. The build gives the other eleven their ids.

### Rules for a 3:4 portrait in this style

- Chest up, three-quarter view, eyes level. A calm, dignified face.
- The head is in the upper middle. It takes about a third of the height of the frame.
- Plain deep blue sky behind the head. The setting is low, at shoulder height, and it tells you where the person ruled.
- One strong light from the left. The face becomes two or three flat shapes: a light side, a shadow side and the dark of the eyes.
- The headdress is a simple shape with a clear outline. No brim that shades the eyes.
- One prop, near the hands, tells the playstyle of the leader.
- The two seat colours of the leader are the accent colours of the dress, where the record of the dress permits it.
- The dress, the regalia and the buildings are correct for the person and the period. If no likeness exists, describe the person by role, period dress and setting.
- Check each result: make it 28 pixels wide on your screen. If you still see a face, it is good.
- A famous name can pull the face toward an actor or a film. If that occurs, delete the name and keep the description.

### The template

```text
[WHO: name, title], [PERIOD AND CULTURE], [AGE, BUILD AND FACE], [HEADDRESS], [DRESS AND REGALIA in the two seat colours], [ONE PROP that tells the playstyle], behind [him/her] at shoulder height [SETTING], portrait from the chest up, three-quarter view, eyes level, calm and dignified, head in the upper middle of the frame, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 3:4 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

### The sixteen portraits

#### Alexander the Great (`leader-alexander`)

Dominion + Expansionist. Seat colours: Tyrian purple and sun gold. Likeness: Known from ancient portraits (copies of the sculptor Lysippos, the Alexander Mosaic, coins): clean-shaven, thick hair that rises from the forehead. He died at thirty-two, in 323 BC.

```text
Alexander the Great, king of Macedon in the fourth century BC, a young man of about twenty-eight, clean-shaven, with thick tousled light-brown hair that rises from the forehead, a narrow white ribbon diadem tied around his head, a white linen breastplate with a purple band across the chest, a Tyrian-purple cloak pinned at one shoulder with a gold brooch, the shaft of a long spear in one hand and a rolled map in the other, behind him at shoulder height a dry plain with far mountains and a few tiny horsemen, portrait from the chest up, three-quarter view, eyes level, calm and dignified, head in the upper middle of the frame, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 3:4 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Genghis Khan (`leader-genghisKhan`)

Dominion + Commerce. Seat colours: sky blue and bone. Likeness: No portrait from life. The usual picture is from a Yuan court album, painted about fifty years after he died in 1227: an older man with a broad face, a thin beard, a pale robe and a plain cap.

```text
Genghis Khan, founder of the Mongol empire in the early thirteenth century, a broad-faced weathered man of about sixty with a thin grey beard and moustache, a plain bone-white cap with a fur edge, a sky-blue robe that closes at the side with a bone-white fur collar, behind him at shoulder height a white horse-tail standard on a pole at one side, open steppe grassland with round felt tents and a few tiny riders, portrait from the chest up, three-quarter view, eyes level, calm and dignified, head in the upper middle of the frame, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 3:4 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Joan of Arc (`leader-joan`)

Dominion + Devotion. Seat colours: royal azure and gold. Likeness: No portrait from life. Records say she had dark hair, cut short and round. She died at about nineteen, in 1431.

```text
Joan of Arc, a French countrywoman of eighteen in the year 1429, a plain strong face, dark hair cut short and round above the ears, plain polished steel plate armour of the early fifteenth century with no helmet, holding the staff of a white banner sown with small gold fleurs-de-lis, a royal-blue cloth at her shoulder, behind her at shoulder height the walls and round towers of the river town of Orleans, portrait from the chest up, three-quarter view, eyes level, calm and dignified, head in the upper middle of the frame, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 3:4 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Mehmed the Conqueror (`leader-mehmed`)

Dominion + Scientific. Seat colours: Ottoman red and white. Likeness: Painted from life by Gentile Bellini in 1480, and by a court painter who shows him with a rose: a hooked nose, a pointed beard, a red robe, a large white turban. He took Constantinople in 1453, at twenty-one.

```text
Mehmed the Second, Ottoman sultan of the fifteenth century, a man of about thirty with a strong hooked nose and a short pointed dark-brown beard, a large white wrapped turban over a red cap, a red kaftan with a wide brown fur collar, a single rose held in one hand, behind him at shoulder height a great bronze cannon on a timber bed at one side, the long sea walls and towers of a city on the water, portrait from the chest up, three-quarter view, eyes level, calm and dignified, head in the upper middle of the frame, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 3:4 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Qin Shi Huang (`leader-qinShiHuang`)

Dominion + Magisterial. Seat colours: cinnabar and lacquer black. Likeness: No portrait from life. Every picture is from a later age. The flat crown with bead strings is the later convention for an emperor. He died in 210 BC, at forty-nine.

```text
Qin Shi Huang, first emperor of China in the third century BC, a heavy-set stern man of about forty-five with a dark beard and moustache, a flat black board crown with short strings of beads at its front and back edges that do not cover the face, wide black robes with a cinnabar-red collar and sash, one hand on the hilt of a long bronze sword, behind him at shoulder height ranks of clay soldier statues in rows, portrait from the chest up, three-quarter view, eyes level, calm and dignified, head in the upper middle of the frame, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 3:4 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Pachacuti (`leader-pachacuti`)

Expansionist + Commerce. Seat colours: maroon and sun gold. Likeness: No portrait from life. He ruled from Cusco, about 1438 to 1471.

```text
Pachacuti, Sapa Inca of the fifteenth century, a strong man of about forty-five with brown skin and black hair cut straight at the jaw, the royal red wool fringe on his forehead held by a braided headband, large round gold ear discs, a maroon tunic with a band of small woven checked squares, a gold-yellow mantle on one shoulder, a bundle of knotted coloured cords in one hand, behind him at shoulder height a stone road that climbs green farming terraces, a wall of large fitted stones, snow peaks of the Andes far away, portrait from the chest up, three-quarter view, eyes level, calm and dignified, head in the upper middle of the frame, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 3:4 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Jayavarman VII (`leader-jayavarman`)

Expansionist + Devotion. Seat colours: Angkor sandstone and forest green. Likeness: Known from portrait statues of his own reign (one is in the museum in Phnom Penh): a heavy-set man, hair in a small knot, eyes lowered, a slight smile. He ruled the Khmer realm from 1181 to about 1218.

```text
Jayavarman the Seventh, Buddhist king of the Khmer realm at Angkor about the year 1200, a heavy-set man of about sixty with brown skin, hair pulled back into a small knot, eyes lowered and a slight calm smile, bare shoulders and a plain cloth wrapped at the waist, hands folded in his lap, behind him at shoulder height at one side a sandstone temple tower half covered by the roots of a fig tree, deep forest green trees, portrait from the chest up, three-quarter view, eyes level, calm and dignified, head in the upper middle of the frame, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 3:4 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Nezahualcoyotl (`leader-nezahualcoyotl`)

Expansionist + Scientific. Seat colours: turquoise and ochre. Likeness: A later codex shows him in the dress of a warrior. No portrait from life. He ruled Texcoco, and he lived from 1402 to 1472.

```text
Nezahualcoyotl, ruler, engineer and poet of Texcoco in the Valley of Mexico in the fifteenth century, a lean thoughtful Nahua man of about fifty with brown skin and black hair to the shoulders, the pointed turquoise mosaic diadem of a ruler, round turquoise ear ornaments, a turquoise-blue cloak knotted at one shoulder with an ochre patterned border, a closed folded bark-paper book in one hand, behind him at shoulder height terraced hill gardens with a stone aqueduct, a wide lake and two snow-topped volcanoes far away, portrait from the chest up, three-quarter view, eyes level, calm and dignified, head in the upper middle of the frame, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 3:4 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Cyrus the Great (`leader-cyrus`)

Expansionist + Magisterial. Seat colours: Susa glaze teal and gold. Likeness: No certain likeness. The dress is from Persian palace reliefs of the next two generations. He died in 530 BC.

```text
Cyrus the Great, founder of the Persian empire in the sixth century BC, a dignified man of about fifty with a long curled dark beard and curled hair, a plain fluted gold crown, a long pleated teal robe with wide sleeves and a gold border, one hand on a barrel-shaped clay cylinder that stands on a low pillar, behind him at shoulder height a walled garden with straight stone water channels and rows of cypress trees, a columned pavilion, portrait from the chest up, three-quarter view, eyes level, calm and dignified, head in the upper middle of the frame, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 3:4 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Mansa Musa (`leader-mansaMusa`)

Commerce + Devotion. Seat colours: Wangara gold and indigo. Likeness: No portrait from life. The Catalan Atlas of 1375 shows him seated with a gold nugget; it was made in Europe by people who never saw him, and its crown is a European one. The prompt keeps the nugget and uses a turban. He ruled Mali from about 1312 to 1337.

```text
Mansa Musa, emperor of Mali in the fourteenth century, a calm and stately West African man of about forty-five with dark brown skin and a short beard, a large white wrapped turban with a gold band, wide indigo robes with gold embroidery at the neck, a heavy gold necklace, a large gold nugget held up in one hand, behind him at shoulder height a great Sahelian mud-brick mosque with rows of wooden beams in its walls, a few tiny camels of a caravan, portrait from the chest up, three-quarter view, eyes level, calm and dignified, head in the upper middle of the frame, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 3:4 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Cleopatra (`leader-cleopatra`)

Commerce + Scientific. Seat colours: papyrus and deep lapis. Likeness: Known from her coins and from two or three marble heads: hair in rolls drawn back to a knot, a broad royal band, a strong nose and chin. Her family was Macedonian Greek. The colour of her skin is not recorded; "olive" is my choice. She died in 30 BC, at thirty-nine.

```text
Cleopatra the Seventh, Greek queen of Egypt in the first century BC, a woman of about thirty with olive skin, a strong nose and a firm chin, dark hair drawn back in rolls to a knot at the back of the head, a broad white royal band around the hair, a pale papyrus-coloured Greek gown pinned at the shoulders and a deep lapis-blue mantle, a scroll in one hand, behind her at shoulder height the harbour of Alexandria with merchant ships and a tall lighthouse, portrait from the chest up, three-quarter view, eyes level, calm and dignified, head in the upper middle of the frame, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 3:4 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Lorenzo de' Medici (`leader-lorenzo`)

Commerce + Magisterial. Seat colours: iris violet and florin gold. Likeness: Well recorded: a death mask, a bust and portraits. A broad flat nose, a heavy jaw, dark hair to the shoulders, a plain red gown. He lived from 1449 to 1492.

```text
Lorenzo de' Medici, banker and first citizen of Florence in the fifteenth century, a man of about forty with a broad flat nose, a heavy jaw and straight dark hair to the shoulders, clean-shaven, a plain dark red gown with a violet lining at the collar, a small bronze statuette held in one hand, a gold chain, behind him at shoulder height the great brick dome of Florence cathedral and the tiled roofs of the city, portrait from the chest up, three-quarter view, eyes level, calm and dignified, head in the upper middle of the frame, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 3:4 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Harun al-Rashid (`leader-harun`)

Devotion + Scientific. Seat colours: Abbasid black and gold. Likeness: No likeness exists. He was caliph in Baghdad from 786 to 809. Black was the colour of the Abbasid house.

```text
Harun al-Rashid, Abbasid caliph of Baghdad about the year 800, a man of about forty with a full dark beard, a black turban with a gold band and a black robe with gold bands at the collar and sleeves, one hand on a brass water clock with small brass balls, a stack of bound books beside it, behind him at shoulder height the round brick walls of Baghdad with a green dome above them and date palms, portrait from the chest up, three-quarter view, eyes level, calm and dignified, head in the upper middle of the frame, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 3:4 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Justinian (`leader-justinian`)

Devotion + Magisterial. Seat colours: porphyry and mosaic gold. Likeness: Known from the mosaic in Ravenna made in his reign, about 547: a round face, dark eyes, a purple cloak with a gold panel, a crown with jewels. He ruled from 527 to 565.

```text
Justinian, Roman emperor at Constantinople in the sixth century, a man of about forty-five with a round face, large dark eyes and short dark hair, clean-shaven, a gold crown set with jewels with pearl strings at the temples, a deep purple cloak with one square gold panel on the chest, pinned at the right shoulder with a large round jewelled brooch, a small model of a great domed church held in both hands, behind him at shoulder height the sea walls of a great city and one wide low dome with no towers, portrait from the chest up, three-quarter view, eyes level, calm and dignified, head in the upper middle of the frame, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 3:4 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Sejong the Great (`leader-sejong`)

Scientific + Magisterial. Seat colours: ink navy and porcelain white. Likeness: No portrait from life survives. The standard portrait is modern (1973). The red robe with gold dragon badges and the black cap are the recorded daily dress of a Joseon king. He ruled from 1418 to 1450.

```text
Sejong the Great, king of Joseon Korea in the fifteenth century, a man of about forty with a gentle scholarly face and a thin dark beard and moustache, a black silk cap with two small upright wings at the back, a red robe with a round gold dragon badge on the chest and on each shoulder, a closed bound book with a plain navy cover in one hand, behind him at shoulder height a bronze sphere of open rings on a stone terrace, a palace hall with a grey tiled roof, a white porcelain jar, portrait from the chest up, three-quarter view, eyes level, calm and dignified, head in the upper middle of the frame, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 3:4 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Ibn Battuta (`leader-ibnBattuta`)

Every deck. Seat colours: ochre and sea teal. Likeness: No likeness exists. He was a judge and traveller from Tangier, and he lived from 1304 to about 1369.

```text
Ibn Battuta, a Moroccan judge and traveller of the fourteenth century, a lean sun-browned man of about forty with a dark trimmed beard, a white turban with its tail under the chin, an ochre wool travelling cloak with a hood over a pale robe, a walking staff in one hand and a leather satchel at his side, behind him at shoulder height a harbour with one ship on sea-teal water and a few tiny camels of a caravan on the shore, portrait from the chest up, three-quarter view, eyes level, calm and dignified, head in the upper middle of the frame, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 3:4 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

## 8. Great people (78 live; 20 first; 5:6 arched)

- The window has a round arch at the top. Keep the head below the top fifth, and keep the two top corners plain.
- The window is small (150 by 180 px). One person, one object, one piece of setting.
- The data gives each person an age from II to V. The 19 people of age V belong to the age that is not built. Paint them last. I did not check if they can appear in a game today.
- Ibn Battuta is also a leader. You can cut his picture from the leader portrait.
- For most of these people no likeness exists. Each prompt describes the person by role, period dress and setting.

### The first 20

These are the best known people of ages II to IV, across the five families: 5 scholars, 5 artists, 3 engineers, 3 merchants and 4 generals.

#### Imhotep (`person-imhotep`)

Scholar, age II. Architect of the Step Pyramid, about 2650 BC. Later statuettes show him seated with a papyrus roll. File: `people/imhotep.jpg`.

```text
Imhotep, an Egyptian royal architect and priest of the Old Kingdom, a lean man of about fifty with brown skin and a shaved head, a plain white linen robe from the chest down, a papyrus roll open in his hands, low behind him the step pyramid of Saqqara in cream limestone, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Aristotle (`person-aristotle`)

Scholar, age III. Greek philosopher, 384 to 322 BC. Ancient busts show a short beard and a broad forehead. File: `people/aristotle.jpg`.

```text
Aristotle, a Greek philosopher of the fourth century BC, a man of about fifty-five with a short grey beard and short hair, a cream wool cloak draped over one shoulder, a scroll in one hand, low behind him a shaded colonnade and a garden walk in Athens, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Archimedes (`person-archimedes`)

Scholar, age III. Mathematician of Syracuse, about 287 to 212 BC. No reliable likeness. File: `people/archimedes.jpg`.

```text
Archimedes, a Greek mathematician of Syracuse in the third century BC, an old man with a white beard and a sun-browned face, a plain tunic and cloak, bent over a tray of sand in which he has drawn circles with a stick, low behind him the harbour wall of Syracuse and the sea, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Ibn Sīnā (`person-ibnSina`)

Scholar, age III in the data. Persian physician and philosopher, 980 to 1037. No portrait from life. File: `people/ibnSina.jpg`.

```text
Ibn Sina, a Persian physician and philosopher of the eleventh century, a man of about forty-five with a full dark beard, a white turban and a blue-grey robe, a thick bound book open in his hands, two glazed medicine jars beside him, low behind him a brick courtyard with pointed arches, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### al-Khwārizmī (`person-alKhwarizmi`)

Scholar, age IV. Mathematician at the House of Wisdom in Baghdad, about 780 to 850. No likeness exists. File: `people/alKhwarizmi.jpg`.

```text
al-Khwarizmi, a mathematician of ninth-century Baghdad, a man of about fifty with a grey-streaked beard, a white turban and an ochre robe, a brass astrolabe held up in one hand and a sheet with plain geometric diagrams in the other, low behind him the brick walls and round gate of Baghdad with date palms, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Homer (`person-homer`)

Artist, age II. The poet of the Iliad and the Odyssey. He is a figure of legend; the ancient busts are imagined. File: `people/homer.jpg`.

```text
Homer, the blind poet of early Greece, an old man with a long white beard, closed eyes and a cloth band around his head, a simple wool cloak, a small wooden lyre held against his chest, low behind him a rocky Aegean shore with one ship with a square sail, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Sappho (`person-sappho`)

Artist, age II. Poet of Lesbos, about 630 to 570 BC. No likeness from life. File: `people/sappho.jpg`.

```text
Sappho, a Greek poet of the island of Lesbos in the sixth century BC, a woman of about thirty-five with olive skin and dark hair bound up with a ribbon, a long pleated linen dress and a violet cloak, a long-armed lyre in her hands, low behind her olive trees on a hillside above the sea, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Enheduanna (`person-enheduanna`)

Artist, age II. High priestess at Ur, about 2285 to 2250 BC, and the first author known by name. A carved disc of her time shows her in a tiered robe and a round cap. File: `people/enheduanna.jpg`.

```text
Enheduanna, high priestess of the moon god at Ur in ancient Sumer, a dignified woman of about forty with brown skin and long dark hair, a round cap with a rolled brim, a long robe of tiered wool fringes, a clay tablet and a reed stylus in her hands, low behind her the great stepped brick ziggurat of Ur, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Murasaki Shikibu (`person-murasakiShikibu`)

Artist, age IV. Court lady of Heian Japan, about 973 to 1014 or later, author of The Tale of Genji. No portrait from life. File: `people/murasakiShikibu.jpg`.

```text
Murasaki Shikibu, a court lady and author of Heian Japan about the year 1000, a woman of about thirty-five with very long straight black hair down her back, many layered silk robes in soft colours with wide sleeves, a writing brush in her hand over a low desk with paper, low behind her the wooden veranda of a temple above a lake with a pale daytime moon, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Rūmī (`person-rumi`)

Artist, age IV. Persian poet who lived in Konya, 1207 to 1273. Pictures of him are later. File: `people/rumi.jpg`.

```text
Rumi, a Persian poet and teacher of the thirteenth century in Konya, an old man with a grey beard and gentle eyes, a large pale turban and a wide-sleeved brown robe, a reed flute in one hand, low behind him a brick building with a cone-shaped dome and a walled garden, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Vitruvius (`person-vitruvius`)

Engineer, age III. Roman architect and author, first century BC. No likeness exists. File: `people/vitruvius.jpg`.

```text
Vitruvius, a Roman architect and military engineer of the first century BC, a man of about sixty with short grey hair, clean-shaven, a plain tunic and a dark red cloak, bronze dividers in one hand and a scroll in the other, low behind him a Roman building site with stone arches and a wooden crane, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### al-Jazarī (`person-alJazari`)

Engineer, age IV. Engineer at the Artuqid court of Diyarbakır, 1136 to 1206, author of a book of machines. No likeness exists. File: `people/alJazari.jpg`.

```text
al-Jazari, a court engineer of the twelfth century in upper Mesopotamia, a man of about fifty with a dark beard, a white turban and a green robe with the sleeves rolled, fitting a brass gear to a small water clock in the shape of an elephant, low behind him a city wall of black basalt with a round tower, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Mimar Sinan (`person-mimarSinan`)

Engineer, age IV. Chief architect of the Ottoman court, about 1490 to 1588. File: `people/mimarSinan.jpg`.

```text
Mimar Sinan, chief architect of the Ottoman court in the sixteenth century, an old man with a long white beard, a large white turban and a dark red kaftan, a pair of compasses in one hand, low behind him a great mosque with one wide central dome and slim minarets, part of it in wooden scaffolding, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Ea-nāṣir (`person-eaNasir`)

Merchant, age II. Copper merchant of Ur, about 1750 BC. A customer's letter of complaint to him is the oldest that we have. File: `people/eaNasir.jpg`.

```text
Ea-nasir, a copper merchant of the city of Ur in the eighteenth century BC, a well-fed man of about forty-five with a dark trimmed beard and a round cap, a fringed wool robe wrapped over one shoulder, a small clay tablet in one hand, a stack of round copper ingots beside him, low behind him the mud-brick courtyard of a merchant's house, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Zhang Qian (`person-zhangQian`)

Merchant, age III. Envoy of Han China who opened the road to the west, from 138 BC. No portrait from life. File: `people/zhangQian.jpg`.

```text
Zhang Qian, an envoy of Han China in the second century BC, a lean sun-browned man of about forty with a thin beard, hair in a topknot under a small cap, a dark belted robe with wide sleeves, the tall staff of an envoy with three tufts of yak hair in his hand, low behind him a desert road below snow mountains, one horse and two tiny camels, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Marco Polo (`person-marcoPolo`)

Merchant, age IV. Merchant of Venice, 1254 to 1324. No portrait from life. File: `people/marcoPolo.jpg`.

```text
Marco Polo, a Venetian merchant of the late thirteenth century, a sun-browned man of about forty with a short beard, a soft red cap and a long travelling gown with a fur lining, a small sealed bundle of silk under one arm, low behind him a caravan of tiny camels on a road through dry hills, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Hannibal (`person-hannibal`)

General, age III. General of Carthage, 247 to about 183 BC. No certain likeness. File: `people/hannibal.jpg`.

```text
Hannibal, a general of Carthage in the third century BC, a North African man of about thirty-five with a short dark beard and curly hair, a bronze breastplate and a dark red cloak, a plain bronze helmet under one arm, low behind him a high snowy mountain pass with two tiny war elephants in a marching column, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Boudica (`person-boudica`)

General, age III. Queen of the Iceni, died in 60 or 61. A Roman author, a century later, describes a tall woman with long tawny hair, a gold neck ring and a many-coloured tunic. File: `people/boudica.jpg`.

```text
Boudica, queen of the Iceni of Britain in the first century, a tall woman of about forty with very long tawny-red hair, a heavy twisted gold neck ring, a checked tunic of several colours under a thick dark cloak closed with a brooch, a spear held upright at her side below shoulder height, low behind her open heath and the wicker side of a light war chariot, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Subutai (`person-subutai`)

General, age IV. General of the Mongol empire, about 1175 to 1248. No portrait from life. File: `people/subutai.jpg`.

```text
Subutai, a Mongol general of the thirteenth century, a weathered man of about sixty with a thin grey beard, a fur-trimmed felt hat, a blue robe that closes at the side under a coat of small laced armour plates, low behind him wide grassland with a few tiny riders, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Tomoe Gozen (`person-tomoeGozen`)

General, age IV. A woman warrior of the Genpei War, about 1184, known from The Tale of the Heike. She may be legend. File: `people/tomoeGozen.jpg`.

```text
Tomoe Gozen, a woman warrior of twelfth-century Japan, a strong woman of about twenty-eight with a pale face and long black hair tied low at the back, laced Japanese armour of the period in red and dark blue with large square shoulder guards, a long curved sword at her hip, low behind her dark pines and a river plain, half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

### The other 58: a template and its values

Assemble a prompt from one row. In the web page, the Copy button of a row gives you the assembled prompt.

```text
[FIGURE], low behind [him/her] [SETTING], half-length portrait, three-quarter view, calm and dignified, head in the middle of the frame with open plain sky above it and in the upper corners, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, face built from a few clear planes of light and shadow, low warm late-afternoon sun from the left, blue-violet shadows, plain deep ultramarine sky behind the head, apricot-lit cumulus clouds low in the frame, matte, very little fine detail --ar 5:6 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Scholars (14)

| Name | Age | Who | [FIGURE] | [SETTING] |
|---|---|---|---|---|
| Ahmes | II | Egyptian scribe who copied a book of arithmetic, about 1550 BC | an Egyptian scribe of the sixteenth century BC, a man of about thirty-five with a short black wig and a white linen kilt, seated cross-legged with a papyrus roll on his knees and a reed pen | a hall with painted papyrus-shaped columns |
| Kidinnu | II | Babylonian astronomer, fourth century BC | a Babylonian astronomer, a man of about fifty with a curled dark beard, a long fringed robe, a clay tablet in one hand, looking up | the flat brick roof of a temple tower at dusk with the first stars |
| Epicurus | III | Greek philosopher, 341 to 270 BC; busts exist | Epicurus, a Greek philosopher of about sixty with a long face and a full beard, a plain wool cloak, a fig in one hand | a walled garden with a fig tree outside Athens |
| Ptahhotep | III | Egyptian vizier and author of maxims, about 2400 BC | an old Egyptian vizier of the Old Kingdom, a shoulder-length wig, a wide bead collar and a long white kilt, a tall staff held low in one hand | a pillared limestone court |
| Hypatia | III | Philosopher and mathematician of Alexandria, died 415 at about fifty to sixty; no likeness | a philosopher and mathematician of Alexandria about the year 400, a composed woman of about fifty with olive skin and dark hair with some grey bound up at the back, a pale philosopher's cloak over a long tunic with a deep blue border, a scroll in one hand | a colonnade of a Roman city in Egypt, the sea and a tall lighthouse far away |
| Zhang Heng | III | Han scholar who made a device that showed the direction of an earthquake, 78 to 139 | a scholar-official of Han China, a man of about fifty with a thin beard, a small black cap over a topknot and a wide-sleeved dark robe, one hand on a large bronze jar ringed with small dragon heads | a tiled Han observatory terrace |
| Eratosthenes | III | Greek scholar of Alexandria who measured the Earth, about 276 to 194 BC | a Greek scholar of the third century BC, a man of about sixty with a grey beard and a cream cloak, measuring the shadow of an upright staff on the ground | a sunlit court with a round stone well in Alexandria |
| Maimonides | IV | Rabbi, philosopher and physician, 1138 to 1204; the usual portrait is much later | a Jewish scholar and physician of twelfth-century Cairo, a man of about sixty with a grey beard, a white turban and a dark robe, a bound book open in his hands | a shaded courtyard in old Cairo with a wooden screen |
| Roger Bacon | IV | English friar who wrote on optics and on experiment, about 1220 to 1292 | an English Franciscan friar of the thirteenth century, a man of about fifty with a shaved crown, a grey-brown habit with a rope belt, a glass lens held up to the light | a stone study window and the towers of medieval Oxford |
| Āryabhaṭa | IV | Indian mathematician and astronomer, 476 to 550; no likeness | an Indian astronomer of the fifth century, a man of about forty with brown skin, a white cotton lower garment and a shawl over one shoulder, a sacred thread, beside an upright shadow staff with a plain bronze ring sphere | a brick terrace above a wide river plain |
| Paracelsus | V | Swiss physician and alchemist, 1493 to 1541; portraits exist | a Swiss physician of the early sixteenth century, a stout man of about forty-five with a bald crown, a dark gown with a fur collar, both hands on the round pommel of a long sword | a bench with glass flasks and a small furnace |
| Tycho Brahe | V | Danish astronomer, 1546 to 1601; he had a metal nose | a Danish nobleman and astronomer of the late sixteenth century, a man of about forty-five with a long moustache and a small brass plate over the bridge of his nose, a wide white ruff and a dark doublet | a great brass quadrant on a wall and a castle on a flat island |
| John Dee | V | English mathematician and astrologer, 1527 to about 1609; a portrait exists | an English scholar of the late sixteenth century, an old man with a long pointed white beard, a black skullcap and a black gown with a small white ruff, a polished black stone mirror in his hands | a study with shelves of books and a globe |
| Copernicus | V | Polish canon and astronomer, 1473 to 1543; a portrait exists | a Polish church canon and astronomer of the early sixteenth century, a clean-shaven man of about fifty with dark hair to the jaw, a red jerkin with a fur lining, a small model of rings around a central sun in his hand | a brick tower on the wall of a cathedral town by the Baltic sea |

#### Artists (9)

| Name | Age | Who | [FIGURE] | [SETTING] |
|---|---|---|---|---|
| Sin-lēqi-unninni | II | Babylonian scholar who wrote the standard Epic of Gilgamesh, about 1200 BC | a Babylonian scholar and scribe, a man of about fifty with a squared beard and a tall cap, a long fringed robe, a clay tablet and a stylus in his hands | the brick walls of a Babylonian city |
| Ilimilku | II | Scribe of Ugarit who wrote down the stories of the storm god, about 1300 BC | a scribe of a Bronze Age port city in Syria, a man of about thirty-five with a short beard and a headband, a long wrapped robe with a coloured border, a clay tablet in his hands | a stone harbour town with storm clouds over the sea |
| Qu Yuan | III | Poet and minister of the state of Chu, about 340 to 278 BC | a poet and minister of ancient China in the third century BC, a thin man of about sixty with a long thin beard, a tall narrow hat and a long robe with very wide sleeves, a spray of orchids in one hand | a misty river bank with reeds |
| Phidias | III | Athenian sculptor, about 480 to 430 BC | an Athenian sculptor of the fifth century BC, a strong bald man of about fifty with a beard, a short working tunic that leaves one shoulder bare, a mallet and a chisel | a workshop with the great sandalled foot of a statue, the Acropolis far away |
| Sei Shōnagon | IV | Court lady of Heian Japan and author of The Pillow Book, about 966 to 1025 | a court lady of Heian Japan, a woman of about thirty with very long black hair, layered silk robes with wide sleeves, a folded paper book and a brush | a palace veranda with rolled bamboo blinds and a garden in light snow |
| Christine de Pizan | V | Court writer in France, 1364 to about 1430; her own manuscripts show her in a blue gown | a court writer of France about 1410, a woman of about forty-five in a plain blue gown and a white cloth headdress with two soft points, writing in a large book at a sloped desk | a small stone study with a window on a walled city |
| Dürer | V | Painter and printmaker of Nuremberg, 1471 to 1528; self-portraits exist | a painter and printmaker of Nuremberg about 1500, a man of about thirty with long curled brown hair and a short beard, a coat with a brown fur collar, an engraver's tool in his hand over a copper plate | a workshop window and the steep roofs of a German town |
| Bashō | V | Japanese poet and traveller, 1644 to 1694 | a Japanese poet and traveller of the seventeenth century, a thin man of about fifty with a shaved head, a plain dark robe like a monk's, a walking staff, a wide woven hat hung on his back | a narrow road through pines and a broad-leafed banana plant |
| Sor Juana | V | Poet and scholar, a nun in Mexico City, 1648 to 1695; the portraits are later | a nun and scholar of seventeenth-century Mexico City, a woman of about forty in a white habit with a black veil and a large round painted medallion on her chest, a quill in her hand | a convent cell with tall shelves of books |

#### Engineers (11)

| Name | Age | Who | [FIGURE] | [SETTING] |
|---|---|---|---|---|
| Amenhotep son of Hapu | II | Egyptian official and builder, about 1400 BC; statues show him as a seated scribe | an Egyptian royal official of the fourteenth century BC, an old man with a long wig and a long linen kilt tied high on the chest, a papyrus roll on his knee | two huge seated stone statues of a king |
| Bezalel | II | The craftsman of the Book of Exodus; a figure of scripture, no likeness | a master goldsmith of the Bronze Age Levant, a man of about forty with a dark beard, a simple knee-length wool tunic, a small hammer in his hand over a sheet of beaten gold on a wooden block | a goat-hair tent and a desert camp below a bare mountain |
| Hemiunu | III in the data | Vizier who directed the building of the Great Pyramid, about 2570 BC; his statue shows a heavy man | an Egyptian vizier of the Old Kingdom, a heavy broad man of about fifty with short hair, a white linen kilt, a measuring cord with knots in his hands | a great pyramid half built with a long ramp |
| Li Bing | III | Governor of Shu who built the Dujiangyan river works, about 256 BC | a governor of the state of Qin in the third century BC, a man of about fifty with a short beard, a dark robe and a flat cap, a measuring rod in his hand | a wide river divided by a long stone and bamboo barrier, green mountains |
| Dinocrates | III | Greek architect who planned Alexandria for Alexander, 331 BC | a Greek architect of the fourth century BC, a tall man of about forty with a short beard, a tunic and cloak, pouring a line of pale barley flour on the ground to mark a street | a flat sandy coast with a low island offshore |
| Eupalinos | III | Greek engineer who cut a water tunnel through a hill on Samos, sixth century BC | a Greek engineer of the sixth century BC, a man of about forty-five with a dark beard, a short tunic, a clay oil lamp in one hand and a plumb line in the other | the dark mouth of a tunnel in a pale rocky hillside |
| Su Song | IV | Scholar-official of Song China who built a water-driven clock tower, 1020 to 1101 | a scholar-official of Song China in the eleventh century, a man of about sixty with a thin grey beard, a black cap with two long straight wings and a red round-collared robe | a wooden clock tower of several storeys with a bronze ring sphere on its roof |
| Villard de Honnecourt | IV | Travelling draughtsman of northern France, about 1230; no likeness | a travelling draughtsman of thirteenth-century France, a man of about thirty-five in a hooded wool tunic, drawing in a small parchment book with a pen | a cathedral wall with flying buttresses in wooden scaffolding |
| Leonardo | V | Painter and engineer of Florence and Milan, 1452 to 1519 | an Italian painter and engineer about the year 1500, an old man with long grey hair and a long beard, a soft dark cap and a rose-coloured gown, a small wooden model of a wing in his hands | a workshop loggia and a valley with a winding river |
| Taqī al-Dīn | V | Ottoman astronomer and engineer, 1526 to 1585; his observatory in Istanbul was pulled down in 1580 | an Ottoman astronomer of the sixteenth century, a man of about fifty with a grey beard, a large white turban and a blue kaftan, a brass astrolabe held up in one hand | a domed observatory tower above a city with slim minarets |
| Vaucanson | V | French maker of automata, 1709 to 1782 | a French inventor of the eighteenth century, a man of about forty in a powdered wig and a plain blue coat, one hand on a life-size mechanical duck of gilded copper on a stand | a workshop with a tall window and a bench of small gears |

#### Merchants (12)

| Name | Age | Who | [FIGURE] | [SETTING] |
|---|---|---|---|---|
| Lamassī | II | Woman of Assur who wove cloth for the trade with Anatolia, about 1900 BC | an Assyrian woman of the nineteenth century BC, about forty, a long wrapped wool dress and a head cloth, a folded bolt of fine cloth over her arm and a small clay letter in her hand | a mud-brick courtyard with an upright loom |
| Nanaivandak | III | Sogdian merchant whose letter home from China was never delivered, about 313 | a Sogdian merchant of the fourth century, a man of about forty with a beard, a belted knee-length caftan with a patterned border and a soft pointed cap, a folded letter in his hand | a mud-brick watchtower on a desert road and two tiny camels |
| Hippalus | III | Greek sea captain who is said to have found the monsoon route to India, first century BC | a Greek sea captain of the first century BC, a sun-browned man of about forty-five with a short beard, a plain tunic, one hand on a steering oar | the deck and square sail of a merchant ship on open blue sea |
| Crassus | III | The richest man of Rome, about 115 to 53 BC; a bust is thought to show him | a Roman senator of the first century BC, a lean man of about fifty-five with short grey hair, clean-shaven, a white toga with a wide purple stripe | the columns of the Roman forum and an iron-bound chest |
| Pytheas | III | Greek explorer of Marseille who sailed to the far north, about 325 BC | a Greek explorer of the fourth century BC, a man of about forty with a beard, a heavy wool cloak with a hood | the prow of a ship among pale ice floes on a grey-blue northern sea with a low sun |
| Benjamin of Tudela | IV | Jewish traveller from Navarre who recorded the communities he found, about 1170 | a Jewish traveller of twelfth-century Spain, a man of about forty-five with a dark beard, a travelling cloak with a hood, a staff and a small bound notebook | a road down to a walled Mediterranean port |
| Ibn Baṭṭūṭa | IV | Judge and traveller from Tangier, 1304 to about 1369; no likeness | a Moroccan judge and traveller of the fourteenth century, a lean sun-browned man of about forty with a dark trimmed beard, a white turban with its tail under the chin, an ochre wool travelling cloak with a hood over a pale robe, a walking staff in one hand | a white walled town on a hill above a blue-green strait, the sail of one small ship |
| Francesco Datini | IV | Merchant of Prato, 1335 to 1410; portraits show a red gown and cap | an Italian cloth merchant of about 1400, a man of about sixty with a grey fringe of hair, a long red gown and a red cap, an account book in his hands | an arched warehouse front with bales of cloth |
| Jakob Fugger | V | Banker of Augsburg, 1459 to 1525; a portrait shows a gold cap | a German banker of about 1520, a lean clean-shaven man of about sixty, a close-fitting cap of gold cloth and a black coat with a fur collar | a counting office with a tall cabinet of small drawers |
| Willem Beukelszoon | V | Fisherman of Zeeland who is said to have found how to cure herring at sea, fourteenth century | a fisherman of the medieval Low Countries, a weathered man of about fifty in a wool hood and a rough tunic, a small knife in one hand and a herring in the other, beside an oak barrel | a broad fishing boat on a grey-blue sea |
| Gracia Mendes Nasi | V | Jewish banker from Portugal who moved to Antwerp, Venice and Constantinople, 1510 to 1569; no certain portrait | a wealthy widow and banker of the sixteenth century, a woman of about fifty in a dark Renaissance gown with a high collar and a fine veil over her hair, a sealed letter in her hand | a window on a strait with ships and a city of domes |
| Cosimo de' Medici | V | Banker and first citizen of Florence, 1389 to 1464; portraits show a red gown and cap | a banker of fifteenth-century Florence, a man of about seventy with a long nose and a lined face, a long red gown and a red cap | the great brick dome of Florence cathedral |

#### Generals (12)

| Name | Age | Who | [FIGURE] | [SETTING] |
|---|---|---|---|---|
| Ahmose son of Ebana | II | Egyptian naval officer who fought in the wars against the Hyksos, about 1550 BC | an Egyptian naval officer of the sixteenth century BC, a strong man of about forty with a short wig and a white kilt, gold collar necklaces given for courage, a bronze axe in his hand | a river warship with a row of oars on the Nile |
| Piyamaradu | II | Warlord of western Anatolia who troubled the Hittite kings, thirteenth century BC; his dress is not recorded | a warlord of the Late Bronze Age on the coast of western Anatolia, a hard man of about forty-five with a dark beard, a bronze scale corslet and a simple conical helmet, a spear held low | a rocky Aegean coast with beached ships |
| Sinuhe | II | The hero of an Egyptian tale, a courtier who fled to the Levant, about 1900 BC; a figure of literature | an Egyptian courtier in exile in the Middle Bronze Age, a man of about forty-five with a short beard, a striped wool cloak of the Levant over an Egyptian linen kilt, a bow at his shoulder | a dry hill road with a few goats |
| Deborah | II | Judge and prophet of the Book of Judges; a figure of scripture | a judge and leader of the hill tribes of ancient Israel, a woman of about fifty in a long wool tunic and a mantle with a head covering, one hand raised | a tall date palm on a hill above a wide plain |
| Gaius Marius | III | Roman general who reformed the legions, 157 to 86 BC; a bust is thought to show him | a Roman general of about 100 BC, a stern man of about fifty-five with short grey hair, a bronze muscle breastplate and a red cloak | a silver eagle standard on a pole below shoulder height and a tiny column of marching soldiers |
| Spartacus | III | Thracian gladiator who led a slave revolt, died 71 BC; no likeness | a Thracian man of about thirty-five with short dark hair and a short beard, a plain rough tunic and a wide leather belt, a short curved sword held low | the green slope of a volcano above a bay |
| Jan Žižka | IV | Czech general of the Hussite wars, about 1360 to 1424; blind in one eye, later in both | a Czech commander of the early fifteenth century, an old heavy man with a grey moustache and a cloth patch over one eye, a fur cap, a mail collar over a padded coat, a mace in his hand | a line of armoured farm wagons on a hilltop |
| El Cid | IV | Castilian knight who took Valencia, about 1043 to 1099 | a Castilian knight of the eleventh century, a man of about fifty with a full dark beard, a long mail coat, a round helmet with a nose bar under one arm, a long shield with a pointed foot at his side | the walls of a sunlit city near the sea |
| Gustavus Adolphus | V | King of Sweden, 1594 to 1632; portraits exist | a king of Sweden in the Thirty Years' War, a large fair man of about thirty-five with a pointed blond beard and moustache, a pale leather coat with a wide lace collar and a blue sash | a light field cannon and a northern plain |
| Nzinga of Ndongo | V | Queen of Ndongo and Matamba, about 1583 to 1663; the known pictures are later European prints | a queen of seventeenth-century Angola, a dignified Central African woman of about fifty with dark brown skin, fine wrapped cloths, bead necklaces, a small crown-like cap, a ceremonial axe held low | green highlands above a wide river |
| Yi Sun-sin | V | Korean admiral, 1545 to 1598; the standard portrait is modern | a Korean admiral of the late sixteenth century, a calm man of about fifty with a thin beard, a coat of fabric armour with rows of round brass studs, a helmet with a small red tassel under one arm | an armoured warship with a covered roof among green islands |
| Lautaro | V | Mapuche war leader, about 1534 to 1557; no likeness | a young Mapuche war leader of sixteenth-century Chile, a man of about twenty-two with brown skin and long black hair held by a woven headband, a dark wool poncho with a pale stepped pattern, a long lance held low | a forest of tall umbrella-shaped pines below a snow volcano, one horse |

## 9. Governments (13, banner 3:1)

- The banner is shown at 330 by 110 px. Use three to five large shapes. People are small silhouettes.
- If Midjourney does not accept `--ar 3:1`, use `--ar 21:9` and cut a 3:1 band from the middle.
- The governments are types, not countries. The subjects come from several parts of the world, as the frame of the game asks.

#### Chiefdom (`gov-chiefdom`)

File: `governments/chiefdom.jpg`.

```text
a wide ring of small seated figures around one large fire on open grassland at dusk, a tall carved staff planted upright beside the fire, low hide tents at both ends, wide horizontal frieze composition, shapes spread along the whole width, level horizon, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm late-afternoon sun from the left, cream and salmon-orange stone, blue-violet shadows, deep ultramarine sky, towering apricot-lit cumulus clouds, dark olive cypress and pines, matte, very little fine detail --ar 3:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Council of Elders (`gov-councilOfElders`)

File: `governments/councilOfElders.jpg`.

```text
a row of seven robed elders seated on a long low stone bench under the wide crown of one great old tree, a village of round houses low at both ends, wide horizontal frieze composition, shapes spread along the whole width, level horizon, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm late-afternoon sun from the left, cream and salmon-orange stone, blue-violet shadows, deep ultramarine sky, towering apricot-lit cumulus clouds, dark olive cypress and pines, matte, very little fine detail --ar 3:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### War Chief (`gov-warChief`)

File: `governments/warChief.jpg`.

```text
a long line of warriors with spears and round shields along the top of a bare ridge against the sky, one taller figure in front with a standard of horsehair on a pole, wide horizontal frieze composition, shapes spread along the whole width, level horizon, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm late-afternoon sun from the left, cream and salmon-orange stone, blue-violet shadows, deep ultramarine sky, towering apricot-lit cumulus clouds, dark olive cypress and pines, matte, very little fine detail --ar 3:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Priest-King (`gov-priestKing`)

File: `governments/priestKing.jpg`.

```text
a wide stepped brick temple with a long central stair, one small robed figure at the top with raised arms before a low round sun, a line of tiny offering bearers along the base, wide horizontal frieze composition, shapes spread along the whole width, level horizon, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm late-afternoon sun from the left, cream and salmon-orange stone, blue-violet shadows, deep ultramarine sky, towering apricot-lit cumulus clouds, dark olive cypress and pines, matte, very little fine detail --ar 3:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Republic (`gov-republic`)

File: `governments/republic.jpg`.

```text
an open-air assembly, long curved rows of stone seats filled with small seated citizens seen from the side, one speaker on a low stone platform at the right, a colonnade behind, wide horizontal frieze composition, shapes spread along the whole width, level horizon, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm late-afternoon sun from the left, cream and salmon-orange stone, blue-violet shadows, deep ultramarine sky, towering apricot-lit cumulus clouds, dark olive cypress and pines, matte, very little fine detail --ar 3:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Tyranny (`gov-tyranny`)

File: `governments/tyranny.jpg`.

```text
one tall plain citadel tower on a rock at the right, a dead-straight road from it across a low walled city to the left edge, one very long shadow across the roofs, wide horizontal frieze composition, shapes spread along the whole width, level horizon, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm late-afternoon sun from the left, cream and salmon-orange stone, blue-violet shadows, deep ultramarine sky, towering apricot-lit cumulus clouds, dark olive cypress and pines, matte, very little fine detail --ar 3:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Aristocracy (`gov-aristocracy`)

File: `governments/aristocracy.jpg`.

```text
a row of nine tall narrow family towers of different heights along a ridge above a town, a plain coloured banner on each tower, vineyards below, wide horizontal frieze composition, shapes spread along the whole width, level horizon, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm late-afternoon sun from the left, cream and salmon-orange stone, blue-violet shadows, deep ultramarine sky, towering apricot-lit cumulus clouds, dark olive cypress and pines, matte, very little fine detail --ar 3:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Merchant League (`gov-merchantLeague`)

File: `governments/merchantLeague.jpg`.

```text
a long harbour quay seen from the water, a row of tall warehouses with stepped roofs, masts and furled sails of many ships of different kinds, bales and barrels along the quay, wide horizontal frieze composition, shapes spread along the whole width, level horizon, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm late-afternoon sun from the left, cream and salmon-orange stone, blue-violet shadows, deep ultramarine sky, towering apricot-lit cumulus clouds, dark olive cypress and pines, matte, very little fine detail --ar 3:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Imperium (`gov-imperium`)

File: `governments/imperium.jpg`.

```text
a straight paved road with a long marching column of tiny soldiers and standards, a triumphal gate with three arches at the right, a long aqueduct on arches across the background, wide horizontal frieze composition, shapes spread along the whole width, level horizon, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm late-afternoon sun from the left, cream and salmon-orange stone, blue-violet shadows, deep ultramarine sky, towering apricot-lit cumulus clouds, dark olive cypress and pines, matte, very little fine detail --ar 3:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Divine Mandate (`gov-divineMandate`)

File: `governments/divineMandate.jpg`.

```text
a wide round stone altar of three low white terraces open to the sky, one small robed figure alone at its centre, a thin thread of incense smoke rising, tall clouds parting above, wide horizontal frieze composition, shapes spread along the whole width, level horizon, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm late-afternoon sun from the left, cream and salmon-orange stone, blue-violet shadows, deep ultramarine sky, towering apricot-lit cumulus clouds, dark olive cypress and pines, matte, very little fine detail --ar 3:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### The Estates (`gov-theEstates`)

File: `governments/theEstates.jpg`.

```text
a long timber-roofed great hall seen from the side with one wall open, three groups of small seated figures in three colours of robes on benches, a clerk at a table in the middle, wide horizontal frieze composition, shapes spread along the whole width, level horizon, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm late-afternoon sun from the left, cream and salmon-orange stone, blue-violet shadows, deep ultramarine sky, towering apricot-lit cumulus clouds, dark olive cypress and pines, matte, very little fine detail --ar 3:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### The Sultanate (`gov-theSultanate`)

File: `governments/theSultanate.jpg`.

```text
a long palace wall with a great arched gate, low domes and slim towers behind it, three riders at a gallop on the road away from the gate toward the left, cypress trees, wide horizontal frieze composition, shapes spread along the whole width, level horizon, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm late-afternoon sun from the left, cream and salmon-orange stone, blue-violet shadows, deep ultramarine sky, towering apricot-lit cumulus clouds, dark olive cypress and pines, matte, very little fine detail --ar 3:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### The Curia (`gov-theCuria`)

File: `governments/theCuria.jpg`.

```text
a long cloister arcade of round arches seen from the side, a row of clerks at writing desks in the shade of the arches, tall shelves of bound registers behind them, a paved court in front, wide horizontal frieze composition, shapes spread along the whole width, level horizon, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm late-afternoon sun from the left, cream and salmon-orange stone, blue-violet shadows, deep ultramarine sky, towering apricot-lit cumulus clouds, dark olive cypress and pines, matte, very little fine detail --ar 3:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

## 10. Beliefs (56 live; the 23 gods first; 1:1, round)

- The vignette is a circle of about 62 px (120 px in the older plan). One object, like the device on a seal.
- The 23 pantheon beliefs are the gods of a religion. Paint them first: every religion takes some of them.
- A belief is not the god of a real, living faith. Keep each object general: a hearth, a wave, a lamp.
- No holy symbol of a living religion (no cross, crescent and star, six-pointed star, or sacred syllable). Rites of Blood shows an altar and a bowl, with no blood and no victim.

### The 23 pantheon beliefs

#### Goddess of the Harvest (`belief-goddessOfTheHarvest`)

File: `beliefs/goddessOfTheHarvest.jpg`.

```text
a tall sheaf of golden wheat tied with a red cord, standing upright on a field of cut stubble, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Keeper of the Hearth (`belief-keeperOfTheHearth`)

File: `beliefs/keeperOfTheHearth.jpg`.

```text
a small steady fire in a round hearth of stacked stones, a clay pot beside it, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Star Readers (`belief-starReaders`)

File: `beliefs/starReaders.jpg`.

```text
one large eight-pointed cream star above the dark flat top of a high rock, deep blue dusk sky, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Keeper of the Calendar (`belief-keeperOfTheCalendar`)

File: `beliefs/keeperOfTheCalendar.jpg`.

```text
a round stone disc standing on its edge, carved with plain concentric rings and small notches, no writing, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### The Standing Stones (`belief-theStandingStones`)

File: `beliefs/theStandingStones.jpg`.

```text
one tall rough standing stone with two small ones beside it on a low green mound, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Ancestor Worship (`belief-ancestorWorship`)

File: `beliefs/ancestorWorship.jpg`.

```text
a small house shrine in a wall niche with three plain clay figures and a bowl, one thin thread of incense smoke, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Lady of the Hunt (`belief-ladyOfTheHunt`)

File: `beliefs/ladyOfTheHunt.jpg`.

```text
a wooden hunting bow with one arrow, leaning on a pale birch trunk, a thin crescent moon above, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Spirits of the Wood (`belief-spiritsOfTheWood`)

File: `beliefs/spiritsOfTheWood.jpg`.

```text
one great old oak tree with a wide round crown, a single red ribbon tied to a low branch, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### River Mother (`belief-riverMother`)

File: `beliefs/riverMother.jpg`.

```text
a river in one wide S-curve between banks of reeds, a tall clay water jar on the near bank, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Lord of the Sea (`belief-lordOfTheSea`)

File: `beliefs/lordOfTheSea.jpg`.

```text
one great curling wave with a cream crest, ultramarine water, one tiny fishing boat below it, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### God of the Forge (`belief-godOfTheForge`)

File: `beliefs/godOfTheForge.jpg`.

```text
a black iron anvil with a hammer on it, the orange glow of a forge fire behind, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Rites of Blood (`belief-ritesOfBlood`)

File: `beliefs/ritesOfBlood.jpg`.

```text
a square stone altar at the top of three steps, a bronze knife and a red clay bowl on it, clean and empty, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Oracle of the Crossroads (`belief-oracleOfTheCrossroads`)

File: `beliefs/oracleOfTheCrossroads.jpg`.

```text
a stone pillar where four dirt roads meet on a plain, a small lit lamp hanging from it, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Sacred Fire (`belief-sacredFire`)

File: `beliefs/sacredFire.jpg`.

```text
a tall flame in a wide bronze bowl on a plain stone pedestal, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Desert Fathers (`belief-desertFathers`)

File: `beliefs/desertFathers.jpg`.

```text
a small dark cave door in a tall orange desert cliff, one palm tree and a clay jar beside the door, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Winter Mother (`belief-winterMother`)

File: `beliefs/winterMother.jpg`.

```text
one dark pine tree heavy with snow on a white hill, a small pale sun low in a cold blue sky, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### The Stone Hoard (`belief-lordOfTheHoard`)

File: `beliefs/lordOfTheHoard.jpg`.

```text
a niche cut in dark rock that holds a heap of gold ingots and rough blue stones, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### The Vigil (`belief-courtAugurs`)

File: `beliefs/courtAugurs.jpg`.

```text
one small clay oil lamp with a steady flame on a stone window ledge, deep blue night sky with a few stars behind, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Vineyard Rites (`belief-vineyardRites`)

File: `beliefs/vineyardRites.jpg`.

```text
a bunch of dark purple grapes on a vine with two leaves, a plain clay cup below it, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Cult of Heroes (`belief-cultOfHeroes`)

File: `beliefs/cultOfHeroes.jpg`.

```text
a bronze helmet and a round shield hung on a short stone pillar, a green wreath at its foot, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Herd Gods (`belief-herdGods`)

File: `beliefs/herdGods.jpg`.

```text
a white ox with wide horns standing in profile on a low hill, a garland of flowers around its neck, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Patron of Merchants (`belief-patronOfMerchants`)

File: `beliefs/patronOfMerchants.jpg`.

```text
a pair of bronze balance scales hanging from a wooden post, one pan a little lower, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### The Muses (`belief-theMuses`)

File: `beliefs/theMuses.jpg`.

```text
a golden lyre standing on the drum of a broken stone column, one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

### The other 33: a template and its values

```text
[OBJECT], one simple subject in the centre with wide plain space around it, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm sun from the left, blue-violet shadow, plain deep ultramarine sky, matte, very little detail --ar 1:1 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

#### Follower beliefs (17)

| Belief | [OBJECT] |
|---|---|
| Cathedrals of the Sky | a tall pointed stone vault with no walls, open to the sky, clouds seen through it |
| Pilgrimage | a walking staff with a water gourd tied to it, standing in the ground beside a white road that goes to a far hill |
| Feast Days | a round loaf of bread and a clay jug on a table with a red cloth |
| Holy Water | a wide stone basin full of still blue water, one ripple ring in the middle |
| Lamps of the Shrine | three small brass oil lamps with flames hanging on chains in a dark stone arch |
| Choirs | a row of five small robed singers with open mouths, seen from the front, on one stone step |
| Tithe Houses | a tall stone barn with one great arched door and a full grain sack beside it |
| The Quiet Hours | one bronze bell hanging still in a small stone arch, snow on the arch |
| Warrior Monks | a wooden staff and a plain round shield leaning beside a heavy closed monastery gate |
| Harvest Blessing | a woven basket full of grain and fruit on the ground at the edge of a ripe field |
| Guild of the Faithful | a mason's wooden square and a mallet leaning on a cut stone block, a piece of scaffolding behind |
| Common Table | a long plain wooden table with a row of clay bowls, seen from one end |
| Minarets | one slim tall tower with a small balcony near its top, above low flat roofs |
| Temple Spires | one gilded temple spire of many narrowing tiers, above dark green trees |
| The Open Kitchen | a great round cooking pot on a low fire with a ladle in it, steam rising |
| The Eternal Flame | one flame in a deep stone niche in a wall, soot above the niche |
| The Alms Box | a small wooden box with a coin slot on a stone ledge beside an open door |

#### Enhancer beliefs (16 live)

| Belief | [OBJECT] |
|---|---|
| Reliquaries | a small gold casket with a pointed lid and one round crystal window, on a stone shelf |
| Inquisition | a tall empty judge's chair of dark wood on a stone platform, one candle beside it |
| The Long Road | a two-wheeled cart with a cloth cover on a long straight road to the horizon |
| Itinerant Preachers | a pair of worn sandals and a staff on a dusty road |
| The Pulse of Bells | a large bronze bell swung to one side in an open wooden frame |
| Ecclesia | a ring of low stone seats around one flat stone in the middle, on a hilltop |
| Apostles | twelve small robed figures in one line on a ridge against the sky, each with a staff |
| Sacred Cartography | an unrolled map on a table with plain coastlines and no writing, a pair of brass dividers on it |
| Holy Order | a plain sword standing point down in a stone block, a white cloak hung over its hilt |
| Congregation | a crowd of small figures seen from behind, all facing one bright open doorway |
| Pilgrims' Coin | a small leather purse open on a stone step with a few gold coins beside it |
| World Church | two different towers, one round with a dome and one square with a spire, joined by one high bridge |
| The Long Prayer | one small kneeling robed figure seen from behind on a flat roof before a low round sun |
| The Crusade | a tall plain white banner on a lance planted in the ground on a hill, a far walled town |
| Marvels of the Faith | one great dome under wooden scaffolding with a crane on top |
| The Scriptoria | a sloped writing desk with an open book, a quill in an inkhorn and one candle |

Minarets and Temple Spires name the buildings of living faiths. The objects above show only a tower and a spire, with no symbol on them.

## 11. Title screen (1, 21:9)

- One wide painting across the top of the title screen. The title "Magister Ludi" and the tag line "a game for the ages" are printed on the left, over a blue shade.
- The subject is on the right. The left 45% is sky.
- The game's three marks are a sun, a moon and a star. The picture can have a low sun with a pale daytime moon and one star.
- This is the largest picture on any screen. Upscale it.

#### The title painting (`title-painting`)

File: `title/title.jpg`.

```text
on the right a high stone terrace on a sea cliff with a great bronze armillary sphere taller than a man, one small robed figure beside it seen from behind, far below a long coast with four small cities of different building traditions, the left half of the picture is open deep ultramarine sky with one pale daytime crescent moon and one small star, towering apricot-lit cumulus clouds only on the right, a low warm sun out of frame at the left, flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm late-afternoon sun from the left, cream and salmon-orange stone, blue-violet shadows, deep ultramarine sky, towering apricot-lit cumulus clouds, dark olive cypress and pines, matte, very little fine detail --ar 21:9 --no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

## 12. Possible later (list only)

These moments have no painting slot today. Each would use one 16:9 painting, shown again each time the moment occurs.

- A capital is taken.
- A seat is eliminated.
- War is declared.
- Peace is made.

## 13. What not to paint

| Thing | Why |
|---|---|
| Technologies | The star chart is the picture of that screen. |
| The city screen | The town on the board is the picture. Only the small wonder thumbnail shows a painting there. |
| Orders (the cards) | An Order has its engraved device and no painting. |
| Units | A unit is a piece on the board. It has no painting. |
| Tiles, resources, improvements | Drawn marks only. |
| Toasts, the build queue, tables, tooltips | Your ruling: a painted thing has its own screen. |
| Rites and consecrations | They have no art slot. |

## 14. What I am unsure of

- **Midjourney details.** I believe `--sw` goes from 0 to 1000 with a default of 100, and that `--ar 3:1` and `--ar 21:9` are accepted. I did not check the current documentation. The name of the character reference depends on the version.
- **How the style reference works with portraits.** The wonder paintings have no faces. The first portraits can need several tries.
- **Likenesses.** Most of these people have no portrait from life. The ages and faces in the prompts are my choices for a dignified figure, not records. Each prompt box says what is known.
- **The new leaders.** Eleven of the sixteen are not in `data/leaders.json` yet, so their file names wait for the build. Jayavarman VII's rules are not final; the person is chosen.
- **The abstract ages.** A style reference made of buildings and skies can work against a still life or a geometric picture. Take 3 is the nearest to the reference.
- **What each age opens.** The table in section 5 is from `data/techs.json` and from the part of the age goals that is for every player. The goals of five of the six decks are not written yet.
- **Dress of the less recorded people.** Piyamaradu, Ilimilku, Nanaivandak, Lamassī and Lautaro are described from what is known of their place and period, not of the person.
- **Dates.** The dates are the usual ones from memory. Many are approximate ("about"). Check a date before you print it anywhere.
- **Age V people.** I did not check if the 19 great people of age V can appear in a game today.
- **The belief vignette size.** The fourth mock-up says 62 px; the older plan says 120 px.
- **Folder names** for great people, governments, endings and the title are my proposals. Only `wonders/`, `leaders/`, `ages/` and `beliefs/` are in the README.

## 15. Quick reference

### The style block

```text
flat gouache painting on grained paper, simplified hard-edged planes of colour, no outlines, low warm late-afternoon sun from the left, cream and salmon-orange stone, blue-violet shadows, deep ultramarine sky, towering apricot-lit cumulus clouds, dark olive cypress and pines, matte, very little fine detail
```

### The end of every prompt

```text
--no text, lettering, writing, border, frame, black bars, letterbox, signature, watermark
```

### Shapes and folders

| Kind | `--ar` | Count | Masters | Game files |
|---|---|---|---|---|
| Wonders (done) | `16:9` | 34 | `art-masters/wonders/` | `public/art/splash/wonders/<id>.jpg` |
| Ages, endings | `16:9` | 4 + 2 | `art-masters/ages/`, `art-masters/endings/` | `ages/age1.jpg` to `age4.jpg`; `endings/win.jpg`, `loss.jpg` |
| Leaders | `3:4` | 16 | `art-masters/leaders/` | `leaders/<id>.jpg` |
| Great people | `5:6` | 78 (20 first) | `art-masters/people/` | `people/<id>.jpg` |
| Governments | `3:1` | 13 | `art-masters/governments/` | `governments/<id>.jpg` |
| Beliefs | `1:1` | 56 (23 first) | `art-masters/beliefs/` | `beliefs/<id>.jpg` |
| Title | `21:9` | 1 | `art-masters/title/` | `title/title.jpg` |

### Five rules

1. Subject first, then setting, light, style, parameters.
2. One shape, one style reference and one set of values for each set.
3. Keep the edges quiet. Keep the head below the arch. Keep the bottom third of an age dark.
4. Never write "poster", "print", "card", "cinematic" or "detailed".
5. Describe a person by role, period dress and setting. Be careful and dignified.
