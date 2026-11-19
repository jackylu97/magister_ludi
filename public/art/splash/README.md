# Splash art

Put finished paintings here. The style ruling and the list of places a
painting shows are in `docs/splash-art.md`.

| Folder | What | Shape | Size to deliver | File name |
|---|---|---|---|---|
| `wonders/` | One painting a wonder, written by `scripts/splashArt.py` | 16:9 | made from the master, at most 1600 wide | the wonder's id, for example `greatSphinx.jpg` |
| `leaders/` | One portrait a leader | 3:4 | 960 x 1280 | the leader's id, for example `pachacuti.jpg` |
| `ages/` | One plate an age | 16:9 | 2560 x 1440 | `age1.jpg` to `age4.jpg` |
| `beliefs/` | One vignette a belief | 1:1 | 480 x 480 | the belief's id |
| `people/` | One portrait a great person | 5:6 | 600 x 720 | the person's id, for example `imhotep.jpg` |

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
stand-in. Leaders, ages and beliefs are not wired yet.

## How a great person's portrait gets into the game

The great person card (the offer and the Reliquary) has an arched picture
window of 5:6. No portrait exists yet, so every card shows its family's emblem
in the window.

1. Make the portrait 5:6, at 600 x 720 or larger. The window's top is an arch,
   so keep the face and anything important out of the two top corners.
2. Save it as `people/<person id>.jpg` (JPEG, quality about 85).
3. Add the id to the list in `src/ui/greatPersonPaintings.ts`. A test fails if
   the list and the folder disagree.

The portrait then shows in the window of that person's card, in the offer and
in the Reliquary.

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
