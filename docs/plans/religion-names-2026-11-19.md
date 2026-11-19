# Religion names: a proposal (2026-11-19)

The user, on the name "The Children of Elder and Cloud" in a mock-up of the faith
screen: "could we do a naming pass, lets make these religion names way shorter.
They can be proper nouns that just sound arcane/cool, or reference obscure
religions from history"

The user, on the first list: "i like the direction for the religion names a lot, but i'd prefer if they sounded like the name of a religion, not a specific god." The ruling is in `docs/flags.md`, section "Religion names: short names that sound like a religion (2026-11-19)": a name is one or two words; it reads as the name of a religion, a sect, a school or a mystery, not as the name of one god or of a place; it can be a real, obscure and extinct tradition from any culture, or an invented name that sounds like one; no living faith. Nothing is built until the user has chosen the names. This file is the second list, made to that ruling.

This is a proposal. It changes no data and no code. The page for comments is built
by a script in the scratchpad (`religion-names/build.py`), which also wrote this file.

## 1. How a name is made today

- **Where the name is made.** `generateReligionName` in `src/sim/religion.ts`, called only by `foundReligion`, which runs when a prophet plants the first holy site (`plantHolySiteAt`). The name is stored on `Religion.name`.
- **The data.** `data/religion.json` `names`: 4 epithets for each of the 10 pantheon axes, and 3 patterns ("the {0} Cult", "the Way of the {0}", "the Children of {0} and {1}").
- **The RNG draws.** The function calls `nextFloat(state.rng)` 2 times for a pantheon with one axis (the pattern, then one epithet) and 3 times for a pantheon with two or more axes (the pattern, the first epithet, the second epithet). The second epithet is drawn even when the pattern has one slot.
- **Unique names.** No rule makes a name unique. A one-axis pantheon has only 8 possible names, so two empires with the same first axis can get the same name.
- **How many religions.** `maxReligions` is two thirds of the real seats, rounded up. The largest game has 12 seats, so the most is 8. One empire founds one religion at most.
- **Rename.** The founder can rename the religion on the faith sheet (`renameReligion` command, `RELIGION_NAME_LIMIT` = 40 letters). The rename has no uniqueness rule. The bots do not rename.
- **Length today.** The shortest name is 12 characters ("the Sky Cult"). The longest is 37 ("the Children of Wayfarer and Hoarfrost"). The name in the mock-up is 31.
- **An earlier ruling.** The docblocks and `docs/religion-v2.md` record a ruling of 2026-08-27: "keep religions fluid / not tied to historical world religions", and the code comment adds "never a fixed roster". The ruling of 2026-11-19 in `docs/flags.md` replaces the roster part: a fixed list of names is now allowed, and the names are still not the world religions that people practise.

### Where the name prints

| Place | Code | Room |
| --- | --- | --- |
| Faith sheet title | `src/ui/followersTab.ts` `drawName` | A text field at 22px, the full width of the head. Holds 40 characters. |
| Founding and enhancing toasts | `src/ui/notifications.ts` | "You founded X", "Ada founded X", "X is enhanced". A sentence, so it wraps. A short name keeps it on one line. |
| Conversion toast | `src/ui/notifications.ts` | "Thebes now follows Ada's X". The code removes a leading "the". |
| Holy site and proclamation messages | `src/ui/controls.ts` | Sentences in the message log. |
| City banner plate | `src/ui/faithPlates.ts` `religionDevice` | One letter only: the first letter of the name after "the". Two religions with the same first letter get the same plate letter. |
| Faith lens card and tooltip | `src/ui/faithHover.ts` | The name starts a row beside figures. About 16 characters fit without a wrap (my estimate, not measured). |
| City panel faith row | `src/ui/cityPanel.ts` | A narrow column (the mock-up panel is 286px wide). About 14 characters fit beside the figures (estimate). |
| Bonuses tab | `src/ui/bonusesTab.ts` | Small eyebrow lines: "a follower belief of X", "holy city · X", "founder's share · X". |
| Rites tab | `src/ui/ritesTab.ts` | "follows X" in a town row. |
| In play screen | `src/ui/inPlayPieces.ts` | The sub-line of the holy city piece and of each enhancer belief. |
| Every yield list | `src/sim/statecraft/evaluator.ts` | The label "Religion · X" on each line that a religion pays. |
| Refusal sentence | `src/sim/religion.ts` | "X has all the beliefs it will hold". |
| Bot spectator feed | `src/ai/wants.ts` | The bot names the religion in its reasons. |

