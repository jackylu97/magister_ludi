# Religion names: a proposal (2026-11-19)

The user, on the name "The Children of Elder and Cloud" in a mock-up of the faith
screen: "could we do a naming pass, lets make these religion names way shorter.
They can be proper nouns that just sound arcane/cool, or reference obscure
religions from history"

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
- **An earlier ruling.** The docblocks and `docs/religion-v2.md` record a ruling of 2026-08-27: "keep religions fluid / not tied to historical world religions", and the code comment adds "never a fixed roster". The new request permits obscure historical names. A roster of extinct cults keeps the first part of that ruling (no world religion) but replaces the second. The new ruling must go into `docs/flags.md` before a build.

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

- **A. A roster of historical names.** One list of short proper nouns in `data/religion.json`. Each is an extinct cult, a priesthood, a school, a sacred place or a god that nobody worships today. Each row has an axis. At founding the game picks one name that no religion in the game uses. If names with one of the pantheon's axes are free, it picks from those. If none are free, it picks from all free names.
  - Code: One RNG draw, always. The 3 patterns and the 40 epithets go away.
- **B. Invented names built to a rule.** A root from an old word for the thing of the axis (Latin, Greek or Akkadian), plus one of five endings: -a, -ar, -ith, -une or -ane, -on. The result has 5 to 8 letters. Either the game builds the name at founding (two draws: the root, the ending) or we write the results as a roster (one draw, the same code as A).
  - Code: As a roster: the same code as A. Built at founding: two draws and a rule that avoids a name in use.
- **C. A mixed roster.** The roster of A, with invented names added where history gives few good names. The frost axis is the clear case.
  - Code: The same code as A. The roster has a `kind` column for the Compendium, or no column at all.

**Recommendation.** I recommend A, with the frost axis open to C. The historical names have more character than names that I can invent, each one has a true story for a tooltip, and the code is the same for all three options. The smallest change of all is A without the axis: one flat list and one draw. The axis preference costs about six more lines and keeps today's idea that a religion looks like its pantheon. A roster of 9 or more names can never run out, because a game holds 8 religions at most. So a generated fallback is not necessary.

## 3. The names

77 historical candidates. FAV marks the 20 favourites. The game needs 9 at
least. About 30 is a good roster. The sources are from memory, and the Note column
says where the knowledge is thin or where a name is near a living tradition.

The rules for a name:

- One or two words, 14 characters at most. Most are 5 to 8.
- No article. The name is a proper noun that works in "follows X" and "a belief of X". I used the noun (a place, a god, a body of people), not the adjective: Harran, not Harranian.
- No living faith and no present-day denomination. I left out, for example, Druid, Bön, Tengri, Ifá, Mandaean, Yazidi, the Norse and Baltic gods (people worship them today), and nearly every sect of Christianity, Islam, Judaism and Buddhism.
- Plain letters only (no accents), so every font of the game can print the name.
- No clash with the game: I searched `data/` for every candidate and found no town, leader, wonder, belief or card with the same name.

### Hearth

| Name | Fav | Length | Say | Source | Note |
| --- | --- | --- | --- | --- | --- |
| Kotosh | FAV | 6 | KOH-tosh | The Kotosh Religious Tradition of the Peruvian highlands, about 3000 to 1800 BCE. Its rites were held around a sunken fire pit in a small sealed room. |  |
| Tabiti |  | 6 | tah-BEE-tee | The Scythian goddess of the hearth, the first god in the list that Herodotus gives, 5th century BCE. | My knowledge is thin here. Herodotus is nearly the only source. |
| Eleusis |  | 7 | eh-LOO-sis | The town near Athens that held the Mysteries of Demeter and Persephone, from before 600 BCE until the sanctuary closed about 392 CE. | It is also a town in Greece today (Elefsina). |
| Penates |  | 7 | peh-NAH-tays | The Roman gods of the household store, kept at the hearth of each house and of the state. |  |
| Arval |  | 5 | AR-val | The Arval Brethren, twelve Roman priests who made the yearly offerings for the fields. |  |
| Marzeah |  | 7 | mar-ZAY-ah | A feasting society of the West Semitic world, from Ugarit (14th century BCE) to Palmyra (3rd century CE). Some texts tie it to feasts for the dead. | My knowledge is thin here. Scholars disagree about what it did. |
| Kumarbi |  | 7 | koo-MAR-bee | The Hurrian father of the gods, a grain god, known from Hittite tablets of the 14th and 13th centuries BCE. |  |

