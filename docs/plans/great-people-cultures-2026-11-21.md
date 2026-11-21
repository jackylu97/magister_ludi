# Great people: more cultures (2026-11-21)

The user, 2026-11-21: *"i feel like the great people are overrepresented by greeks, what do you think? could we get a mix of more cultures"*. Then, on the proposal to keep about fifteen Greeks and replace about sixteen: *"yeah sounds good, lets just swap the names and keep the rows. please update the prompt list after you do it"*.

## The ruling of 2026-11-21: five swaps withdrawn

The user read the sixteen swaps and ruled on the five people who stood two age bands from their time: *"lets replace those 5 with their original greek people, that's fine"*.

- Five rows hold their Greek person again, with the name, flavour line and kernel exactly as before the swap: `anaximander` (Anaximander), `hesiod` (Hesiod), `exekias` (Exekias), `telesilla` (Telesilla) and `colaeus` (Colaeus of Samos).
- The five people withdrawn: Varāhamihira, Yamanoue no Okura, Aj Maxam, Macuilxochitzin and Sulayman al-Tajir. The reason is the same for each: the person lived two age bands after the age of the row.
- Eleven swaps stand. Sections 1 to 6 below show the state after this ruling. The withdrawn swaps stay in the table of section 2, struck through, as a record.
- Greek and Hellenistic people: 31 before, 20 now (13% of 157). Women: 29 before, 29 now (Artemisia leaves, Amanitore arrives; Telesilla is back).

## What changed

- Eleven rows of `data/greatPeople.json` have a new person: a new `name`, `epigram` (the flavour line) and `kernel` (who they were).
- Nothing else in a row changed: the id, family, age, tier, legacy and every number are the same. A test in the change script compared them.
- The row ids did not change, because saved games hold them (`Unit.person`, legacies, offers). So thirteen ids now name an earlier person. Section 3 has the list.
- The data file has no convention for a `formerly` note, so this file is the record.
- No row has a hand-written title for its act, legacy or work. The describers make those words from the effects, so they did not change.

## 1. The count by culture

I counted the 157 live rows (three more are retired). Each person is in one group. The groups are mine; a few people could sit in two.

| Culture | Before | After | Change |
|---|---|---|---|
| Greek and Hellenistic | 31 | 20 | -11 |
| China | 24 | 24 |  |
| Western and central Europe | 24 | 24 |  |
| Egypt | 14 | 14 |  |
| Mesopotamia, Anatolia and Syria | 12 | 12 |  |
| Persia, Central Asia and the steppe | 8 | 11 | +3 |
| India | 8 | 10 | +2 |
| Arab world, al-Andalus and the Ottomans | 8 | 8 |  |
| Japan and Korea | 6 | 8 | +2 |
| Rome and Byzantium | 7 | 7 |  |
| Jewish world | 6 | 6 |  |
| Sub-Saharan Africa and Kush | 2 | 6 | +4 |
| The Americas | 2 | 2 |  |
| Southeast Asia | 2 | 2 |  |
| Carthage | 2 | 2 |  |
| Celtic and Germanic north | 1 | 1 |  |
| **Total** | **157** | **157** | |

- Greek and Hellenistic people were 31 of 157 (20%). They are now 20 (13%).
- The twenty who stay: Homer, Sappho, Aesop, Sophocles, Thales, Hippocrates, Euclid, Archimedes, Aristotle, Hypatia, Eratosthenes, Phidias, Leonidas, Solon, Hero of Alexandria, and the five who returned: Anaximander, Hesiod, Exekias, Telesilla and Colaeus of Samos.
- I listed all 31 before the change and found no Greek beyond the two lists in the brief. Maria Hebraea wrote in Greek at Alexandria; I count her with the Jewish world.
- My count has 2 people from sub-Saharan Africa before the change (Nzinga and Amina), where the brief said 3.
- Women: 29 of 157 before, 29 after. Artemisia leaves. Amanitore arrives.
- With all sixteen swaps the count was: Greek 15, India 11, Japan and Korea 9, Arab world 9, the Americas 4. The other groups were as in the table.