I found no print of the religion name in the chronicle or on the 3D board. The board shows the pantheon marks, not the name.

### Pantheon and belief names

- The 24 pantheon beliefs, 17 follower beliefs, 18 enhancer beliefs, 11 rites and 6 consecrations have names of 1 to 4 words ("River Mother", "Feast Days", "The Pulse of Bells"). The longest is "Consecration of the Bounds" at 26 characters. They are titles of cards, not strings inside sentences, so they do not have the same problem.
- A few are in the older voice or longer than their neighbours: "Consecration of the Bounds", "Restoring of the Host", "Oracle of the Crossroads", "Guild of the Faithful", "Goddess of the Harvest". A naming job on them is an option, not part of this proposal.
- A separate point for the world frame: some belief names come from living faiths (Minarets, Cathedrals of the Sky, Desert Fathers, Inquisition, The Crusade, Rite of the Sabbath, Apostles). They are generic words in the genre, and I propose no change, but the rule that I used for religion names would strike them.

## 2. The options

- **A. A roster of historical names.** One list of short names in `data/religion.json`. Each is an extinct religion, sect, school, order or mystery. Each row has an axis. At founding the game picks one name that no religion in the game uses. If names with one of the pantheon's axes are free, it picks from those. If none are free, it picks from all free names.
  - Code: One RNG draw, always. The 3 patterns and the 40 epithets go away.
- **B. Invented names built to a rule.** A root from an old word for the thing of the axis (Latin, Greek or Akkadian), plus an ending that marks a following: "-ari" or "-ites". Either the game builds the name at founding (two draws: the root, the ending) or we write the results as a roster (one draw, the same code as A).
  - Code: As a roster: the same code as A. Built at founding: two draws and a rule that avoids a name in use.
- **C. A mixed roster.** The roster of A, with invented names added where history gives few good names. The frost axis is the clear case, and stone and sun are thin.
  - Code: The same code as A.

**Recommendation.** I recommend C: the historical roster, plus invented names for frost. The historical names have more character than names that I can invent, each one has a true story for a tooltip, and the code is the same for all three options. The smallest change of all is one flat list with no axis and one draw. The axis preference costs about six more lines and keeps today's idea that a religion looks like its pantheon. A roster of 9 or more names can never run out, because a game holds 8 religions at most. So a generated fallback is not necessary.

## 3. The names

64 historical candidates. FAV marks the 20 favourites. The game needs 9 at
least. About 30 is a good roster. The sources are from memory, and the Note column
says where the knowledge is thin or where a name is near a living tradition.

The rules for a name:

- The name is the thing that people belong to: a religion, a sect, a school, an order or a mystery. Not one god, not a place, not an object.
- Where the tradition had its own name, I used it (Ajivika, Mojia, Selloi, Salii, Pochteca). Where English has a short name for it, I used that (Atenism, Orphism, Harranians). Three names need a second word (Kotosh Rite, Chavin Cult, Kabeiric Rite) and are marked as labels.
- One or two words, 14 characters at most. No article: the name works in "follows X" and "a belief of X".
- No living faith, and no sect of Christianity, Judaism, Islam, Hinduism or Buddhism, extinct or not. A note marks each name that is near a living tradition.
- Plain letters only (no accents), so every font of the game can print the name.
- No clash with the game: I searched `data/` for every candidate and found no town, leader, wonder, belief or card with the same name.

### Hearth

