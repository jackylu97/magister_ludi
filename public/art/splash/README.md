# Splash art

Put finished paintings here. The style ruling and the list of places a
painting shows are in `docs/splash-art.md`.

| Folder | What | Shape | Size to deliver | File name |
|---|---|---|---|---|
| `wonders/` | One painting a wonder, written by `scripts/splashArt.py` | 16:9 | made from the master, at most 1600 wide | the wonder's id, for example `greatSphinx.jpg` |
| `leaders/` | One portrait a leader | 3:4 | 960 x 1280 | the leader's id, for example `pachacuti.jpg` |
| `ages/` | Three sets of four age paintings (`form`, `still`, `abstract`), written by `scripts/splashArt.py ages`; a game shows one set | 16:9 | made from the master, at most 1600 wide | the set and the age, for example `form2.jpg` |
| `endings/` | The ending page's painting: `win.jpg` and `loss.jpg`, written by `scripts/splashArt.py endings` | 16:9 | made from the master, at most 1600 wide | `win.jpg`, `loss.jpg` |
| `beliefs/` | One vignette a belief, written by `scripts/splashArt.py beliefs` | 1:1 | made from the master, 480 x 480 | the belief's id, for example `sacredFire.jpg` |
| `people/` | One portrait a great person, written by `scripts/splashArt.py people` | 5:6 | made from the master, 720 x 864 | the person's id, for example `imhotep.jpg` |
| `title/` | The title screen's painting. None yet: the page shows a stand-in | 16:9 | at most 1600 wide | `title.jpg` |
| `governments/` | One banner painting a government | 3:1 | 990 x 330 | the government's id, for example `imperium.jpg` |

- Use JPEG (quality about 85) or WebP for the files in this folder. Keep
  each under about 600 KB; the game loads them in the browser.
- Keep full-size source files in `art-masters/` at the repo root (for wonders,
  `art-masters/wonders/`). Git ignores that folder, and it is outside
  `public/`, so the files stay on this machine and a build does not copy them.

## How a wonder's painting is cut

- The full-screen wonder plate shows the whole 16:9 painting.
- The In play screen shows a 2:1 window cut from the centre. It keeps the full
  width and loses about 5.6% of the height at the top and at the bottom. Keep
  anything important out of those two bands.

## How a wonder's painting gets into the game

1. Put the full-size picture in `art-masters/wonders/` under any name.
2. Add its name and the wonder's id to the `NAMES` table in
   `scripts/splashArt.py`.
3. Run `python3 scripts/splashArt.py` from the repo root (it needs Pillow). It
   cuts off a black border if there is one, cuts the picture to 16:9, and
   writes `wonders/<wonder id>.jpg`.
4. Add the id to the list in `src/ui/wonderPaintings.ts`. A test fails if the
   list and the folder disagree.

The painting then shows on the full-screen wonder plate and on the wonder's
piece on the In play screen. A wonder without a painting shows the engraved
stand-in.

## The age paintings

The twelve age paintings are wired. The age plate (`src/ui/agePlate.ts`)
shows the painting for the age on the ribbon over the board: when the world's
age turns over, and once for age I when a new game starts.

- A game shows one set: `form`, `still` or `abstract`. The set comes from a
  hash of the game's seed (`agePaintingSet` in `src/ui/agePaintings.ts`), so
  the same game shows the same set after a load, and the next game may show
  another.
- The plate shows the whole 16:9 painting. The words take up to the lower
  third: the age's numeral, name and line at the left, and the deeds and
  Continue at the right. A dark fade under them starts a little higher, so
  keep the subject of a painting out of its lower third.
- `src/ui/agePaintings.ts` names the twelve files, and a test
  (`test/ui/agePaintings.test.ts`) fails if the list and the folder disagree.
  To add or replace a painting, run `python3 scripts/splashArt.py ages` and
  keep the file name `<set><age>.jpg`. A new set also needs its name in
  `AGE_PAINTING_SETS`.
- If a painting is missing or does not load, the plate shows the lapis age
  page without a picture.

## The ending paintings

The two ending paintings are wired. The ending page of the Opus close
(`src/ui/opusClose.ts`) covers the whole window with one of them, cut from the
centre: `win.jpg` for the seat that closed the Great Work, `loss.jpg` for every
other seat. `src/ui/endingPaintings.ts` names the two files, and a test fails
if the list and the folder disagree. The lower third of the page is under a
dark fade, with the words at the left and the doors at the right, so keep the
subject of a painting out of its lower third.

## The title painting

The title screen (`src/ui/titlePainting.ts`, frame a8 of the Quiet Table
boards) shows one painting across the full width of the window, with the
game's name on its sky at the left. No title painting exists yet.