## 2. The swaps: eleven stand, five are withdrawn

| Row id | Family | Age | Leaves | Arrives | Dates and place | The deed | Why they fit the row | Flavour | Source |
|---|---|---|---|---|---|---|---|---|---|
| `anaximander` | Scholar | II | Anaximander (stays) | ~~Varāhamihira~~ **Withdrawn 2026-11-21: two age bands early for the person.** | about 505 to 587, Ujjain | His book of five systems set Indian astronomy beside two systems from the Greek and Roman world. | The row pays science for each foreign city you have seen. Anaximander drew the known world. Varāhamihira collected what other peoples knew about the sky. | ~~A foreigner who knows the stars is to be honoured.~~ | [Pañcasiddhāntikā; Dictionary of Scientific Biography](https://mathshistory.st-andrews.ac.uk/Biographies/Varahamihira/) |
| `hesiod` | Artist | II | Hesiod (stays) | ~~Yamanoue no Okura~~ **Withdrawn 2026-11-21: two age bands early for the person.** | about 660 to 733, the court at Nara and the province of Chikuzen | He wrote the Dialogue on Poverty and poems on his children, in the first great book of Japanese verse. | The row pays food and culture for each public work in a city. Hesiod wrote of farm work and hard years. Okura, a governor, wrote of hungry farmers and the tax collector. | ~~What are silver and gold beside a child?~~ | [Man’yōshū, book five; Encyclopaedia Britannica](https://www.britannica.com/biography/Yamanoue-Okura) |
| `exekias` | Artist | II | Exekias (stays) | ~~Aj Maxam~~ **Withdrawn 2026-11-21: two age bands early for the person.** | active about 750 to 800, Naranjo, in Guatemala | He painted and signed cylinder cups. His signature names his parents and the royal house of Naranjo. | The row pays culture on trade routes. Exekias signed pots that were sold abroad. Aj Maxam signed cups of the kind that Maya courts gave to each other. | ~~This is the painting of Aj Maxam.~~ | [Art Institute of Chicago, Vessel of the Dancing Lords and Water-Lily Vessel](https://www.artic.edu/artworks/65290/vessel-with-dancing-maize-gods) |
| `telesilla` | Artist | II | Telesilla (stays) | ~~Macuilxochitzin~~ **Withdrawn 2026-11-21: two age bands early for the person.** | born about 1435, Tenochtitlan | One song is given to her. It tells of the war of 1476 and of the women who pleaded for the man who wounded the ruler. | The row adds city defence and pays culture in garrisoned cities. Telesilla was a poet in a story of women and war. So is Macuilxochitzin. | ~~The women spoke, and the wounded man lived.~~ | [Cantares Mexicanos; Miguel León-Portilla, Fifteen Poets of the Aztec World](https://en.wikipedia.org/wiki/Macuilxochitzin) |
| `theodorusOfSamos` | Engineer | II | Theodorus of Samos | **Anacharsis** | about 590 BC, a Scythian of the Black Sea steppe who came to Athens | The Greeks credited him with the bellows, the anchor with two flukes and the potter’s wheel. | The row pays every city with a Smithy. A forge needs the bellows. Theodorus was credited with tools in the same way, so the card reads the same. | First the bellows, then the fire. | [Strabo 7.3.9, who cites Ephorus; Herodotus 4.76](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Strabo/7C*.html) |
| `mandrocles` | Engineer | II | Mandrocles of Samos | **Artachaees** | died about 480 BC, an Achaemenid noble | He directed the digging of the canal of Xerxes through the Athos peninsula. | The row gives embarked units more movement and pays coastal cities. Mandrocles built a bridge of boats for a Persian king. Artachaees cut a canal for the ships of the next one. | He cut the land so that the ships could cross it. | [Herodotus 7.22 and 7.117](https://en.wikipedia.org/wiki/Artachaees) |
| `eupalinos` | Engineer | II | Eupalinos | **Pushyagupta** | about 320 BC, Saurashtra, in the Maurya empire | He dammed the streams below Mount Girnar to make Lake Sudarshana. | The row pays food on improved hexes beside a mountain. Eupalinos carried water through a hill. Pushyagupta held water at the foot of a mountain for the fields. | He stopped the streams under the mountain. | [Junagadh rock inscription of Rudradaman, about 150](https://en.wikipedia.org/wiki/Junagadh_rock_inscription_of_Rudradaman) |
| `colaeus` | Merchant | II | Colaeus of Samos (stays) | ~~Sulayman al-Tajir~~ **Withdrawn 2026-11-21: two age bands early for the person.** | active about 850, a merchant of Siraf on the Persian Gulf, in the Abbasid Caliphate | He sailed to India and China. The first Arabic account of China (851) names him as its witness. | The row pays gold for each foreign city you have seen. Colaeus saw one far port by accident. Sulayman is known only for the foreign ports he described. | ~~In that country they drink a leaf in hot water.~~ | [Akhbar al-Sin wa’l-Hind, 851](https://en.wikipedia.org/wiki/Sulaiman_al-Tajir) |
| `artemisia` | General | II | Artemisia of Caria | **Piye** | ruled about 747 to 716 BC, Napata, in Sudan | He sailed down the Nile, took the enemy’s ships and conquered Egypt. | The row adds strength to ships and pays production on Fishing Boats. Artemisia led ships for a king. Piye led a river fleet as a king. | He took the city from the water. | [The Victory Stela of Piye, Cairo](https://en.wikipedia.org/wiki/Stele_of_Piye) |
| `epicurus` | Scholar | III | Epicurus | **Omar Khayyam** | 1048 to 1131, Nishapur | He solved cubic equations with geometry, helped to reform the calendar, and is known for short poems on wine and the passing day. | The row lowers the happiness that large cities demand. Epicurus taught that a simple life is a happy one. The poems under Khayyam’s name say the same. He is also a scholar, as the family asks. | Bread, a jug of wine, and the day is enough. | Well known; not searched |
| `heroOfAlexandria` | Engineer | III | Dinocrates | **Amanitore** | ruled about the middle of the first century, Meroë, in Sudan | With Natakamani she built the temples of Naqa, restored the temple of Amun at Napata and built reservoirs at Meroë. | The row pays production after you complete a wonder. Dinocrates planned great works. Amanitore is named as one of the last great builders of Kush. | What the raiders broke, she built again, and larger. | [Temple reliefs at Naqa; excavation reports from Wad ben Naga](https://en.wikipedia.org/wiki/Amanitore) |
| `apollodorus` | Engineer | III | Apollodorus of Damascus | **Gyōki** | 668 to 749, the provinces around Nara | With lay followers he built bridges, roads, ponds and boat landings, and raised funds for the Great Buddha of Nara. | The row pays production in every city joined to the capital by road. Apollodorus bridged a river for an emperor. Gyōki built the roads and bridges of his country. | Where the road stopped at a river, he built. | [Shoku Nihongi; Japan’s land ministry heritage notes](https://en.wikipedia.org/wiki/Gy%C5%8Dki) |
| `sostratus` | Engineer | III | Sostratus of Cnidus | **al-Hasan ibn Sulayman** | ruled about 1310 to 1333, Kilwa, in Tanzania | He built the palace of Husuni Kubwa above the harbour of Kilwa and enlarged the Great Mosque. | The row pays gold and production in every city with a Harbour. Sostratus built a lighthouse for a port. Al-Hasan built the great house of a port that lived on the gold trade. | They called him the father of gifts. | [The Kilwa Chronicle; the account of Ibn Battuta; the ruins](https://en.wikipedia.org/wiki/Al-Hasan_ibn_Sulaiman) |
| `hippalus` | Merchant | III | Hippalus | **Zoskales** | about the year 100, Adulis, on the coast of Eritrea | He ruled the coast where ivory and tortoise shell were sold to ships from Egypt. | The row pays gold on Fishing Boats. Hippalus is a name in a sailing guide. Zoskales is a name in the same guide, and his port sold goods from the sea. | Careful with his coin, and well read. | [Periplus of the Erythraean Sea, section 5](https://en.wikipedia.org/wiki/Zoskales) |
| `pytheas` | Merchant | III | Pytheas | **Jang Bogo** | died between 841 and 846, Wando, in Silla | He set up the Cheonghae garrison in 828, drove the slave raiders from the Yellow Sea and controlled the trade of Korea, China and Japan. | The row makes your trade units safe from plunder and pays gold on routes to other empires. This is what Jang Bogo did. The fit is better than Pytheas, who was an explorer. | No ship was taken while he kept the sea. | [Samguk Sagi; the diary of the monk Ennin](https://en.wikipedia.org/wiki/Jang_Bogo) |
| `pasion` | Merchant | III | Pasion | **Anāthapiṇḍika** | about the fifth century BC, Shravasti | The story says he bought a park for the monks by covering its ground with gold coin. | The row pays gold for the gold in your treasury. Pasion was a banker. Anāthapiṇḍika was a banker, and his one famous act is a heap of coin. | He paid for the grove by covering it in coin. | [The Pali canon; a carved relief at Bharhut, second century BC](https://en.wikipedia.org/wiki/Anathapindika) |

### What each row does, the new words, and what I checked

#### Withdrawn: Varāhamihira (`anaximander` stays Anaximander)

- **Withdrawn on 2026-11-21.** The row holds its Greek person. The lines below are the proposal, kept as a record.
- **Row:** Scholar, age II, situational. +1 science per foreign city you have sighted.
- **Culture:** India. About 505 to 587, Ujjain.
- **Flavour:** A foreigner who knows the stars is to be honoured.
- **Who they were (the kernel):** An astronomer of Ujjain. He set five older systems of astronomy side by side, two of them from the Greek and Roman world, and wrote that foreign scholars deserve honour for their science.
- **Time:** Two bands late (sixth century in age II).
- **Checked:** Web search. The five systems are confirmed. The line that honours foreign scholars is in his Brihat Samhita, where he quotes an older writer.

#### Withdrawn: Yamanoue no Okura (`hesiod` stays Hesiod)

- **Withdrawn on 2026-11-21.** The row holds its Greek person. The lines below are the proposal, kept as a record.
- **Row:** Artist, age II, strong. +1 food and +1 culture in every city per public work standing there.
- **Culture:** Japan. About 660 to 733, the court at Nara and the province of Chikuzen.
- **Flavour:** What are silver and gold beside a child?
- **Who they were (the kernel):** A court official and provincial governor in Japan. His poems speak of what other court poets left out: hungry farmers, the tax collector at the door, old age and love for his children.
- **Time:** Two bands late (eighth century in age II).
- **Checked:** Web search. Dates, the post in Chikuzen (726 to 732) and the poems agree. The flavour line shortens his poem on silver, gold and children.

#### Withdrawn: Aj Maxam (`exekias` stays Exekias)

- **Withdrawn on 2026-11-21.** The row holds its Greek person. The lines below are the proposal, kept as a record.
- **Row:** Artist, age II, situational. +2 culture on every trade route you send.
- **Culture:** The Americas (Maya). Active about 750 to 800, Naranjo, in Guatemala.
- **Flavour:** This is the painting of Aj Maxam.
- **Who they were (the kernel):** A Maya vase painter of the royal house of Naranjo. He signed his cups and named his parents on them. Painted cups like his were given as gifts from one court to another.
- **Time:** Two bands late (eighth century in age II).
- **Checked:** Web search. The museum records name him and date him. I did not confirm that his father was the king, so the kernel says “of the royal house”.

#### Withdrawn: Macuilxochitzin (`telesilla` stays Telesilla)

- **Withdrawn on 2026-11-21.** The row holds its Greek person. The lines below are the proposal, kept as a record.
- **Row:** Artist, age II, situational. every city: +5 city defence · +2 culture in every city with a unit standing in it.
- **Culture:** The Americas (Mexica). Born about 1435, Tenochtitlan.
- **Flavour:** The women spoke, and the wounded man lived.
- **Who they were (the kernel):** A Mexica poet, daughter of the counsellor Tlacaelel. Her one surviving song tells of a war in which an enemy warrior wounded the ruler, and of the women who pleaded for that warrior’s life. The song was written down after the conquest, and some doubt that it is hers.
- **Time:** Two bands late (fifteenth century in age II).
- **Checked:** Web search. Sources agree that she was a daughter of Tlacaelel (who is a great general in the game). Some scholars doubt that the song is hers. The kernel says so.

#### Anacharsis (`theodorusOfSamos`, was Theodorus of Samos)

- **Row:** Engineer, age II, situational. +3 production in every city with a Smithy.
- **Culture:** Scythia (the steppe). About 590 BC, a Scythian of the Black Sea steppe who came to Athens.
- **Flavour:** First the bellows, then the fire.
- **Who they were (the kernel):** A Scythian prince who travelled to Athens and was counted among its wise men. The Greeks credited him with the bellows, the anchor with two flukes and the potter’s wheel. The inventions may be legend.
- **Time:** In the row’s age.
- **Checked:** Read the passage: “the bellows, the two-fluked anchor and the potter’s wheel”. Strabo doubts the wheel. The kernel says the inventions may be legend.

#### Artachaees (`mandrocles`, was Mandrocles of Samos)

- **Row:** Engineer, age II, situational. all units: +1 movement while embarked · +1 production in every coastal city.
- **Culture:** Persia. Died about 480 BC, an Achaemenid noble.
- **Flavour:** He cut the land so that the ships could cross it.
- **Who they were (the kernel):** A Persian noble, said to be the tallest man in Persia. He directed the digging of a canal through the neck of Mount Athos so that the fleet of Xerxes could pass. The town where he died honoured him as a hero.
- **Time:** In the row’s age.
- **Checked:** Web search. Herodotus names him and Bubares as overseers, gives his height, and says Acanthus honoured him as a hero.

#### Pushyagupta (`eupalinos`, was Eupalinos)

- **Row:** Engineer, age II, situational. +1 food on every improved hex beside a mountain.
- **Culture:** India. About 320 BC, Saurashtra, in the Maurya empire.
- **Flavour:** He stopped the streams under the mountain.
- **Who they were (the kernel):** A governor under Chandragupta Maurya. He dammed the streams below Mount Girnar to make Lake Sudarshana, which watered the fields for centuries. One rock inscription names him, and that is all we have.
- **Time:** One band late (fourth century BC in age II).
- **Checked:** Web search. The inscription says the lake was begun by Pushyagupta, governor of Chandragupta Maurya. One inscription is all the evidence.

#### Withdrawn: Sulayman al-Tajir (`colaeus` stays Colaeus of Samos)

- **Withdrawn on 2026-11-21.** The row holds its Greek person. The lines below are the proposal, kept as a record.
- **Row:** Merchant, age II, situational. +1 gold per foreign city you have sighted.
- **Culture:** Arab world and the Gulf. Active about 850, a merchant of Siraf on the Persian Gulf, in the Abbasid Caliphate.
- **Flavour:** In that country they drink a leaf in hot water.
- **Who they were (the kernel):** A merchant of the Gulf port of Siraf who sailed to India and China. The first Arabic account of China, of its tea and its fine clay cups, names him as its witness. Nothing else about him is known.
- **Time:** Two bands late (ninth century in age II).
- **Checked:** Web search. Little is known of him but his trade. Siraf is in Iran, and the text is Arabic; I count him with the Arab world and say so here.

#### Piye (`artemisia`, was Artemisia of Caria)

- **Row:** General, age II, situational. +1 combat strength for ships · +1 production on every hex with a Fishing Boat.
- **Culture:** Kush. Ruled about 747 to 716 BC, Napata, in Sudan.
- **Flavour:** He took the city from the water.
- **Who they were (the kernel):** A king of Kush who sailed down the Nile and conquered Egypt. His fleet took the enemy’s ships on the river, and he stormed Memphis from its harbour side. The great stone that tells the campaign also records his anger at a king who starved his horses.
- **Time:** In the row’s age.
- **Checked:** Web search for the dates, the river battle and the horses. The attack on the harbour of Memphis is from my memory of the stela’s text; the search did not confirm it in a strong source.

#### Omar Khayyam (`epicurus`, was Epicurus)

- **Row:** Scholar, age III, strong. -15% happiness demanded per citizen, in every city of 8 or more citizens.
- **Culture:** Persia. 1048 to 1131, Nishapur.
- **Flavour:** Bread, a jug of wine, and the day is enough.
- **Who they were (the kernel):** A mathematician and astronomer of Nishapur in Persia. He solved cubic equations with geometry and helped to reform the calendar. He is best known for short poems about wine and the passing day; scholars dispute how many of them are his.
- **Time:** One band late (eleventh century in age III; Ibn Sīnā, of the same time, is in age III too).
- **Checked:** From memory. The dates and the work are standard. Scholars dispute how many of the poems are his, and the kernel says so. The plan of 2026-11-19 held him in reserve.

#### Amanitore (`heroOfAlexandria`, was Dinocrates)

- **Row:** Engineer, age III, strong. completing a wonder grants +3 production in every city for 10 turns.
- **Culture:** Kush. Ruled about the middle of the first century, Meroë, in Sudan.
- **Flavour:** What the raiders broke, she built again, and larger.
- **Who they were (the kernel):** A ruling queen of Kush. With her co-ruler Natakamani she built the temples of Naqa, restored the temple of Amun that a Roman army had wrecked, and dug reservoirs at Meroë.
- **Time:** In the row’s age.
- **Checked:** Web search. Sources agree on the building work. Her exact years are not known. This is the third person on the id heroOfAlexandria.

#### Gyōki (`apollodorus`, was Apollodorus of Damascus)

- **Row:** Engineer, age III, situational. +2 production in every city joined to your capital by road.
- **Culture:** Japan. 668 to 749, the provinces around Nara.
- **Flavour:** Where the road stopped at a river, he built.
- **Who they were (the kernel):** A Buddhist monk who walked the provinces of Japan with a following of ordinary people. They built bridges, roads, ponds and boat landings. The court first banned his preaching, then asked him to raise the funds for the Great Buddha of Nara.
- **Time:** One band late (eighth century in age III).
- **Checked:** Web search. The public works, the fundraising from 743 and the rank given in 745 agree across sources. He is a monk, and not the founder of a religion.

#### al-Hasan ibn Sulayman (`sostratus`, was Sostratus of Cnidus)

- **Row:** Engineer, age III, situational. +2 production, +2 gold in every city with a Harbour.
- **Culture:** Sub-Saharan Africa (the Swahili coast). Ruled about 1310 to 1333, Kilwa, in Tanzania.
- **Flavour:** They called him the father of gifts.
- **Who they were (the kernel):** Sultan of Kilwa, the island port that held the gold trade of the Swahili coast. He built the palace of Husuni Kubwa on the cliff above the harbour and enlarged the Great Mosque. A traveller who met him wrote of his generosity.
- **Time:** One band late (fourteenth century in age III).
- **Checked:** Web search for the reign and the buildings. Ibn Battuta’s visit and the name “father of gifts” are from memory. Ibn Battuta is a leader in the game, so the kernel says “a traveller”.

#### Zoskales (`hippalus`, was Hippalus)

- **Row:** Merchant, age III, situational. +2 gold on every hex with a Fishing Boat.
- **Culture:** Sub-Saharan Africa (the Horn). About the year 100, Adulis, on the coast of Eritrea.
- **Flavour:** Careful with his coin, and well read.
- **Who they were (the kernel):** The ruler of the Red Sea coast around the port of Adulis, where ivory and tortoise shell were sold to ships from Egypt. A Greek sailing guide calls him tight with money, honest and well read. That one passage is all we have.
- **Time:** In the row’s age.
- **Checked:** Web search. The guide calls him miserly, upright and read in Greek. Whether he ruled Aksum also is disputed, so the kernel names only the coast.

#### Jang Bogo (`pytheas`, was Pytheas)

- **Row:** Merchant, age III, situational. your trade units cannot be attacked or plundered · +3 gold on every trade route that ends in another empire’s city.
- **Culture:** Korea. Died between 841 and 846, Wando, in Silla.
- **Flavour:** No ship was taken while he kept the sea.
- **Who they were (the kernel):** A Korean who served as an officer in China, then came home to Silla and built a sea fortress on the island of Wando. He drove the slave raiders from the Yellow Sea and controlled the trade between Korea, China and Japan.
- **Time:** One band late (ninth century in age III).
- **Checked:** Web search. The garrison, the raiders and the trade agree. Sources give 841 or 846 for his death, so the card gives no year.

#### Anāthapiṇḍika (`pasion`, was Pasion)

- **Row:** Merchant, age III, strong. +1 gold per 50 gold in the treasury (at most +20 gold).
- **Culture:** India. About the fifth century BC, Shravasti.
- **Flavour:** He paid for the grove by covering it in coin.
- **Who they were (the kernel):** A banker of Shravasti in the time of the Buddha. The story says he bought a park for the monks at the price its owner named: enough gold coin to cover the ground. The story is from Buddhist scripture.
- **Time:** In the row’s age or a little early.
- **Checked:** Web search. He is known only from Buddhist texts, and the coin story is told larger in later books. The kernel says the story is from scripture. He is a patron, and not a founder.

### The ages

- The roster’s bands are loose: age II runs to about 450 BC, age III to about 450, age IV to about 1550. Hemiunu and Ibn Sīnā already sit one band from their time.
- Six of the eleven are in the row’s age: Anacharsis, Artachaees, Piye, Amanitore, Zoskales and Anāthapiṇḍika.
- Five are one band late: Pushyagupta, Omar Khayyam, Gyōki, al-Hasan ibn Sulayman and Jang Bogo.
- None is two bands late. The five who were (Varāhamihira, Yamanoue no Okura, Aj Maxam, Macuilxochitzin and Sulayman al-Tajir, all in age II) are withdrawn.
- The cause: the cultures the count is short of have few named people before 450 BC. No named Maya, Mexica or Japanese person is that early.

## 3. Ids that name an earlier person

| Row id | The person on the row today |
|---|---|
| `ibnBattuta` | Ibn Jubayr |
| `cosimoDeMedici` | Jacques Cœur |
| `theodorusOfSamos` | Anacharsis |
| `mandrocles` | Artachaees |
| `eupalinos` | Pushyagupta |
| `artemisia` | Piye |
| `epicurus` | Omar Khayyam |
| `heroOfAlexandria` | Amanitore (the third person on this id: Hero of Alexandria, then Dinocrates) |
| `apollodorus` | Gyōki |
| `sostratus` | al-Hasan ibn Sulayman |
| `hippalus` | Zoskales |
| `pytheas` | Jang Bogo |
| `pasion` | Anāthapiṇḍika |

`heronOfAlexandria` is Hero of Alexandria, and is correct. The five withdrawn rows name their own person again.

## 4. Considered and not chosen

| Person | Reason |
|---|---|
| Amanirenas of Kush | A good general, but the only general row is a naval one. Piye led a fleet and is in the row’s age. |
| Surena, Zenobia, Vercingetorix, Eulji Mundeok, Sundiata, Lady Triệu | Generals with no naval record. One general row was open, and it pays ships. |
| Khalid ibn al-Walid | A companion of the Prophet. The plan of 2026-11-19 left him out for that reason. |
| Rajendra Chola | A real naval general, but two bands late for age II. Piye fits the age. |
| Teuta of Illyria | A naval queen, one band late. Illyria is not one of the cultures the count is short of. |
| Sushruta, Charaka | Physicians. The two scholar rows pay for foreign cities seen and for calm large cities, and the roster has three physicians. |
| Pingala, Nabu-rimanni | No fit to either scholar row. Mesopotamia already has twelve people. |
| al-Biruni | The best fit to the Anaximander row, and famous. With him, four of the sixteen would be Persian or Central Asian and India would have two. He is the first reserve. |
| Mozi, Li Chun | Chinese. China has twenty-four people. |
| Valmiki | Legend. No date and no life can be given. |
| Imru’ al-Qais, Antarah ibn Shaddad, al-Khansa | Arab poets of the sixth and seventh centuries. Antarah fits the Telesilla row, but Macuilxochitzin keeps a woman in it and adds the Americas. |
| Kakinomoto no Hitomaro, Ōtomo no Yakamochi | Poets of the same book as Okura. Okura fits the Hesiod row better, and three people from Japan is the limit I kept to. |
| Hāla | A Satavahana king to whom a book of village verse is given. No coin or inscription of his is known, so I am not sure of him. |
| Tori Busshi | A bronze caster of Japan, well attested, for the Smithy row. Two bands late, where Anacharsis is in the age. |
| Sumhu’alay Yanuf of Saba | A builder of the Marib dam, in the row’s age, for the Eupalinos row. I could not check the inscription, and Pushyagupta gives India its third person. |
| Lady K’awiil Ajaw of Cobá | A Maya queen linked to a long stone road, for the road row. The link between her and the road is a modern guess. |
| Lady Six Sky, 8 Deer Jaguar Claw | Named rulers and generals of the Americas. No open row fits a land general. |
| Zayd’il the Minaean | An incense merchant buried in Egypt. Too little is known, and I could not check it. |
| Ajita Kesakambali | An Indian teacher of pleasure, close to Epicurus. Known only from the words of his opponents. |
| Himilco, Maniakh the Sogdian | Carthage and Sogdia each have a merchant of the same kind already. |

## 5. Files

- `data/greatPeople.json`: eleven rows, three fields each. The five withdrawn rows equal the rows before the swap.
- `docs/great-people.md`: eleven names in the tables (sync test `test/sim/greatPeopleDocSync.test.ts`).
- `docs/plans/great-people-pass-2026-11-19.md`: six names in the table of additions, because the same sync test reads it, and one note above the table. The rest of that plan still describes the people of 2026-11-19.
- `docs/codex.md`: four names on two lines, by hand. The whole file is out of date against `scripts/codex.mjs` for other reasons, and I did not regenerate it.
- `docs/plans/beta-checklist-2026-11-21.md`: the line about ids that name another person.
- Tests that name a person: `test/sim/greatPeople.test.ts`, `greatPeopleRoster.test.ts`, `greatPeopleShapes.test.ts`.
- Comments that name a person: `src/sim/arrival.ts`, `cities.ts`, `combat.ts`, `meters.ts`, `statecraftData.ts`, `statecraft/evaluator.ts`, `src/ai/value.ts`. No code and no bot weight changed.
- `scripts/splashArt.py`: eleven master names in `PEOPLE`.
- `docs/plans/splash-art-prompts-2026-11-21.md`: rebuilt, with eleven new prompts. The five Greek prompts are back as they were. The first 20 list is unchanged.
- Not changed: `docs/splash-art-brief-2026-11-19.md`, `docs/flags.md`, `docs/astra-suggestions.md`, and the files in `docs/audit/` and `docs/history/`. They are dated records and still use the old names.
- None of the eleven rows has a painted portrait (`src/ui/greatPersonPaintings.ts`).

## 6. What I am unsure of

- **Piye at Memphis.** The harbour attack is from my memory of the stela. If a reader finds it wrong, the flavour line and one kernel sentence change.
- **Anāthapiṇḍika and Anacharsis.** Both are real names in old sources with stories that grew. The kernels say so. Aesop and Sun Tzu are in the roster on the same terms.
- **Pushyagupta and Zoskales.** One source each. The roster has rows like this already (Peseshet, Widow Qing).
- **The Americas and the Arab world gain nobody** after the ruling. A later pass could look for age IV rows to give them.
- **Fame.** Omar Khayyam is the only one of the eleven that most players will know. Piye, Jang Bogo and Gyōki are well known in their own countries.