### Sky

| Name | Fav | Length | Say | Source | Note |
| --- | --- | --- | --- | --- | --- |
| Harran | FAV | 6 | hah-RAHN | A city of upper Mesopotamia with a temple of the moon god Sin. Its star-worshippers lasted until about the 11th century CE. | It is also a small town in Turkey today. |
| Zurvan | FAV | 6 | zoor-VAHN | Boundless Time, the highest god of Zurvanism, a school in Sasanian Iran (3rd to 7th century CE). The school is extinct. | Zurvanism was a branch of Zoroastrianism, which is a living faith. The branch itself has no followers that I know of. |
| Teshub |  | 6 | TESH-oob | The Hurrian storm god of Anatolia and north Syria, second millennium BCE. |  |
| Tinia |  | 5 | TIN-ee-ah | The Etruscan sky god, who threw three kinds of lightning. |  |
| Doliche |  | 7 | DOL-ih-kee | A town in Commagene. Its storm god, Jupiter Dolichenus, had a mystery cult in the Roman army in the 2nd and 3rd centuries CE. |  |
| Sabazios |  | 8 | sah-BAY-zee-os | A Phrygian and Thracian sky god on horseback, with mysteries in the Greek and Roman world. |  |
| Taranis |  | 7 | TAR-ah-nis | A Gaulish god of thunder, named by the Roman poet Lucan in the 1st century CE. | Some modern pagans honour the name. |
| Anshar |  | 6 | AN-shar | A first god of the Babylonian creation poem. The name means "whole sky". |  |

### Stone

| Name | Fav | Length | Say | Source | Note |
| --- | --- | --- | --- | --- | --- |
| Baetyl | FAV | 6 | BEE-til | A sacred stone that people believed held a god. Baetyls stood in shrines across the Levant and the Mediterranean in antiquity. | A common noun, not one cult. |
| Chavin | FAV | 6 | chah-VEEN | Chavín de Huántar, a temple centre in the Peruvian Andes, about 900 to 200 BCE, with stone galleries and a carved stone god at the centre. | The correct spelling has an accent (Chavín). |
| Dushara | FAV | 7 | doo-SHAH-rah | The chief god of the Nabataeans at Petra, "lord of the Shara mountains", worshipped as a plain block of stone. Last centuries BCE to about the 3rd century CE. |  |
| Dactyls |  | 7 | DAK-tils | The Dactyls of Mount Ida, smiths and sorcerers of Greek myth who found how to work iron. |  |
| Benben |  | 6 | BEN-ben | The first mound that rose from the water in the creation story of Heliopolis in Egypt, kept there as a sacred stone. |  |
| Matar |  | 5 | MAH-tar | The Phrygian Mother, whose shrines were cut into rock faces in central Anatolia in the 8th to 6th centuries BCE. The Greeks later called her Cybele. |  |
| Omphalos |  | 8 | OM-fah-los | The navel stone at Delphi, which the Greeks held to be the centre of the world. |  |

### Wild