- Deliver one 16:9 picture, at most 1600 wide (1600 x 900), as
  `title/title.jpg` (JPEG, quality about 85).
- About 5:2 of it shows: the full width, cut from the middle of its height.
  At 1440 x 900, about a seventh of the height is cut at the top and a
  seventh at the foot; a shorter window cuts a little more. Put the subject
  in the middle band.
- The name, a small ornament and the tag line sit on the left part of the
  sky, over a soft dark fade. Keep the left half of the upper part quiet, as
  a sky.
- Add `'title'` to `TITLE_PAINTINGS` in `src/ui/titlePainting.ts`. A test
  (`test/ui/titlePainting.test.ts`) fails if the list and the folder disagree.

Until the file exists, the page shows the game's own title picture, the
painted town of the earlier banner (`/art/frontispiece.jpg`). If no picture
loads, the page shows that banner in its old form with the same buttons under
it.

## How a great person's portrait gets into the game

The great person card (the offer and the Reliquary) has an arched picture
window of 5:6. The first twenty portraits arrived on 2026-11-19. A person with
no portrait shows their family's emblem in the window.

1. Put the full-size portrait in `art-masters/people/` under any name. Make it
   5:6. The window's top is a round arch, so keep the face out of the two
   top corners.
2. Add its name and the person's id to the `PEOPLE` table in
   `scripts/splashArt.py`.
3. Run `python3 scripts/splashArt.py people` from the repo root. It cuts off a
   black border or a paper mount if there is one, cuts the picture to 5:6
   (keeping the top, where the head is), and writes `people/<person id>.jpg`
   at 720 by 864.
4. Add the id to the list in `src/ui/greatPersonPaintings.ts`. A test fails if
   the list and the folder disagree.

The portrait then shows in the window of that person's card, in the offer and
in the Reliquary.

## How a government's painting gets into the game

A government is shown as a banner (`src/ui/governmentBanner.ts`): on the
government offer and on the Council screen's government seat. The banner has
a picture window of 3:1. On the offer the window is 330 x 110; on the Council
screen it is the width of the government's column, about 180 x 60. No
painting exists yet, so every window shows the drawn mark: the engraved seal
with the crown, with the government's name and tier beside it.

1. Make the painting 3:1, at 990 x 330 or larger. The window shows the whole
   picture, cut from the centre if the shape is a little off.
2. The government's name and tier sit at the foot of the window, over a dark
   fade that covers about the lower half. Keep the subject in the upper half.
3. Save it as `governments/<government id>.jpg` (JPEG, quality about 85). The
   ids are in the table at the foot of this page.
4. Add the id to the list in `src/ui/governmentPaintings.ts`. A test
   (`test/ui/governmentPaintings.test.ts`) fails if the list and the folder
   disagree.

The painting then shows in the window of that government's banner, on the
offer and on the Council screen.

## How a leader's portrait gets into the game

The setup's leader step has a portrait window of 3:4 beside the list of
leaders. At 1440 x 900 the window is about 330 x 440. No portrait exists yet,
so the window shows the seat's charge on a parchment plate over the seat's
ink.

1. Make the portrait 3:4, at 960 x 1280 or larger. The window has square
   corners and shows the whole picture.
2. Save it as `leaders/<leader id>.jpg` (JPEG, quality about 85). The ids
   are in the table at the foot of this page.
3. Add the id to the list in `src/ui/leaderPortraits.ts`. A test
   (`test/ui/leaderPortraits.test.ts`) fails if the list and the folder
   disagree.

The portrait then shows in the window when that leader is chosen.

## How a belief's vignette gets into the game

On the Faith sheet's Bonuses tab, each god, each belief and the holy city is a
tablet with a round window of 1:1. The 23 pantheon beliefs have a vignette
(2026-11-19). A belief with none shows the drawn belief mark, and the holy
city shows its own mark.

1. Put the full-size picture in `art-masters/beliefs/` under any name. Make it
   1:1. The window is a circle, so keep anything important inside the circle
   that touches the four edges.
2. Add its name and the belief's id to the `BELIEFS` table in
   `scripts/splashArt.py`. The ids are the keys of `beliefs` in
   `data/religion.json`.
3. Run `python3 scripts/splashArt.py beliefs` from the repo root. It writes
   `beliefs/<belief id>.jpg` at 480 by 480.
4. Add the id to the list in `src/ui/beliefPictures.ts`. A test
   (`test/ui/beliefPictures.test.ts`) fails if the list and the folder
   disagree.

The vignette then shows in the window of that belief's tablet. The holy city's
tablet keeps its mark.

## Wonder ids

The wonders rework (`docs/plans/wonders-review-2026-11-18.md`) is not built
yet. The ids marked "new" are the ones its spec proposes, and the builder may
still change them. The Water Clock of Su Song is being retired.

