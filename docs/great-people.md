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

## The roster — starter names by age and family

Register per Entry III and VII: *half-remembered* people, real kernels, the wunderkammer
rather than the textbook. Each row is name · one-line epigram · why them. Leaders (the
seats' own faces) are a separate roster and never appear here.

### Æra II — Heroes

| family | name | epigram | kernel |
|---|---|---|---|
| Scholar | **Imhotep** | *"He read the sky and then the stone."* | vizier, physician, the first architect with a name |
| Scholar | **Ahmes** | *"Here is the way of every dark thing."* | the scribe of the Rhind papyrus — its opening line |
| Artist | **Enheduanna** | *"I am the priestess; I write."* | the first author in history to sign her name |
| Artist | **Homer** | *"Blind, and the whole war before him."* | the bard; the Iliad is the age's book |
| Engineer | **Senenmut** | *"Every terrace of it was his."* | Hatshepsut's architect, Deir el-Bahari |
| Engineer | **Amenhotep son of Hapu** | *"They made him a god for building."* | the deified overseer of works |
| Merchant | **Ea-nāṣir** | *"You said the copper was fine."* | the merchant whose customers' complaint tablets survive — the wunderkammer's patron saint |
| Merchant | **Kushim** | *"29,086 measures barley 37 months."* | the first named person in writing — an accountant |
| General | **Ahmose son of Ebana** | *"I took a hand. I was given gold."* | the soldier whose tomb autobiography counts his trophies |
| General | **Piyamaradu** | *"The king wrote to the king about him."* | the Hittite-Mycenaean freebooter no treaty could hold |

### Æra III — Empire

| family | name | epigram | kernel |
|---|---|---|---|
| Scholar | **Archimedes** | *"Do not disturb my circles."* | the siege of Syracuse; the last words |
| Scholar | **Zhang Heng** | *"The dragon dropped its ball toward the earthquake."* | the seismoscope, the armillary sphere |
| Scholar | **Eratosthenes** | *"He measured the world with a well and a stick."* | the circumference of the earth |
| Artist | **Sappho** | *"Someone will remember us."* | the tenth muse; the surviving fragment |
| Artist | **Sima Qian** | *"He finished the Records rather than die."* | the Grand Historian |
| Engineer | **Li Bing** | *"He cut the mountain and the river obeyed."* | Dujiangyan, still watering the plain |
| Engineer | **Hero of Alexandria** | *"The temple doors opened by themselves."* | pneumatics; the staged miracle |
| Merchant | **Zhang Qian** | *"He went west and came back with the world."* | the envoy who opened the Silk Road |
| Merchant | **Hippalus** | *"He learned when the wind turned."* | the monsoon route to India |
| General | **Hannibal** | *"We will find a way, or make one."* | the Alps; the elephants |
| General | **Han Xin** | *"Backs to the river, they could not lose."* | the battle of Jingxing |
| General | **Boudica** | *"They burned three cities before the road."* | the rising |

### Æra IV — Cathedrals (candidates)

Scholars: **al-Khwārizmī** (*"the reckoning by restoration"*), **Shen Kuo** (*Dream Pool
Essays*), **Hildegard of Bingen**, **Ibn Sīnā** · Artists: **Murasaki Shikibu**, **Snorri
Sturluson**, **Rūmī** · Engineers: **al-Jazarī** (the automata), **Su Song** (the water
clock), **Villard de Honnecourt** (the sketchbook) · Merchants: **Ibn Baṭṭūṭa**, **Marco
Polo**, **Benjamin of Tudela** · Generals: **Subutai**, **Tomoe Gozen**, **El Cid**,
**Jan Žižka** (the wagon fort; blind, undefeated).

### Æra V — Magister (candidates)

Scholars: **Paracelsus** (*"the dose makes the poison"*), **Tycho Brahe** (the brass nose,
the island observatory), **John Dee** (the angelic conversations — the hermetic register's
own magister), **Copernicus** · Artists: **Christine de Pizan**, **Albrecht Dürer** (the
rhinoceros he never saw), **Hildegard**'s successor if not used above · Engineers:
**Leonardo** (the notebooks), **Taqī al-Dīn** (the Istanbul observatory), **Jacques de
Vaucanson** (the digesting duck — the Clockwork Servant's kernel), **Ada Lovelace** (the
Engine's one programmer; the magister's dream reaches her) · Merchants: **Jakob Fugger**,
**Zheng He** (the treasure fleet), **Cosimo de' Medici** · Generals: **Gustavus Adolphus**,
**Nzinga of Ndongo**, **Yi Sun-sin** (the turtle ships; never lost).

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

## Revisions

*(yours — edit away; ✎ marks what changed)*