| Name | Fav | Length | Say | Source | Note |
| --- | --- | --- | --- | --- | --- |
| Selloi | FAV | 6 | SEL-oy | The priests of the oak oracle of Zeus at Dodona in Epirus. Homer says that they slept on the ground and did not wash their feet. |  |
| Potnia | FAV | 6 | POT-nee-ah | "The Mistress", the title of goddesses on Mycenaean tablets, about 1400 to 1200 BCE. One form is the Mistress of Animals. |  |
| Luperci |  | 7 | loo-PER-kee | The Roman priests of the Lupercalia, who ran from the cave of the she-wolf each February. |  |
| Bendis |  | 6 | BEN-dis | A Thracian goddess of the hunt. Athens gave her a public festival in the 5th century BCE. |  |
| Nemeton |  | 7 | NEM-eh-ton | The Celtic word for a sacred grove, in Gaul, Britain and Galatia. | Some modern pagans use the word. |
| Arduinna |  | 8 | ar-DWIN-ah | A Gaulish goddess of the Ardennes forest. | My knowledge is thin here. A few inscriptions only. |
| Artio |  | 5 | AR-tee-oh | A Gaulish bear goddess, known from a bronze group found near Bern. |  |

### Water

| Name | Fav | Length | Say | Source | Note |
| --- | --- | --- | --- | --- | --- |
| Apkallu | FAV | 7 | ap-KAL-oo | The seven sages of Mesopotamian tradition, who came out of the deep water before the flood to teach the crafts. |  |
| Kabeiroi | FAV | 8 | kah-BAY-roy | The Great Gods of the mysteries on Samothrace and Lemnos. Sailors asked them for a safe crossing. |  |
| Ogdoad | FAV | 6 | OG-doh-ad | The eight first gods of Hermopolis in Egypt, who stood for the water, the dark and the hidden before creation. |  |
| Abzu |  | 4 | AB-zoo | The fresh water under the earth in Sumerian belief, and the name of the temple of Enki at Eridu. |  |
| Telchines |  | 9 | tel-KY-neez | Smiths and sorcerers of Rhodes in Greek myth, children of the sea. |  |
| Oannes |  | 6 | oh-AN-eez | The sage with the body of a fish in the history of Berossus, 3rd century BCE. He came from the sea to teach writing and law. |  |
| Sequana |  | 7 | seh-KWAH-nah | The Gaulish goddess of the springs of the Seine, with a healing shrine in the 1st centuries BCE and CE. |  |
| Coventina |  | 9 | kov-en-TEE-nah | The goddess of a well at Carrawburgh on Hadrian's Wall in Roman Britain. |  |
| Arioi |  | 5 | ah-ree-OY | A society of Tahiti and the islands near it, given to the god 'Oro. Its members travelled by canoe as performers. It ended in the early 19th century. | My knowledge is thin here. It belongs to a living people, so ask before you keep it. |

### War

| Name | Fav | Length | Say | Source | Note |
| --- | --- | --- | --- | --- | --- |
| Salii | FAV | 5 | SAH-lee-ee | The leaping priests of Mars, who carried twelve sacred shields through Rome each March. |  |
| Apedemak | FAV | 8 | ah-PED-eh-mak | The lion-headed war god of Kush, with temples at Naqa and Musawwarat in Sudan, about 3rd century BCE to 4th century CE. |  |
| Kouretes |  | 8 | koo-REE-teez | The armed dancers of Crete in Greek myth, who beat their shields to hide the cries of the infant Zeus. |  |
| Mithras |  | 7 | MITH-ras | The god of a Roman mystery cult, 1st to 4th century CE, popular with soldiers. Its temples were built as caves. | Less obscure than the rest. The Roman cult is extinct, but the older Iranian Mithra is still honoured by Zoroastrians. |
| Hwarang |  | 7 | hwah-RAHNG | The "flower youths" of Silla in Korea, 6th to 10th century: an order of young nobles trained for war with Buddhist and native rites. | An order, not a religion. The word is well known in Korea today. |
| Mahrem |  | 6 | MAH-rem | The war god of the kings of Aksum in Ethiopia before the kingdom changed its religion in the 4th century CE. | My knowledge is thin here.  |

### Road

| Name | Fav | Length | Say | Source | Note |
| --- | --- | --- | --- | --- | --- |
| Pochteca | FAV | 8 | poch-TEH-kah | The Aztec guild of long-distance merchants, 14th to 16th century, with its own god and its own rites before a journey. |  |
| Enodia |  | 6 | en-OH-dee-ah | "She in the road", a Thessalian goddess of roads, crossroads and gates, from the 5th century BCE. | My knowledge is thin here.  |
| Hermai |  | 6 | HER-my | The stone pillars of Hermes that stood at Greek roadsides, doors and borders. |  |
| Fetial |  | 6 | FEE-shal | The Roman priests who walked to a border to make a treaty or to declare a war. |  |
| Compitalia |  | 10 | kom-pih-TAH-lee-ah | The Roman festival of the shrines at the crossroads. |  |