| Name | Fav | Length | Say | Source | Note |
| --- | --- | --- | --- | --- | --- |
| Nongjia | FAV | 7 | NOONG-jyah | The School of the Tillers, China, 4th to 3rd century BCE. It taught that a ruler must work the fields beside his people. It died out under the Han. |  |
| Epulones |  | 8 | eh-PYOO-loh-nays | The Roman college of priests who set out the sacred feasts of the gods. |  |
| Arvals |  | 6 | AR-vals | The Arval Brethren, twelve Roman priests who made the yearly offerings for the fields. |  |
| Vestals |  | 7 | VES-tals | The six priestesses who kept the fire of Rome alight. The college closed in 394 CE. | Well known, not obscure. |
| Marzeah |  | 7 | mar-ZAY-ah | A feasting society of the West Semitic world, from Ugarit (14th century BCE) to Palmyra (3rd century CE). Members met to eat and drink under a patron god. | My knowledge is thin here. Scholars disagree about what it did. |
| Eleusinia |  | 9 | el-yoo-SIN-ee-ah | The rites of Demeter and Persephone at Eleusis near Athens, from before 600 BCE until about 392 CE. | The Greeks called the secret rites "the Mysteries". "Eleusinia" was the name of a festival at the same place. |
| Kotosh Rite |  | 11 | KOH-tosh | A tradition of the Peruvian highlands, about 3000 to 1800 BCE. Its rites were held around a sunken fire pit in a small sealed room. | A label that scholars use, not a name the people used.  |

### Sky

| Name | Fav | Length | Say | Source | Note |
| --- | --- | --- | --- | --- | --- |
| Harranians | FAV | 10 | hah-RAH-nee-ans | The star-worshippers of the city of Harran in upper Mesopotamia, who kept their temples of the moon and planets until about the 11th century CE. |  |
| Zurvanism | FAV | 9 | zoor-VAHN-izm | A school in Sasanian Iran, 3rd to 7th century CE, which put Boundless Time above all other powers. It is extinct. | It was a branch of Zoroastrianism, which is a living faith. |
| Haruspices | FAV | 10 | hah-RUS-pih-kays | The Etruscan diviners, who read the will of the gods in lightning and in the organs of animals. Rome kept a college of them. |  |
| Yinyangjia |  | 10 | yin-yahng-JYAH | The School of Yin and Yang, China, 3rd century BCE. It explained history by the cycles of heaven and the five phases. |  |
| Sabaziasts |  | 10 | sah-BAY-zee-asts | The clubs of worshippers of the Phrygian sky god in Greek cities, known from inscriptions. | My knowledge is thin here.  |

### Stone

| Name | Fav | Length | Say | Source | Note |
| --- | --- | --- | --- | --- | --- |
| Dactyls | FAV | 7 | DAK-tils | The Dactyls of Mount Ida, a brotherhood of smiths and sorcerers in Greek myth who found how to work iron. | A body of myth, not a recorded sect. |
| Galli | FAV | 5 | GAL-ee | The priests of the Mountain Mother of Phrygia, later at Rome, from about the 3rd century BCE to the 4th century CE. | It looks like the Latin word for the Gauls. |
| Metragyrtai |  | 11 | meh-trah-GUR-ty | The begging priests of the Mountain Mother, who walked from town to town in Greece. | My knowledge is thin here.  |
| Chavin Cult |  | 11 | chah-VEEN | The religion of the temple at Chavín de Huántar in the Peruvian Andes, about 900 to 200 BCE, which spread along the coast and the mountains. | A label that scholars use, not a name the people used.  |

### Wild

| Name | Fav | Length | Say | Source | Note |
| --- | --- | --- | --- | --- | --- |
| Selloi | FAV | 6 | SEL-oy | The priests of the oak oracle at Dodona in Epirus. Homer says that they slept on the ground and did not wash their feet. |  |
| Arktoi | FAV | 6 | ARK-toy | "The Bears", the girls who served the goddess of the wild at Brauron near Athens, 6th to 4th century BCE. |  |
| Hirpi |  | 5 | HEER-pee | "The Wolves" of Mount Soracte in Italy, priests who walked across hot coals each year. | My knowledge is thin here. Two or three Roman writers only. |
| Luperci |  | 7 | loo-PER-kee | The Roman priests of the Lupercalia, who ran from the cave of the she-wolf each February. |  |
| Maenads |  | 7 | MEE-nads | The women who followed the god of wine into the hills, in Greek myth and in real rites. | Well known. |
| Thiasos |  | 7 | THEE-ah-sos | The Greek word for a band of worshippers who danced for a god in the open country. | A common noun, not one sect. |
| Orgeones |  | 8 | OR-gee-oh-nays | The clubs of Athens that kept the rites of a hero or a foreign god, such as the Thracian goddess of the hunt. | My knowledge is thin here.  |

