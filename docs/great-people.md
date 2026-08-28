# Great People and Triumphs — working doc

(2026-08-27, first pass; nothing scheduled.) Companion to `docs/tech-tree-ages-2-5.md`
(where great people first appear, in the Age of Heroes), design-notes Entry III (history's
half-remembered characters), Entry XVIII (windfall settlement — the seams a great person's
act pays through) and `docs/religion.md` (the augur, which is the *template* for an agent;
prophets stay religion's and are not in this system).

**User rulings so far:** great people are a *rolling* mechanic · the sources that are not
buildings are called **Triumphs** (2026-08-27; "deeds" retired) · triumphs are in.
**Still weighing:** whether great people make the initial cut at all (the argument for: they
are the third and last draft currency; the argument against: one more offer type).

**Ruled 2026-08-27 (user):** every great person has a **unique ability** — that is what the
draft is for — and the roster follows the **Doctrine philosophy**: some are game-defining
and situational *with a malice*, some are generic strong bonuses, some are situational with
no malice. See "Legacies" below.

## The shape in one paragraph

One empire-wide **renown** pool — the fourth Entry XVIII bucket — filled by **buildings**
(a trickle, the floor you can plan around), **wonders** (a lump and a trickle) and
**Triumphs** (lumps for notable things you did). The threshold escalates like the settler
ladder. When the bucket fills, a **1-of-3 offer** opens, drawn once at that moment from the
current age's roster, weighted by which sources fed the bucket; each name is drawn from a
roster **shared by every seat** and consumed on pick, resolved by log order, so only one
empire ever has Archimedes. The person arrives as an **agent** in the augur's shape — a unit
with charges — and has two verbs: an **act** (spend them now: a windfall through the seam
that already exists) or a **work** (plant them forever: a unique tile improvement). The
chronicle names them; the age plate lists who served you.

## Renown — who pays what (first numbers, to be measured)

| source | pays | note |
|---|---|---|
| a library / amphitheater / workshop / market / barracks | +1 renown/turn each, tagged with its family | the floor; a data column on `buildings.json` |
| a Lyceum / Printing House / Forge / Caravanserai / Tourney Ground | +2/turn | the mid-game houses |
| a wonder | +10 on completion, +2/turn after | wonders are how you recruit |
| a Triumph | +5 to +20 (table below) | announced the turn it happens |
| threshold | 40, then +25 per great person recruited | the settler ladder's shape; tune against the pacing test |

Ledger, rule 5: the HUD's renown figure hovers to "Library at Ur +1 · The Oracle +2 ·
*Triumph: First Light of the Æra* +15 · …", total under the double rule. The triumph list
is printed on that same hover, greyed where already earned — the whole system is one
breakdown a player can read.

## Triumphs — the starter list

Short enough to memorise; every one is something a player would do anyway; every one is
announced. **Once** = once per game per seat. **Per age** = the first time in each age.
**Contested** = only the first seat in the world earns it, by log order (Entry V's feats).

| # | triumph | when | pays | scope |
|---|---|---|---|---|
| 1 | **The Third Hearth** | your third city is founded | +10 | once |
| 2 | **First Light of the Æra** | you are the first empire to enter a new age | +15 | contested, per age |
| 3 | **A Marvel Raised** | you complete a wonder | +10 (on top of the wonder's own) | per wonder |
| 4 | **Against the Odds** | you win a battle against a unit of higher strength | +8 | per age |
| 5 | **The Camp Burned** | you clear a barbarian camp | +6 | per age |
| 6 | **A Ruin Read** | you claim a discovery | +5 | per age |
| 7 | **The Writ Extends** | you adopt a government | +10 | per adoption |
| 8 | **A God Named** | you consecrate a pantheon belief | +6 | per belief |
| 9 | **The Great City** | a city of yours reaches population 10 | +12 | once |
| 10 | **The Far Shore** | you found a city on a continent you did not start on | +12 | once |
| 11 | **The Taken** | you capture a city | +10 | per age ✎ (per capture would be the whole military faucet) |
| 12 | **The Fallen Become Verse** | you lose a unit in a battle you then win *(needs Epic Poetry)* | +6 | per age |
| 13 | **The Long Road** | two of your cities are connected by road *(needs The Royal Road)* | +8 | once |
| 14 | **The Eight Luxuries** ✎ | you have improved eight distinct luxuries | +10 | once |
| 15 | **The Ten Hearths** ✎ | ten cities in your empire | +15 | once |
| 16 | **The First Keel** ✎ | you build your first naval unit *(needs naval units — none exist yet; Sailing embarks civilians only)* | +5 | once |
| 17 | **The City of Marvels** ✎ | seven wonders in one city | +20 | once |

Seventeen (✎ user, 2026-08-27: The Unbowed removed — assault survival is too easy to farm — and four added). Trim if the hover gets long; the three that wait on later content are marked. Rules of the list: no triumph is the only
way over a threshold (the building floor always gets there); no triumph rewards a bank
statement (Entry VI's rule — claims on the world, never private milestones); contested ones
are the only ones another seat can take from you.

## The person — verbs by family

Five families. Prophets are religion's. For v1 the verbs are **per family**; a person's
name, epigram and portrait are flavour. (v2, if wanted: a **signature** per person — a
one-line twist on the family verb — is one JSON field.)

| family | fed by | **act** (spend the charge) | **work** (the improvement, one per person) |
|---|---|---|---|
| **Scholar** | library, Lyceum, university, Great Library | research windfall: a large slice of the current tech (`settleResearchWindfall`) | **Academy** — +3🔬 on the tile (+1 more with Education) |
| **Artist** | amphitheater, Hall of Deeds, Printing House | culture windfall into the draft basket (`settleCultureWindfall`) and +2 happiness in the city for 10 turns (a timed effect) | **Landmark** — +3🎵 on the tile, +1🎵 to adjacent landmarks |
| **Engineer** | workshop, Forge, watermill, the Pyramids | production windfall: hurries the front of the queue (`settleProductionWindfall`; a wonder needs two engineers) | **Manufactory** — +3⚙ on the tile |
| **Merchant** | market, bazaar, Caravanserai, the Colossus | gold windfall, scaled by age; *(later)* a free trade route | **Customs House** — +3🪙 on the tile, +1 more on a river or coast |
| **General** | barracks, Tourney Ground, wars (Against the Odds, The Taken) | a timed aura: friendly units within 2 hexes +3 combat for 5 turns (`liveUnitEffects`, a rite's shape); *or* heal every unit in 2 hexes | **Citadel** — +8 defense on the tile, the tile and its neighbours are claimed |

The **act / work** choice is the decision each recruit puts to you: the burst now or the
ground forever. Works are improvement rows (`improvements.json`) with a `greatPerson: true`
flag so a worker cannot build them, and they take the tile's meadow like a farm does.

## Legacies — the unique ability, and the three tiers

**A great person is a card that walks.** Their unique ability is written in the same effect
vocabulary Orders and beliefs use (`statecraftData.ts`'s shapes; `statecraft.ts` stays the
only reader), so a person is a JSON row — name, family, age, epigram, tier, effects — exactly
as a belief is. A shape that does not exist is a design decision, never a one-off.

**Where it lives:** the family verbs (act now / work forever) stay the *board* decision; the
unique ability is a **legacy** that attaches to the empire when the person is spent, either
way, and persists — *they served you; their legacy remains*. Two decisions per recruit
(which name, then burst or ground), one content cost per name, and the family-weighted draw
still matters because a general's legacy is a war card and a scholar's a science card.

Three tiers, the Doctrine split (`docs/statecraft-cards.md`), roughly 2 / 4 / 4 per age:

| tier | count/age | shape | examples from the roster |
|---|---|---|---|
| **Game-defining, with a malice** | ~2 | situational and large; the malice lands on a meter, a cost or a fragility, never on a yield you cannot see | **Ea-nāṣir** — copper and tin tiles +3🪙, but every luxury you hold counts one fewer for happiness (*"the copper was fine"*) · **Han Xin** — units beside a river or coast fight at +5, but each city's authority cost is +1 (the general the emperor could not keep) · **Archimedes** — siege +50% vs cities, and the legacy is *lost* the turn an enemy enters his city |
| **Generic strong** | ~4 | never the wrong pick; a flat that scales with the empire | **Imhotep** — +1⚙ in every city with a monument · **Zhang Qian** — +2🪙 per connected city · **Sappho** — capital +2🎵, +1 happiness · **Senenmut** — buildings −10% ⚙ |
| **Situational, no malice** | ~4 | great for one map or one plan, harmless otherwise | **Li Bing** — farms beside a river +1🌾 · **Hippalus** — fishing boats +1🪙, embarked units +1 movement · **Boudica** — +25% defending inside your borders, for the age she was recruited in · **Eratosthenes** — +1🔬 per continent you have revealed |

Per-person legacies for the full Heroes and Empire roster are written once the initial-cut
question is ruled — that is where the content volume is.

## The roster — the long list (≈2× what ships; cut freely)

**Ruled 2026-08-27 (user):** the family **boons** stay (a scholar's science burst, an
engineer's hurry, the works) and every person *also* leaves a permanent **legacy** on the
government. Eighty names below, twenty per age, four per family, so the cut can keep the
best ten or twelve. Tiers: **★** game-defining with a malice · **●** generic strong ·
**○** situational, no malice. Every legacy is written in the card vocabulary (flats,
conditions, `combatLine`, `unitStat`, `cityStat`, `meterRule`, `offerRider`, `windfallRider`,
tile conditions); the two or three that would need a new shape are marked *(new shape)*.
Register per Entry III and VII: half-remembered people, real kernels, the wunderkammer
rather than the textbook; no rulers (they are the leader roster's). Epigrams are one line.

### Æra II — Heroes

| family | name | tier | legacy | epigram · kernel |
|---|---|---|---|---|
| Scholar | **Imhotep** | ● | +1⚙ on monuments, cities have +5% production towards wonders. | *"He read the sky and then the stone."* · vizier, physician, the first architect with a name |
| Scholar | **Ahmes** | ○ | +2🔬 in every city on a river | *"Here is the way of every dark thing."* · the scribe of the Rhind papyrus, its opening line |
| Scholar | **Kidinnu** | ★ | capital +30% 🔬, but every city's border growth −25% — eyes on the sky, not the land | *"He knew where the moon would be in a hundred years."* · Babylonian astronomer; the lunar tables |
| Scholar | **Ptahhotep** | ○ | +1 authority capacity per library | *"Great is the law; enduring."* · the Maxims, the oldest book of advice |
| Artist | **Enheduanna** | ● | capital +3🎵; shrines +1🎵 | *"I am the priestess; I write."* · the first author to sign her name |
| Artist | **Homer** | ★ | a fallen unit pays 🎵 ×3 (Epic Poetry's line, tripled), but units cannot heal outside your borders — they march for the song | *"Blind, and the whole war before him."* · the bard |
| Artist | **Sin-lēqi-unninni** | ● | amphitheaters and the Hall of Deeds +2🎵 | *"He who saw the deep."* · compiler of the standard Gilgamesh |
| Artist | **Ilimilku** | ○ | coastal cities +2🎵 | *"He wrote the storm-god down."* · the Ugaritic scribe of the Baal cycle |
| Engineer | **Senenmut** | ● | buildings −10% ⚙ | *"Every terrace of it was his."* · Hatshepsut's architect |
| Engineer | **Hemiunu** | ★ | cities gain +30% ⚙ towards wonders everywhere, but −2 happiness while any wonder is in a queue — the levies | *"Two million stones, and his name on none."* · the Great Pyramid's overseer |
| Engineer | **Amenhotep son of Hapu** | ○ | wonders in the capital +20% ⚙ | *"They made him a god for building."* · the deified overseer of works |
| Engineer | **Bezalel** | ○ | cities with a shrine or temple +1⚙ +1🕯 | *"Filled with the spirit, in all manner of workmanship."* · the tabernacle's artisan |
| Merchant | **Ea-nāṣir** | ★ | bonus resources on mines +3🪙, but every luxury you hold counts one fewer for happiness | *"You said the copper was fine."* · the complaint tablets; the wunderkammer's patron |
| Merchant | **Kushim** | ● | +1🪙 per granary | *"29,086 measures barley 37 months."* · the first named person in writing — an accountant |
| Merchant | **Aššur-idī** | ○ | +2🪙 in every city that is not the capital — the colony trade | *"Send the tin by the next donkeys."* · Old Assyrian trader of the Kanesh letters |
| Merchant | **Lamassī** | ○ | plantations and pastures +1🪙 — textiles for the caravans | *"I wove the cloth; you sold it short."* · the merchant's wife whose letters survive |
| General | **Ahmose son of Ebana** | ● | melee units +1 combat | *"I took a hand. I was given gold."* · the soldier's tomb autobiography |
| General | **Piyamaradu** | ★ | units +3 combat outside your borders, but −2 authority capacity — no treaty could hold him | *"The king wrote to the king about him."* · the Hittite-Mycenaean freebooter |
| General | **Sinuhe** | ○ | units heal +5 anywhere — the wanderer's medicine | *"I fled, and no one pursued."* · the exile who fought for Retjenu and came home |
| General | **Deborah** | ○ | +25% combat within two hexes of your own city | *"The stars in their courses fought."* · the judge who led at Kishon |

### Æra III — Empire

| family | name | tier | legacy | epigram · kernel |
|---|---|---|---|---|
| Scholar | **Archimedes** | ★ | siege units +50% vs cities; the legacy is *lost* the turn an enemy enters his city | *"Do not disturb my circles."* · Syracuse |
| Scholar | **Hypatia** | ★ | +10% 🔬 empire-wide; lost the first turn happiness goes negative — the mob | *"Reserve your right to think."* · Alexandria |
| Scholar | **Zhang Heng** | ● | libraries +2🔬 | *"The dragon dropped its ball toward the earthquake."* · the seismoscope |
| Scholar | **Eratosthenes** | ○ | +1🔬 per every 20 tiles you have revealed | *"He measured the world with a well and a stick."* · the circumference |
| Artist | **Sappho** | ● | capital +2🎵, +1 happiness | *"Someone will remember us."* · the fragment |
| Artist | **Qu Yuan** | ★ | +30% 🎵 empire-wide, but capital −5 happiness — the exile's lament | *"The road is long; I will search high and low."* · the poet of the Chu Ci |
| Artist | **Sima Qian** | ○ | +1🎵 in every city per age that has closed | *"He finished the Records rather than die."* · the Grand Historian |
| Artist | **Phidias** | ○ | each wonder +3🎵 | *"He put his own face on the shield."* · the Parthenon's sculptor |
| Engineer | **Li Bing** | ○ | farms beside a river +1🌾 and +1 prod | *"He cut the mountain and the river obeyed."* · Dujiangyan |
| Engineer | **Hero of Alexandria** | ● | workshops +2⚙, wonders that supply science gain +5 prod | *"The temple doors opened by themselves."* · pneumatics |
| Engineer | **Vitruvius** | ● | cities with an aqueduct +2⚙, +1 happiness | *"Firmness, commodity, delight."* · the ten books |
| Engineer | **Eupalinos** | ○ | cities adjacent to a mountain +3🌾+2prod — the tunnel | *"They met in the middle of the hill."* · Samos |
| Merchant | **Zhang Qian** | ● | +2 gold per 20 tiles explored | *"He went west and came back with the world."* · the Silk Road's envoy |
| Merchant | **Nanaivandak** | ● | +2🪙 per connected city, +10% 🪙 from city connections | *"The letters never reached home."* · the Sogdian Ancient Letters, found sealed at Dunhuang |
| Merchant | **Hippalus** | ○ | fishing boats +1🪙; embarked units +1 movement | *"He learned when the wind turned."* · the monsoon |
| Merchant | **Crassus** | ★ | purchases −30% 🪙, but every purchase −1 happiness for 10 turns — the fire brigade | *"No man is rich who cannot pay an army."* · the fire brigade; Carrhae |
| Merchant | **Pytheas** | ○ | coastal cities and scouts +1 sight | *"Where the sea congeals."* · Massalia to Thule |
| General | **Hannibal** | ★ | +5 attacking in foreign territory, −4 defending in your own — the army that never came home | *"We will find a way, or make one."* · the Alps |
| General | **Han Xin** | ● | units +2 combat when adjacent to a river or coast | *"Backs to the river, they could not lose."* · Jingxing |
| General | **Boudica** | ○ | +25% defending inside your borders, for the age she was recruited in | *"They burned three cities before the road."* · the rising |
| General | **Spartacus** | ○ | units +3 combat when attacking at a strength disadvantage | *"He left the school with kitchen knives."* · Vesuvius |

### Æra IV — Cathedrals

| family | name | tier | legacy | epigram · kernel |
|---|---|---|---|---|
| Scholar | **al-Khwārizmī** | ● | universities +3🔬 | *"The reckoning by restoration and balancing."* · al-jabr |
| Scholar | **Shen Kuo** | ○ | +1🔬 per improved strategic resource | *"The needle points south, and a little east."* · the Dream Pool Essays |
| Scholar | **Ibn Sīnā** | ● | +1 happiness in every city — the Canon | *"Medicine is not hard; the hard part is the patient."* · the Canon of Medicine |
| Scholar | **Āryabhaṭa** | ○ | shrines gain +2🔬 — the sky read from the temple | *"The earth turns; the stars do not."* · the Āryabhaṭīya |
| Artist | **Murasaki Shikibu** | ● | gain 2 culture for every active melee unit | *"The world is a floating bridge of dreams."* · the Tale of Genji |
| Artist | **Snorri Sturluson** | ★ | a fallen unit pays 🎵 and 🕯 (both), but −2 authority capacity — the chieftain who wrote treason | *"He told the kings' lives and lost his own."* · the Edda, the Heimskringla |
| Artist | **Rūmī** | ○ | cities with a temple +2🎵, +1 happiness | *"Out beyond ideas of wrongdoing…"* · the Masnavi |
| Artist | **Sei Shōnagon** | ○ | +1🎵 per luxury you hold | *"Things that make the heart beat faster."* · the Pillow Book |
| Engineer | **al-Jazarī** | ● | workshops +3⚙ | *"It poured the wine and bowed."* · the automata |
| Engineer | **Su Song** | ○ | capital +2🔬 +2⚙ | *"The tower kept the hours and the heavens."* · the water clock |
| Engineer | **Villard de Honnecourt** | ● | buildings and wonders −15% ⚙ | *"Drawn from life, and from thought."* · the sketchbook |
| Engineer | **Li Jie** | ★ | buildings −20% ⚙, but border growth −25% in every city — the state's every hammer | *"A standard for every beam."* · the Yingzao Fashi |
| Merchant | **Benjamin of Tudela** | ● | +1🪙 per city | *"He counted every congregation."* · the Itinerary |
| Merchant | **Ibn Baṭṭūṭa** | ○ | +1🪙 per foreign city you have sighted | *"Thirty years, and I never took the same road twice."* · the Rihla |
| Merchant | **Marco Polo** | ○ | +3🪙 per trade route to another empire *(needs trade routes)* | *"I have not told the half."* · the Travels |
| Merchant | **Francesco Datini** | ● | markets +2🪙 | *"In the name of God and of profit."* · the merchant of Prato's ledgers |
| General | **Subutai** | ★ | mounted +1 movement and +5 attacking, but every city −5 defense — the horde has no walls | *"He conquered thirty nations from the saddle."* · the Mongol strategist |
| General | **Tomoe Gozen** | ● | mounted and ranged +2 combat | *"A warrior worth a thousand."* · the Heike |
| General | **Jan Žižka** | ○ | fortified units +5 defense — the wagon fort | *"Blind, and undefeated."* · the Hussite wars |
| General | **El Cid** | ○ | units +3 combat in cities you captured | *"He won a battle dead."* · Valencia |

### Æra V — Magister

| family | name | tier | legacy | epigram · kernel |
|---|---|---|---|---|
| Scholar | **Paracelsus** | ★ | +25% 🔬 empire-wide, but every city −1 happiness — the dose | *"The dose makes the poison."* · the alchemist-physician |
| Scholar | **Tycho Brahe** | ○ | cities on hills or beside a mountain +3🔬 | *"A brass nose, and an island for the stars."* · Uraniborg |
| Scholar | **John Dee** | ● | every draft shows one extra card *(offerRider)* | *"The angels speak in a language of their own."* · the magister's own magister |
| Scholar | **Copernicus** | ● | +2🔬 in every city | *"He stopped the sun and moved the earth."* · De revolutionibus |
| Artist | **Christine de Pizan** | ● | +3🎵 and +1 authority capacity in the capital | *"A city of ladies, built of reason."* · the first professional woman of letters |
| Artist | **Dürer** | ○ | +2🎵 per wonder — the prints | *"A rhinoceros he never saw, drawn perfectly."* · the woodcuts |
| Artist | **Bashō** | ○ | forest tiles you work +1🎵 | *"Even in Kyoto, I long for Kyoto."* · the narrow road |
| Artist | **Sor Juana** | ○ | universities +2🎵 | *"I do not study to know more, but to ignore less."* · the tenth muse of Mexico |
| Engineer | **Leonardo** | ★ | engineer boons doubled and wonders −30% ⚙, but projects pay half — he never finishes | *"Art is never finished, only abandoned."* · the notebooks |
| Engineer | **Taqī al-Dīn** | ● | capital gains +15% science, doubled if settled next to a mountain| *"He measured the comet and they tore the tower down."* · the Istanbul observatory |
| Engineer | **Mimar Sinan** | ○ | temples and cathedrals −30% ⚙, +1🎵 | *"An apprentice's mosque, a journeyman's, a master's."* · the Süleymaniye |
| Engineer | **Vaucanson** | ○ | workers +1 charge | *"It ate, it digested, it— well."* · the mechanical duck |
| Merchant | **Jakob Fugger** | ★ | +30% 🪙 and purchases −20%, but −1 authority capacity per three cities — he bought the emperor | *"Rich by the grace of God."* · the Fugger bank |
| Merchant | **Zheng He** | ● | coastal cities +3🪙; embarked units +2 movement | *"Seven voyages, and then the ships were burned."* · the treasure fleet |
| Merchant | **Gracia Mendes Nasi** | ● | new cities are founded with +1 population | *"She moved a whole people by ledger."* · the House of Mendes |
| Merchant | **Cosimo de' Medici** | ○ | +1🎵 per 50🪙 in the treasury, up to +6 | *"Patron of everything, prince of nothing."* · the bank that bought a Renaissance |
| General | **Gustavus Adolphus** | ● | ranged +2 combat; siege +1 movement | *"The Lion of the North."* · Breitenfeld |
| General | **Nzinga of Ndongo** | ○ | units +5 defending in forest or jungle | *"She sat on her servant's back rather than the floor."* · the forty-year war |
| General | **Yi Sun-sin** | ○ | naval units +5 combat *(needs naval units)* | *"Thirteen ships against three hundred."* · Myeongnyang |
| General | **Lautaro** | ○ | units +3 combat vs mounted | *"He learned their horses and turned them."* · the Mapuche toqui |

**Roster size vs seats (2026-08-27):** ~3 recruits per seat per age, so 20 names serve four
seats and run dry at eight. Rather than 50 names per age, three rules that degrade
gracefully: (1) the family weight *biases* the draw and never restricts it — an empty
family falls through to the others; (2) when an age's pool holds fewer than three names
the draw **spills** to the previous age's unclaimed first (*the forgotten*, recruited late)
and then to the next age's (*ahead of their time*) — both flavour the annal can state;
(3) the offer shrinks before it fails — two candidates, then one, never a block. Add names
to the ages that spill most (Heroes, Empire) once the pacing test measures recruits per age.

**Counts:** 80 names · per age 4★ / 8● / 8○ → cut to ~2★ / 4● / 4○ per age as the Doctrine
philosophy suggests, or keep the long list and let the roster's *depth* be what makes two
games differ. Marked as waiting on content: Marco Polo (trade routes), Yi Sun-sin (naval
units); Homer and Snorri assume Epic Poetry's death-culture line.

## What this needs, and what it reuses

**Reuses:** the bucket + threshold + offer machinery (Statecraft's, `offerCard.ts`), the
agent shape (`purchase`/charges/consume verbs from the augur), all four windfall seams, timed
effects, `liveUnitEffects`, improvement rows and sculpts, the chronicle, the seat-shared
draw resolved by log order (discoveries).

**New, and small:** `Player.renownPool` and the ladder in `rules.json`; a `renown` column on
buildings and wonders; the triumph table as data (`data/triumphs.json`: id, name, epigram,
trigger kind, pays, scope) read by one evaluator that hangs off the events that already
announce (found city, complete wonder, combat result, camp cleared, claim, adoption,
consecration, growth, capture); `data/greatPeople.json` (the roster: name, family, age,
epigram); five improvement rows with `greatPerson: true`; the offer command
(`chooseGreatPerson`, index-picked) and the two verbs. The trigger kinds are the only new
hook shape, and they are one `switch` in one file.

## Open rulings

1. **Offer composition:** mixed families weighted by feed (recommended — a scholar, a
   general, a merchant is a decision) vs one family per draft.
2. ~~Works per family vs a signature per person~~ — **ruled: unique per person**, as a legacy in the card vocabulary; the family keeps the two verbs.
3. **Initial cut:** in, or after the first playable-to-the-curtain build?
4. **Trim** the triumph list to ten? Which four go — I'd drop 6 (A Ruin Read: discoveries
   are already their own reward), 9 (A God Named: faith is its own draft), 13 and 14
   (both need later techs).

## As built, 2026-08-28 — the legacies that were waiting on a shape

The roster shipped 2026-08-27 with 23 rows carrying an empty `legacy` and 37 carrying a
`deferred` sentence, because the shapes were not there. **Nineteen of those rows are now
built**; six rows still leave nothing behind. Nothing was bent to nearly fit — every row
below is written in a shape `statecraft.ts` reads, and the sentence in the right-hand
column is what `describeCard` actually prints on the card.

**Three extensions carried most of it**, each a growth of a union already designed to grow,
each read in the one place its family lives:

| extension | read in | rows it unblocked |
|---|---|---|
| `CountKind` +6 (`wonders`, `revealedTiles`, `sightedCities`, `improvedStrategicResources`, `agesClosed`, `unitsInField`) and `countScaled.class` | `countOf` | Phidias, Dürer, Eratosthenes, Zhang Qian, Ibn Baṭṭūṭa, Shen Kuo, Sima Qian, Murasaki Shikibu |
| `CombatCondition` +5 (`capturedCity`, `onFeature`, `freshwater`, `coastal`, `fortified`) | `combatConditionHolds` | Nzinga, Han Xin, Jan Žižka, El Cid |
| `CityScope` +2 (`onHills`, `notCapital`) and `productionBonus.scope` | `cityScopeAdmits`, `cardProduction` | Tycho Brahe, Aššur-idī, Amenhotep son of Hapu |

Eight more rows needed **no new shape at all** — their deferral sentences had gone stale
when the wonders pass (2026-08-27) added `combatLine.class`, `unitStat.where: 'embarked'`,
`TileCondition.freshwater`, `CountKind.buildingsOfKind` and `purchaseRider`.

| person | now prints | note |
|---|---|---|
| **Ptahhotep** | +1 authority capacity per Library | `buildingsOfKind` |
| **Homer** | losing a unit grants +9 culture | Snorri's death rider, tripled; his second half is built below |
| **Archimedes** | +6 combat strength for siege units against cities | `combatLine.class`; his malus is built below |
| **Li Bing** | +1 food, +1 production on every farm tile beside fresh water | `freshwater` is a river edge *or* a lake beside it, so slightly wider than "river" |
| **Hippalus** | fishing boats +1 gold · all units +1 movement while embarked | |
| **Zheng He** | coastal cities +3 gold · all units +2 movement while embarked | |
| **Crassus** | all units and buildings cost −30% to buy | `purchaseRider.on: 'all'` |
| **Jakob Fugger** | +30% gold · −1 authority per 3 cities · all units cost −20% to buy | as above |
| **Phidias / Dürer** | +3 / +2 culture per wonder you hold | a captured wonder moves the count with the stones |
| **Eratosthenes** | +1 science per 20 hexes you have revealed | the seat's own monotone grid ✎ *a fully-charted map pays large; worth measuring* |
| **Zhang Qian** | +2 gold per 20 hexes you have revealed | as above |
| **Ibn Baṭṭūṭa** | +1 gold per foreign city you have sighted | city memory, never his own towns |
| **Shen Kuo** | +1 science per improved strategic resource | |
| **Sima Qian** | +1 culture per age that has closed, in every city | |
| **Murasaki Shikibu** | +2 culture per melee unit in the field | |
| **Nzinga of Ndongo** | +5 combat strength in forest · in jungle | a disjunction is two lines |
| **Han Xin** | +2 combat strength beside fresh water · on the coast | a hex that is both pays twice |
| **Jan Žižka** | +5 combat strength while fortified | |
| **El Cid** | +3 combat strength in a city you took by force | |
| **Tycho Brahe** | +3 science in every city beside a mountain · on hills | |
| **Aššur-idī** | +2 gold in every city but your capital | |
| **Amenhotep son of Hapu** | +20% production toward wonders, in your capital | |

## As built, 2026-08-28 (second pass) — the one-row shapes, and revocation

The user's ruling: *"do a pass on orders/doctrines/great people that haven't been
implemented; implement any remaining items that aren't blocked on the upcoming technology
tree."* Every row on the deferred list above is now built except the three that name
something the tree owes. Each shape is generic and read in the one place its family already
lives.

| person | now prints | shape, and where it is read |
|---|---|---|
| **Deborah** | +4 combat strength within 2 hexes of one of your cities | `CombatCondition.withinOfCity` → `combatConditionHolds`. Her printed +25% is a flat by the table's own percent↔flat rule |
| **Spartacus** | +3 combat strength against a stronger unit | `CombatCondition.strongerTarget`, off `CombatSituation.vsStrength` — base against base, never the fold |
| **Hemiunu** | +30%⚙ toward wonders · while any city is building a wonder: −2 happiness | `EmpireCondition.queueHolds`, read through `queueCategory` — the one place a queue row is sorted |
| **Ea-nāṣir** | +3🪙 on every mine hex carrying a bonus resource · every luxury you hold counts 1 fewer toward happiness | `effectAmplifier.amount`, the amplifier's **flat dial** — a whole point, which no share of the table's figure could say exactly |
| **Hero of Alexandria** | +5⚙ in every city holding a wonder that supplies science | `CityScope.hasBuildingYielding`, asked of what a row *does* rather than which row it is |
| **Mimar Sinan** | +1🎵 with a Temple · +30%⚙ toward Temples | `productionBonus.building` |
| **Homer** | losing a unit grants +9🎵 · your units do not heal outside your own borders | `BehaviorRuleId.noHealAbroad`, read in `healUnits` — the one place a heal is decided |
| **Leonardo** | +30%⚙ toward wonders · a great person's act pays +100% more | `AmplifierTarget.greatPersonAct`, applied to each family's own figure *before* the seam that banks it |
| **Crassus** | all units and buildings cost −30% to buy · buying anything costs your empire −1 happiness for 10 turns | `WindfallOccasion.purchase` (the member the table had refused until a card wanted to pay on a purchase and **not** on a completion) + `WindfallGrantSpec.timed` on the new `Player.timed` |
| **Nanaivandak** | each connected city pays +2🪙 · city connections pay +10% more | `AmplifierTarget.connectionYields`, both dials on one row, folded into `explainEmpireGold`'s connection line |
| **Marco Polo** | +3🪙 per trade route to another empire | `CountKind.foreignTradeRoutes`, read off the board like `tradeRoutes` |

**Revocation, built once for all three rows.** `Player.legacies` is now a list of
`LegacyRecord`s (`{ id, age, revoked? }`) and `GreatPersonDef.revokedWhen` names the
occasion. Marking is the whole mechanism — **history is never deleted**: the roll stays in
spend order, `greatPeopleEarned` goes on counting a revoked name (The Empire's line says
*earned this game*), and `liveEffects` is the one place a marked record stops being read.
`revokeLegacies` is the only writer. Two occasions are conditions of a turn and are swept in
the `reviewLegacies` phase, a broom's twin — marking twice changes nothing; the third is a
genuine moment and is hooked at `arriveOnTile`.

| person | now prints | occasion |
|---|---|---|
| **Archimedes** | +6 combat strength for siege units against cities · lost the turn an enemy soldier enters your capital's territory | `enemyEntersCapital` — a *soldier* (`isCombatant`), hooked at `arriveOnTile` |
| **Hypatia** | +10% science in every city · lost the first turn your happiness goes negative | `happinessNegative` — swept |
| **Boudica** | +4 combat strength inside your territory · lost when the age it was earned in closes | `ageAdvanced` — compared against `LegacyRecord.age`, never counted down |

**Still deferred, and each waits on the tree or on a system**: Sin-lēqi-unninni (the Hall of
Deeds) · Yi Sun-sin (naval units) · Mimar Sinan's cathedral half · Leonardo's *"projects pay
half as much"* (a project's payout is deliberately unmodifiable — Entry XXVI, and a card
that wanted a percentage of a conversion would be reopening that argument).

## Revisions

*(yours — edit away; ✎ marks what changed)*