### Sun

| Name | Fav | Length | Say | Source | Note |
| --- | --- | --- | --- | --- | --- |
| Aten | FAV | 4 | AH-ten | The disc of the sun, which the pharaoh Akhenaten made the only god of Egypt about 1350 BCE. The cult ended after his death. |  |
| Emesa |  | 5 | EM-eh-sah | The Syrian city of the sun god Elagabal, who was worshipped as a black stone. An emperor took the stone to Rome in 218 CE. |  |
| Shapash |  | 7 | SHAH-pash | The sun goddess of Ugarit, 14th to 12th century BCE, called the lamp of the gods. |  |
| Ennead |  | 6 | EN-ee-ad | The nine gods of Heliopolis in Egypt, with the sun god Atum at their head. |  |
| Malakbel |  | 8 | mah-LAK-bel | A god of Palmyra linked with the sun, 1st to 3rd century CE. |  |
| Sol Invictus |  | 12 |  | The "Unconquered Sun", a state cult of Rome from 274 CE. | Well known, and two words. |
| Devaraja |  | 8 | day-vah-RAH-jah | The "god-king" cult of the Khmer court at Angkor from 802 CE. | My knowledge is thin here. Scholars dispute what it was, and the word is Sanskrit from a living tradition. |

### Frost

| Name | Fav | Length | Say | Source | Note |
| --- | --- | --- | --- | --- | --- |
| Hyperborea | FAV | 10 | hy-per-BOR-ee-ah | The land beyond the North Wind in Greek myth. Its people sent offerings to the shrine of Apollo on Delos. |  |
| Boreas |  | 6 | BOR-ee-as | The North Wind. Athens gave him a shrine after a storm wrecked the Persian fleet in 480 BCE. |  |
| Khione |  | 6 | KY-oh-nee | A snow nymph of Greek myth, daughter of the North Wind. | A figure of myth. I know of no cult. |
| Marzanna |  | 8 | mar-ZAH-nah | A Slavic figure of winter and death. People drown or burn her straw image when spring comes. | The custom is still kept as a folk festival. |
| Cailleach |  | 9 | KAL-yakh | The hag of winter in the folklore of Ireland and Scotland, who shapes the hills and brings the first snow. | Living folklore, and hard to say. |

### No axis (hidden teaching)