### Water

| Name | Fav | Length | Say | Source | Note |
| --- | --- | --- | --- | --- | --- |
| Apkallu | FAV | 7 | ap-KAL-oo | The seven sages of Mesopotamian tradition, who came out of the deep water before the flood to teach the crafts. | A body of myth. Later priests claimed descent from them. |
| Isiacs |  | 6 | EYE-see-aks | The initiates of the mysteries of Isis in the Roman world, 1st to 4th century CE. Each spring they launched a ship to open the sailing season. | A few people honour Isis today. |
| Kabeiric Rite |  | 13 | kah-BAY-rik | The mysteries of the Great Gods on Samothrace and Lemnos. Sailors took them for a safe crossing. | A label that scholars use, not a name the people used.  |
| Telchines |  | 9 | tel-KY-neez | A brotherhood of smiths and sorcerers of Rhodes in Greek myth, children of the sea. | A body of myth. |
| Ogdoad |  | 6 | OG-doh-ad | The teaching of Hermopolis in Egypt about the eight first powers: the water, the dark and the hidden before creation. | Strictly it is a group of eight gods. It reads like an order, so I kept it for your decision. |
| Hydrophoroi |  | 11 | hy-DROF-oh-roy | "The water-bearers", an office of priestesses at the oracle of Didyma in Asia Minor. | My knowledge is thin here.  |
| Arioi |  | 5 | ah-ree-OY | A society of Tahiti and the islands near it. Its members travelled by canoe as performers. It ended in the early 19th century. | My knowledge is thin here. It belongs to a living people, so ask before you keep it. |

### War

| Name | Fav | Length | Say | Source | Note |
| --- | --- | --- | --- | --- | --- |
| Salii | FAV | 5 | SAH-lee-ee | The leaping priests of Mars, who carried twelve sacred shields through Rome each March. |  |
| Korybantes | FAV | 10 | kor-ih-BAN-teez | The armed dancers of the Phrygian Mother, who danced in armour to drums. Greek cities had rites in their name. |  |
| Bellonarii |  | 10 | bel-oh-NAH-ree-ee | The priests of the Roman goddess of war, who cut their own arms in her rites. | My knowledge is thin here.  |
| Kouretes |  | 8 | koo-REE-teez | The armed dancers of Crete in Greek myth. A college of priests at Ephesus later took the name. |  |
| Mithraism |  | 9 | MITH-rah-izm | A Roman mystery cult, 1st to 4th century CE, popular with soldiers. Its temples were built as caves and it had seven grades. | Less obscure. The Roman cult is extinct, but Zoroastrians still honour the older Iranian Mithra. |
| Hwarang |  | 7 | hwah-RAHNG | The "flower youths" of Silla in Korea, 6th to 10th century: an order of young nobles trained for war with their own rites. | An order, not a religion. The word is well known in Korea today. |

### Road

| Name | Fav | Length | Say | Source | Note |
| --- | --- | --- | --- | --- | --- |
| Pochteca | FAV | 8 | poch-TEH-kah | The Aztec guild of long-distance merchants, 14th to 16th century, with its own god and its own rites before a journey. |  |
| Theoroi | FAV | 7 | thee-oh-ROY | The sacred envoys that Greek cities sent by road and sea to oracles and festivals. |  |
| Agyrtai |  | 7 | ah-GUR-ty | The wandering priests of Greece, who went from door to door with charms and purifications. |  |
| Fetials |  | 7 | FEE-shals | The Roman priests who walked to a border to make a treaty or to declare a war. |  |
| Peripatetics |  | 12 | per-ih-pah-TET-iks | "Those who walk about", the school of Aristotle at Athens from 335 BCE. | A school of philosophy, and well known. |

### Sun