| File name | Wonder |
|---|---|
| `theOracle.jpg` | The Oracle |
| `stonehenge.jpg` | Stonehenge |
| `pyramids.jpg` | The Pyramids |
| `hangingGardens.jpg` | The Hanging Gardens |
| `wallsOfUruk.jpg` | The Walls of Uruk |
| `greatZiggurat.jpg` | The Great Ziggurat |
| `greatLighthouse.jpg` | The Great Lighthouse |
| `templeOfArtemis.jpg` | The Temple of Artemis |
| `greatLibrary.jpg` | The Great Library |
| `colossus.jpg` | The Colossus |
| `petra.jpg` | Petra |
| `circusMaximus.jpg` | The Circus Maximus |
| `terracottaArmy.jpg` | The Terracotta Army |
| `greatWall.jpg` | The Great Wall |
| `theatreOfDionysus.jpg` | The Theatre of Dionysus |
| `mausoleum.jpg` | The Mausoleum |
| `statueOfZeus.jpg` | The Statue of Zeus |
| `chichenItza.jpg` | Chichen Itza |
| `hagiaSophia.jpg` | Hagia Sophia |
| `angkorWat.jpg` | Angkor Wat |
| `greatMosqueOfDjenne.jpg` | The Great Mosque of Djenné |
| `notreDame.jpg` | Notre-Dame |
| `houseOfWisdom.jpg` | The House of Wisdom |
| `forbiddenCity.jpg` | The Forbidden City |
| `alhambra.jpg` | The Alhambra |
| `machuPicchu.jpg` | Machu Picchu |
| `solomonsTemple.jpg` | Solomon's Temple (new) |
| `greatStelaeOfAksum.jpg` | The Great Stelae of Aksum (new) |
| `greatSphinx.jpg` | The Great Sphinx (new) |
| `templeOfThoth.jpg` | The Temple of Thoth (new) |
| `pyramidOfTheSun.jpg` | The Pyramid of the Sun (new) |
| `ironPillar.jpg` | The Iron Pillar (new) |
| `weiyangPalace.jpg` | The Weiyang Palace (new) |
| `libraryOfAshurbanipal.jpg` | The Library of Ashurbanipal (new) |

## Leader ids

| File name | Leader |
|---|---|
| `pachacuti.jpg` | Pachacuti |
| `taizong.jpg` | Emperor Taizong |
| `modu.jpg` | Modu Chanyu |
| `akhenaten.jpg` | Akhenaten |
| `almamun.jpg` | Al-Ma'mun |
| `mithridates.jpg` | Mithridates VI |
| `joan.jpg` | Joan of Arc |
| `mansaMusa.jpg` | Mansa Musa |
| `zhengHeOfMing.jpg` | Zheng He |
| `nezahualcoyotl.jpg` | Nezahualcoyotl |
| `hypatiaOfAlexandria.jpg` | Hypatia |
| `hildegard.jpg` | Hildegard of Bingen |
| `ibnBattutaOfTangier.jpg` | Ibn Battuta |

## Government ids

The thirteen governments a game can offer. Four more rows are retired and are
never offered, so they need no painting.

| File name | Government |
|---|---|
| `chiefdom.jpg` | Chiefdom |
| `councilOfElders.jpg` | Council of Elders |
| `warChief.jpg` | War Chief |
| `priestKing.jpg` | Priest-King |
| `republic.jpg` | Republic |
| `tyranny.jpg` | Tyranny |
| `aristocracy.jpg` | Aristocracy |
| `merchantLeague.jpg` | Merchant League |
| `imperium.jpg` | Imperium |
| `divineMandate.jpg` | Divine Mandate |
| `theEstates.jpg` | The Estates |
| `theSultanate.jpg` | The Sultanate |
| `theCuria.jpg` | The Curia |

## How a leader's portrait gets into the game

The setup's leader card and the diplomacy screen show a leader's portrait in a
3:4 window. Fifteen leaders have one (2026-11-21). A leader with none shows the
seat's charge on its ink.

1. Put the full-size picture in `art-masters/leaders/` under any name. Make it
   3:4. The cut keeps the top of the picture, where the head is.
2. Add its name and the leader's id to the `LEADERS` table in
   `scripts/splashArt.py`. The ids are the keys of `data/leaders.json`. Where
   two versions exist, the table names the one in use.
3. Run `python3 scripts/splashArt.py leaders` from the repo root. It trims a
   paper mount, and writes `leaders/<leader id>.jpg` at 720 by 960. A frame
   that the trim cannot see goes in the `INSETS` table.
4. Add the id to the list in `src/ui/leaderPortraits.ts`. A test
   (`test/ui/leaderPortraits.test.ts`) fails if the list and the folder
   disagree.