| Name | Fav | Length | Say | Source | Note |
| --- | --- | --- | --- | --- | --- |
| Ajivika | FAV | 7 | ah-JEE-vih-kah | An Indian school of ascetics, founded in the 5th century BCE. It taught that fate fixes everything. It died out by about the 14th century. |  |
| Mojia | FAV | 5 | MOH-jyah | The School of Mo, in China from the 5th to the 3rd century BCE. It taught equal care for all people, the will of Heaven, and the defence of cities. It died out under the Han. |  |
| Fangshi | FAV | 7 | FAHNG-shur | The "masters of methods" of Qin and Han China: diviners, healers and alchemists who served the courts. | A class of experts, not a religion. |
| Zalmoxis | FAV | 8 | zal-MOK-sis | The god or teacher of the Getae, north of Thrace, who promised his followers that they would not die. Herodotus, 5th century BCE. |  |
| Orphica |  | 7 | OR-fih-kah | The poems and rites under the name of Orpheus, in the Greek world from the 6th century BCE. |  |
| Manichee |  | 8 | MAN-ih-kee | A follower of the religion of Mani, founded in Persia in the 3rd century CE, which spread from Rome to China and is extinct. |  |
| Mingjiao |  | 8 | ming-JYOW | The "Teaching of Light", the Chinese name of the religion of Mani, in China from the 7th century until about the 14th or later. | My knowledge is thin here. One temple in Fujian still honours Mani as a local figure. |
| Mazdak |  | 6 | MAZ-dak | A reformer in Sasanian Iran about 500 CE, who taught that property must be shared. The court destroyed his movement about 528. |  |
| Lokayata |  | 8 | loh-KAH-yah-tah | An Indian school of materialists, from about the 6th century BCE, which denied a life after death. Its own books are lost. | It denied religion, so it is a joke as the name of one. |
| Hypsistos |  | 9 | HIP-sis-tos | "The Highest", the one god of the Hypsistarians of Asia Minor and the Black Sea coast, about 2nd century BCE to 4th century CE. |  |
| Serapis |  | 7 | seh-RAH-pis | A god made in Alexandria about 300 BCE from Egyptian and Greek gods. His great temple was destroyed in 391 CE. |  |
| Therapeutae |  | 11 | ther-ah-PYOO-tee | A community of contemplatives beside a lake near Alexandria, described by Philo in the 1st century CE. |  |
| Enarei |  | 6 | eh-NAH-ray | The Scythian diviners in Herodotus, who told the future with strips of bark. | My knowledge is thin here.  |
| Huang-Lao |  | 9 | hwahng-LOW | The school of the Yellow Emperor and Laozi, which guided the early Han court in the 2nd century BCE. | It fed into Daoism, which is a living faith. |
| Barbelo |  | 7 | bar-BAY-loh | The first power that came from God in the texts of one Gnostic school of the 2nd century CE. | Close to early Christianity. Strike it if in doubt. |
| Tlamatini |  | 9 | tlah-mah-TEE-nee | "One who knows things", the Nahua word for a sage. | My knowledge is thin here. It belongs to a living people and language. |

### Option B samples: invented names

The rule: a root from an old word for the thing of the axis, plus one of five
endings (-a, -ar, -ith, -une or -ane, -on), 5 to 8 letters. The meanings are loose.

| Name | Axis | Length | Construction |
| --- | --- | --- | --- |
| Kinuna | hearth | 6 | Akkadian kinunu, a brazier |
| Focara | hearth | 6 | Latin focus, a hearth |
| Caelith | sky | 7 | Latin caelum, the sky |
| Asteron | sky | 7 | Greek aster, a star |
| Lithar | stone | 6 | Greek lithos, a stone |
| Saxun | stone | 5 | Latin saxum, a rock |
| Sylvane | wild | 7 | Latin silva, a wood |
| Agrion | wild | 6 | Greek agrios, wild |
| Nahara | water | 6 | Semitic nahar, a river |
| Thalune | water | 7 | Greek thalassa, the sea |
| Qarrad | war | 6 | Akkadian qarradu, a warrior |
| Bellane | war | 7 | Latin bellum, war |
| Hodara | road | 6 | Greek hodos, a road |
| Viara | road | 5 | Latin via, a road |
| Heliar | sun | 6 | Greek helios, the sun |
| Solanth | sun | 7 | Latin sol, the sun |
| Hiemar | frost | 6 | Latin hiems, winter |
| Nivane | frost | 6 | Latin nix (stem niv-), snow |
| Pagora | frost | 6 | Greek pagos, frost |
| Gelune | frost | 6 | Latin gelu, frost |
| Kryptar | none | 7 | Greek kryptos, hidden |
| Silenth | none | 7 | Latin silentium, silence |

## 4. In the strings of the game

### Kotosh, in place of "the Children of Elder and Cloud"