| Name | Fav | Length | Say | Source | Note |
| --- | --- | --- | --- | --- | --- |
| Atenism | FAV | 7 | AH-ten-izm | The religion of the sun disc, which the pharaoh Akhenaten made the only cult of Egypt about 1350 BCE. It ended after his death. |  |
| Manichee | FAV | 8 | MAN-ih-kee | The religion of Light and Dark that Mani founded in Persia in the 3rd century CE. It spread from Rome to China and is extinct. Its followers prayed toward the sun. |  |
| Shemsu Hor |  | 10 | SHEM-soo HOR | "The Followers of Horus", the half-divine rulers that Egyptian tradition put before the first king. | A body of legend. A few people honour Horus today. |
| Mingjiao |  | 8 | ming-JYOW | The "Teaching of Light", the Chinese name of the religion of Mani, in China from the 7th century until about the 14th or later. | My knowledge is thin here. One temple in Fujian still honours Mani as a local figure. It is also the same religion as Manichee. |

### Frost

| Name | Fav | Length | Say | Source | Note |
| --- | --- | --- | --- | --- | --- |
| Hyperboreans |  | 12 | hy-per-BOR-ee-ans | The people beyond the North Wind in Greek myth, who sent offerings to the shrine of Apollo on Delos. | A people of myth, not a religion. I kept it because history gave me no frost sect that I trust. |

### No axis (hidden teaching)

| Name | Fav | Length | Say | Source | Note |
| --- | --- | --- | --- | --- | --- |
| Ajivika | FAV | 7 | ah-JEE-vih-kah | An Indian school of ascetics, founded in the 5th century BCE. It taught that fate fixes everything. It died out by about the 14th century. |  |
| Mojia | FAV | 5 | MOH-jyah | The School of Mo, in China from the 5th to the 3rd century BCE. It taught equal care for all people, the will of Heaven, and the defence of cities. It died out under the Han. |  |
| Fangshi | FAV | 7 | FAHNG-shur | The "masters of methods" of Qin and Han China: diviners, healers and alchemists who served the courts. | A class of experts, not a religion. |
| Orphism | FAV | 7 | OR-fizm | The mystery teaching under the name of Orpheus, in the Greek world from the 6th century BCE. It taught that the soul is born many times. |  |
| Epoptai | FAV | 7 | eh-POP-ty | "Those who have seen", the highest grade of initiates in the Greek mysteries at Eleusis and Samothrace. |  |
| Eleatics |  | 8 | el-ee-AT-iks | The school of Parmenides at Elea in Italy, 5th century BCE. It taught that all things are one and that change is not real. | A school of philosophy. |
| Theurgy |  | 7 | THEE-ur-jee | The rites of the late Platonist schools, 3rd to 6th century CE, which called the gods into statues and into the soul. | A practice, not a body of people. |
| Hermetism |  | 9 | HER-meh-tizm | The teaching under the name of Hermes Trismegistus, written in Egypt in the 1st to 3rd centuries CE. | Some occult groups follow it today. |
| Pythagoreans |  | 12 | py-thag-oh-REE-ans | The brotherhood that Pythagoras founded at Croton in Italy about 530 BCE, with rules of silence, diet and number. | Well known. |
| Lokayata |  | 8 | loh-KAH-yah-tah | An Indian school of materialists, from about the 6th century BCE, which denied a life after death. Its own books are lost. | It denied religion, so it is a joke as the name of one. |
| Ajnana |  | 6 | uj-NYAH-nah | An Indian school of sceptics in the 5th century BCE, which held that nobody can know the answers to the great questions. | My knowledge is thin here.  |
| Mazdakites |  | 10 | MAZ-dah-kites | The followers of Mazdak in Sasanian Iran about 500 CE, who taught that property must be shared. The court destroyed them about 528. | It began as a reform of Zoroastrianism, which is a living faith. |
| Hypsistarians |  | 13 | hip-sis-TAIR-ee-ans | The worshippers of one "Highest God" in Asia Minor and on the Black Sea coast, about 2nd century BCE to 4th century CE. | Some scholars link them to Jewish communities. |
| Huang-Lao |  | 9 | hwahng-LOW | The school of the Yellow Emperor and Laozi, which guided the early Han court in the 2nd century BCE. | It fed into Daoism, which is a living faith. |
| Kapnobatai |  | 10 | kap-noh-BAH-ty | "The smoke-walkers", holy men of the Mysians and Thracians who ate no meat. The geographer Strabo names them. | My knowledge is thin here.  |
| Enarei |  | 6 | eh-NAH-ray | The Scythian diviners in Herodotus, who told the future with strips of bark. | My knowledge is thin here.  |
| Filid |  | 5 | FIL-ith | The poet-seers of early Ireland, a learned order that kept law, verse and prophecy. | My knowledge is thin here.  |
| Volkhvy |  | 7 | VOLKH-vee | The pagan priests and seers of the early Slavs, who led risings in Rus in the 11th century. | Modern Slavic pagan groups use the word. |

### Option B samples: invented names

The rule: a root from an old word for the thing of the axis, plus an ending that marks a body of people or a following: "-ari" (a college, as in the real Bellonarii) or "-ites" (followers, as in Mazdakites). So the name reads as "the people of the hearth", not as a god. 6 to 10 letters. The meanings are loose.

Frost: I recommend invented names. History gave me no extinct sect of winter that I trust, only gods (Boreas, Khione) and living folklore. Put two or three invented frost names in the roster (Hiemari, Nivites and Gelari are my picks). If you do not want invented names, give frost no rows: the draw then gives a frost pantheon a name from the whole list, with no more code.

| Name | Axis | Length | Construction |
| --- | --- | --- | --- |
| Focari | hearth | 6 | Latin focus, a hearth |
| Kinunites | hearth | 9 | Akkadian kinunu, a brazier |
| Caelari | sky | 7 | Latin caelum, the sky |
| Asterites | sky | 9 | Greek aster, a star |
| Saxari | stone | 6 | Latin saxum, a rock |
| Lithites | stone | 8 | Greek lithos, a stone |
| Silvari | wild | 7 | Latin silva, a wood |
| Agrites | wild | 7 | Greek agrios, wild |
| Thalassari | water | 10 | Greek thalassa, the sea |
| Naharites | water | 9 | Semitic nahar, a river |
| Hastari | war | 7 | Latin hasta, a spear |
| Qarradites | war | 10 | Akkadian qarradu, a warrior |
| Viari | road | 5 | Latin via, a road |
| Hodites | road | 7 | Greek hodos, a road |
| Solari | sun | 6 | Latin sol, the sun |
| Shamshites | sun | 10 | Akkadian shamshu, the sun |
| Hiemari | frost | 7 | Latin hiems, winter |
| Nivites | frost | 7 | Latin nix (stem niv-), snow |
| Gelari | frost | 6 | Latin gelu, frost |
| Pagonites | frost | 9 | Greek pagos, frost |
| Kryptari | none | 8 | Greek kryptos, hidden |
| Silentites | none | 10 | Latin silentium, silence |

### Names from the first list that were dropped

- **Gods:** Tabiti, Kumarbi, Penates, Teshub, Tinia, Taranis, Anshar, Dushara, Matar, Potnia, Bendis, Arduinna, Artio, Oannes, Sequana, Coventina, Apedemak, Mahrem, Enodia, Shapash, Malakbel, Sol Invictus, Boreas, Khione, Marzanna, Cailleach, Zalmoxis, Serapis, Barbelo, Ennead.
- **Gods, changed to the name of the following:** Aten to Atenism, Zurvan to Zurvanism, Mithras to Mithraism, Sabazios to Sabaziasts, Kabeiroi to Kabeiric Rite, Hypsistos to Hypsistarians, Mazdak (a man) to Mazdakites.
- **Places:** Doliche, Emesa, Abzu, Hyperborea (the people are kept, with a note).
- **Places, changed to the name of the following:** Harran to Harranians, Eleusis to Eleusinia, Kotosh to Kotosh Rite, Chavin to Chavin Cult.
- **Objects, festivals and books:** Baetyl, Benben, Omphalos, Hermai, Nemeton, Compitalia, Devaraja, Orphica (changed to Orphism).
- **Other reasons:** Therapeutae (a Jewish community in its only source), Tlamatini (a word of a living people), Arval and Fetial (now the plurals Arvals and Fetials).

## 4. In the strings of the game

### Atenism, in place of "the Children of Elder and Cloud"