| Place | Today | Proposed |
| --- | --- | --- |
| Faith sheet, title and facts (src/ui/followersTab.ts) | the Children of Elder and Cloud · founded by you · holy city Cusco ✶ · 3 of 4 religions founded | Kotosh · founded by you · holy city Cusco ✶ · 3 of 4 religions founded |
| Faith sheet head in the Quiet Table mock-up | The Children of Elder and Cloud · holy city Cusco ★ · followed in 5 towns | Kotosh · holy city Cusco ★ · followed in 5 towns |
| Toast, your founding (src/ui/notifications.ts) | You founded the Children of Elder and Cloud | You founded Kotosh |
| Toast, a town changes faith | Thebes now follows Ada's Children of Elder and Cloud | Thebes now follows Ada's Kotosh |
| Town row in the faith lens (src/ui/faithHover.ts) | the Children of Elder and Cloud · 3 of 4 — Your capital +4 — 4 a turn | Kotosh · 3 of 4 — Your capital +4 — 4 a turn |
| Town row in the city panel mock-up | Follows the Children of Elder and Cloud · 3 of 12 citizens | Follows Kotosh · 3 of 12 citizens |
| Yield list label (src/sim/statecraft/evaluator.ts) | Religion · the Children of Elder and Cloud | Religion · Kotosh |
| Belief card eyebrow (src/ui/bonusesTab.ts) | a follower belief of the Children of Elder and Cloud | a follower belief of Kotosh |

### Apkallu, in place of "the Way of the Hoarfrost"

| Place | Today | Proposed |
| --- | --- | --- |
| Faith sheet, title and facts (src/ui/followersTab.ts) | the Way of the Hoarfrost · founded by you · holy city Cusco ✶ · 3 of 4 religions founded | Apkallu · founded by you · holy city Cusco ✶ · 3 of 4 religions founded |
| Faith sheet head in the Quiet Table mock-up | The Way of the Hoarfrost · holy city Cusco ★ · followed in 5 towns | Apkallu · holy city Cusco ★ · followed in 5 towns |
| Toast, your founding (src/ui/notifications.ts) | You founded the Way of the Hoarfrost | You founded Apkallu |
| Toast, a town changes faith | Thebes now follows Ada's Way of the Hoarfrost | Thebes now follows Ada's Apkallu |
| Town row in the faith lens (src/ui/faithHover.ts) | the Way of the Hoarfrost · 3 of 4 — Your capital +4 — 4 a turn | Apkallu · 3 of 4 — Your capital +4 — 4 a turn |
| Town row in the city panel mock-up | Follows the Way of the Hoarfrost · 3 of 12 citizens | Follows Apkallu · 3 of 12 citizens |
| Yield list label (src/sim/statecraft/evaluator.ts) | Religion · the Way of the Hoarfrost | Religion · Apkallu |
| Belief card eyebrow (src/ui/bonusesTab.ts) | a follower belief of the Way of the Hoarfrost | a follower belief of Apkallu |

### Zalmoxis, in place of "the Grain Cult"

| Place | Today | Proposed |
| --- | --- | --- |
| Faith sheet, title and facts (src/ui/followersTab.ts) | the Grain Cult · founded by you · holy city Cusco ✶ · 3 of 4 religions founded | Zalmoxis · founded by you · holy city Cusco ✶ · 3 of 4 religions founded |
| Faith sheet head in the Quiet Table mock-up | The Grain Cult · holy city Cusco ★ · followed in 5 towns | Zalmoxis · holy city Cusco ★ · followed in 5 towns |
| Toast, your founding (src/ui/notifications.ts) | You founded the Grain Cult | You founded Zalmoxis |
| Toast, a town changes faith | Thebes now follows Ada's Grain Cult | Thebes now follows Ada's Zalmoxis |
| Town row in the faith lens (src/ui/faithHover.ts) | the Grain Cult · 3 of 4 — Your capital +4 — 4 a turn | Zalmoxis · 3 of 4 — Your capital +4 — 4 a turn |
| Town row in the city panel mock-up | Follows the Grain Cult · 3 of 12 citizens | Follows Zalmoxis · 3 of 12 citizens |
| Yield list label (src/sim/statecraft/evaluator.ts) | Religion · the Grain Cult | Religion · Zalmoxis |
| Belief card eyebrow (src/ui/bonusesTab.ts) | a follower belief of the Grain Cult | a follower belief of Zalmoxis |

## 5. For the builder

- **Ruling first.** Put the user's ruling in `docs/flags.md` before the build. It replaces "never a historical faith and never a fixed roster" (2026-08-27) for names. The rest of that ruling stays: the pantheon is the identity.
- **Data shape.** In `data/religion.json`, replace `names.epithets` and `names.patterns` with `names.roster`: a list of rows `{ "name": "Kotosh", "axis": "hearth", "note": "..." }`. `note` is optional player prose for a tooltip or the Compendium (hard rule 7: no identifiers, no numbers in prose, so write dates as words or leave them out).
- **Type and validator.** `src/sim/religionData.ts`: change the type of `names` and the two checks near line 892. New checks: the roster has at least as many rows as the largest `maxReligions` (8 today, from `rules.game.maxPlayers` and `rules.religion.maxReligions`); names are unique without regard to case; each axis is a `BeliefAxis`; no name is longer than the agreed limit.
- **The draw.** `generateReligionName` in `src/sim/religion.ts`: (1) free = roster rows, in file order, whose name no row of `state.religions` holds (compare without case, after trim); (2) near = free rows whose axis is one of the pantheon's axes; (3) pool = near if it has a row, else free; (4) one `nextFloat(state.rng)` picks the index. Draw exactly once on every path, so the number of draws does not depend on the pantheon. Iterate the array only (hard rule 2).
- **Rename.** No change is necessary. A player can type a roster name, and a later founder then skips it. Optional: `renameReligionError` refuses a name that another religion holds. `RELIGION_NAME_LIMIT` (40) can stay or go down to about 24.
- **UI code.** No change is necessary. `religionDevice` (`src/ui/faithPlates.ts`) and `possessed` (`src/ui/notifications.ts`) remove a leading "the" and do nothing to a name without one. Their docblocks say that every generated name begins with "the", so update those words. Optional: let the draw prefer a free name whose first letter no religion uses, so the banner plates differ.
- **Tests.** `test/sim/religion.test.ts` ("generates the same name from the same generator state", near line 2316) reads `RELIGION.names.epithets.hearth`: change it to the roster and add a test that 8 foundings give 8 different names. The UI fixtures write names by hand and still pass: `test/ui/faithHelpers.ts`, `faithTabHelpers.ts`, `faithPlates.test.ts`, `followersTab.test.ts`, `faithLens.test.ts`, `religionV2.test.ts`. Change them to roster names when convenient. Keep one test of a name with "the" for the rename path. `src/flairGallery/inPlayForms.ts` holds the sample "the Way of the Grain".
- **Seeded games and saves.** Today a founding spends 2 or 3 draws. The new code spends 1. So every seeded game changes from the first founding on, and a recorded log can stop replaying. This is a schema bump (`SCHEMA_VERSION` in `src/sim/state.ts`, 246 today) with its entry. `loadGame` accepts only the current schema, so an old save does not load after any bump, and the project bumps often. I see no reason to keep the old draw count. Any pinned replay or t100 probe figures that include a founding will move.
- **Docs.** `docs/religion-v2.md` (Principles, the "fluid, never historical" bullet), `docs/README.md` (line 1087, the same sentence), the docblocks on `generateReligionName`, on the `names` type in `religionData.ts`, and on `Religion.name` in `state.ts`. If the roster gets a table in a doc, it needs a sync test (the `statecraftDocSync` pattern).

## 6. What I could not determine

- I did not measure the pixel width of each surface. The widths above are estimates from the code and the mock-up. Every candidate is shorter than the shortest name of today plus two characters, so no surface gets worse.
- I wrote the sources from memory, with no check against a reference. The rows marked thin need a check before they ship. Dates are approximate.
- I do not know which pinned test figures or bot probes include a founding. The builder finds that from the failures.

## 7. Questions for the user

1. Do you want the name tied to the pantheon axis (a sky pantheon prefers Harran or Zurvan), or one flat list where any religion can get any name?
2. Do names of gods and places count (Teshub, Harran, Aten), or do you want only names of groups and schools (Selloi, Salii, Mojia)?
3. For the frost axis, do you accept invented names (Hiemar, Nivane), or do you prefer to give frost pantheons a name from the general list?