| Place | Today | Proposed |
| --- | --- | --- |
| Faith sheet, title and facts (src/ui/followersTab.ts) | the Children of Elder and Cloud · founded by you · holy city Cusco ✶ · 3 of 4 religions founded | Atenism · founded by you · holy city Cusco ✶ · 3 of 4 religions founded |
| Faith sheet head in the Quiet Table mock-up | The Children of Elder and Cloud · holy city Cusco ★ · followed in 5 towns | Atenism · holy city Cusco ★ · followed in 5 towns |
| Toast, your founding (src/ui/notifications.ts) | You founded the Children of Elder and Cloud | You founded Atenism |
| Toast, a town changes faith | Thebes now follows Ada's Children of Elder and Cloud | Thebes now follows Ada's Atenism |
| Town row in the faith lens (src/ui/faithHover.ts) | the Children of Elder and Cloud · 3 of 4 — Your capital +4 — 4 a turn | Atenism · 3 of 4 — Your capital +4 — 4 a turn |
| Town row in the city panel mock-up | Follows the Children of Elder and Cloud · 3 of 12 citizens | Follows Atenism · 3 of 12 citizens |
| Yield list label (src/sim/statecraft/evaluator.ts) | Religion · the Children of Elder and Cloud | Religion · Atenism |
| Belief card eyebrow (src/ui/bonusesTab.ts) | a follower belief of the Children of Elder and Cloud | a follower belief of Atenism |

### Salii, in place of "the Way of the Hoarfrost"

| Place | Today | Proposed |
| --- | --- | --- |
| Faith sheet, title and facts (src/ui/followersTab.ts) | the Way of the Hoarfrost · founded by you · holy city Cusco ✶ · 3 of 4 religions founded | Salii · founded by you · holy city Cusco ✶ · 3 of 4 religions founded |
| Faith sheet head in the Quiet Table mock-up | The Way of the Hoarfrost · holy city Cusco ★ · followed in 5 towns | Salii · holy city Cusco ★ · followed in 5 towns |
| Toast, your founding (src/ui/notifications.ts) | You founded the Way of the Hoarfrost | You founded Salii |
| Toast, a town changes faith | Thebes now follows Ada's Way of the Hoarfrost | Thebes now follows Ada's Salii |
| Town row in the faith lens (src/ui/faithHover.ts) | the Way of the Hoarfrost · 3 of 4 — Your capital +4 — 4 a turn | Salii · 3 of 4 — Your capital +4 — 4 a turn |
| Town row in the city panel mock-up | Follows the Way of the Hoarfrost · 3 of 12 citizens | Follows Salii · 3 of 12 citizens |
| Yield list label (src/sim/statecraft/evaluator.ts) | Religion · the Way of the Hoarfrost | Religion · Salii |
| Belief card eyebrow (src/ui/bonusesTab.ts) | a follower belief of the Way of the Hoarfrost | a follower belief of Salii |

### Nongjia, in place of "the Grain Cult"

| Place | Today | Proposed |
| --- | --- | --- |
| Faith sheet, title and facts (src/ui/followersTab.ts) | the Grain Cult · founded by you · holy city Cusco ✶ · 3 of 4 religions founded | Nongjia · founded by you · holy city Cusco ✶ · 3 of 4 religions founded |
| Faith sheet head in the Quiet Table mock-up | The Grain Cult · holy city Cusco ★ · followed in 5 towns | Nongjia · holy city Cusco ★ · followed in 5 towns |
| Toast, your founding (src/ui/notifications.ts) | You founded the Grain Cult | You founded Nongjia |
| Toast, a town changes faith | Thebes now follows Ada's Grain Cult | Thebes now follows Ada's Nongjia |
| Town row in the faith lens (src/ui/faithHover.ts) | the Grain Cult · 3 of 4 — Your capital +4 — 4 a turn | Nongjia · 3 of 4 — Your capital +4 — 4 a turn |
| Town row in the city panel mock-up | Follows the Grain Cult · 3 of 12 citizens | Follows Nongjia · 3 of 12 citizens |
| Yield list label (src/sim/statecraft/evaluator.ts) | Religion · the Grain Cult | Religion · Nongjia |
| Belief card eyebrow (src/ui/bonusesTab.ts) | a follower belief of the Grain Cult | a follower belief of Nongjia |

## 5. For the builder

- **Ruling.** The ruling is in `docs/flags.md` ("Religion names: short names that sound like a religion", 2026-11-19). Nothing is built until the user has chosen the names. It replaces "never a historical faith and never a fixed roster" (2026-08-27) for names. The rest of that ruling stays: the pantheon is the identity.
- **Data shape.** In `data/religion.json`, replace `names.epithets` and `names.patterns` with `names.roster`: a list of rows `{ "name": "Nongjia", "axis": "hearth", "note": "..." }`. `note` is optional player prose for a tooltip or the Compendium (hard rule 7: no identifiers, no numbers in prose, so write dates as words or leave them out).
- **Type and validator.** `src/sim/religionData.ts`: change the type of `names` and the two checks near line 892. New checks: the roster has at least as many rows as the largest `maxReligions` (8 today, from `rules.game.maxPlayers` and `rules.religion.maxReligions`); names are unique without regard to case; each axis is a `BeliefAxis`; no name is longer than the agreed limit.
- **The draw.** `generateReligionName` in `src/sim/religion.ts`: (1) free = roster rows, in file order, whose name no row of `state.religions` holds (compare without case, after trim); (2) near = free rows whose axis is one of the pantheon's axes; (3) pool = near if it has a row, else free; (4) one `nextFloat(state.rng)` picks the index. Draw exactly once on every path, so the number of draws does not depend on the pantheon. Iterate the array only (hard rule 2).
- **Rename.** No change is necessary. A player can type a roster name, and a later founder then skips it. Optional: `renameReligionError` refuses a name that another religion holds. `RELIGION_NAME_LIMIT` (40) can stay or go down to about 24.
- **UI code.** No change is necessary. `religionDevice` (`src/ui/faithPlates.ts`) and `possessed` (`src/ui/notifications.ts`) remove a leading "the" and do nothing to a name without one. Their docblocks say that every generated name begins with "the", so update those words. Optional: let the draw prefer a free name whose first letter no religion uses, so the banner plates differ.
- **Tests.** `test/sim/religion.test.ts` ("generates the same name from the same generator state", near line 2316) reads `RELIGION.names.epithets.hearth`: change it to the roster and add a test that 8 foundings give 8 different names. The UI fixtures write names by hand and still pass: `test/ui/faithHelpers.ts`, `faithTabHelpers.ts`, `faithPlates.test.ts`, `followersTab.test.ts`, `faithLens.test.ts`, `religionV2.test.ts`. Change them to roster names when convenient. Keep one test of a name with "the" for the rename path. `src/flairGallery/inPlayForms.ts` holds the sample "the Way of the Grain".
- **Seeded games and saves.** Today a founding spends 2 or 3 draws. The new code spends 1. So every seeded game changes from the first founding on, and a recorded log can stop replaying. This is a schema bump (`SCHEMA_VERSION` in `src/sim/state.ts`, 246 today) with its entry. `loadGame` accepts only the current schema, so an old save does not load after any bump, and the project bumps often. I see no reason to keep the old draw count. Any pinned replay or t100 probe figures that include a founding will move.
- **Docs.** `docs/religion-v2.md` (Principles, the "fluid, never historical" bullet), `docs/README.md` (line 1087, the same sentence), the docblocks on `generateReligionName`, on the `names` type in `religionData.ts`, and on `Religion.name` in `state.ts`. If the roster gets a table in a doc, it needs a sync test (the `statecraftDocSync` pattern).

## 6. What I could not determine

- I did not measure the pixel width of each surface. The widths above are estimates from the code and the mock-up. The longest candidate has 13 characters and the shortest name of today has 12, so no surface gets worse.
- I wrote the sources from memory, with no check against a reference. The rows marked thin need a check before they ship. Dates are approximate.
- I do not know which pinned test figures or bot probes include a founding. The builder finds that from the failures.

## 7. Questions for the user

1. Do you want the name tied to the pantheon axis (a wild pantheon prefers Selloi or Arktoi), or one flat list where any religion can get any name?
2. Do you accept invented names for the frost axis (Hiemari, Nivites), and labels with a second word (Kotosh Rite, Chavin Cult, Kabeiric Rite)?
