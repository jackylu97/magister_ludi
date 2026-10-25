# Devotion Doctrines (proposal)

**Status:** proposal, 2026-10-25. Nothing is built. No code, data or deck sheet changed. This is stage 6 of the deck pass (the card-design skill, "Doctrines") for Devotion. The Devotion build plan (`docs/plans/devotion-themes-triage.md`, "Doctrines") gives the sheet four empty Doctrine tables in batch DV1 and leaves the design to this file, then to a triage of its own.

The user's request, 2026-10-25, verbatim: *"Please do a pass on the doctrines for the remaining decks"*. Devotion and Magisterial had no Doctrines. Magisterial's are written at the same time, in their own file.

## 1. How to read this

- **One section a tier,** Tiers I to IV. Each starts with a table: Doctrine | Theme | Text | Drawback | Shape. Notes on each Doctrine follow the table: why it is here, what it changes in play, its size against the power bar, and its historical model.
- **Theme:** the engine (faith, and what it buys), or one of the four themes of `docs/plans/devotion-themes.md`: the devout realm, the holy places, the spreading faith and the holy war. Each tier has at most one Doctrine for each of these five homes (themes pass, section 8: *"one for each theme at most of Tiers I to IV"*).
- **Shape:**
  - *existing:* the effect kinds and fields that already say it, with the live row that uses the same form;
  - *near existing:* one small field or member on a shape that exists, or a shape the Devotion build already makes for an Order;
  - *new shape:* what is missing. Section 9 groups the new shapes.
- **Numbers are first guesses.** The effort went into what each Doctrine does.
- **Plain text, no card names.** No Doctrine names an Order or another Doctrine (principle 8). A Doctrine may name a game object: the Magnum Opus, a holy site, the holy city, a faith house.
- **The card words are the Devotion pass's readings** (themes pass, section 12, and the build plan's readings 1 to 3):
  - a **devout town** is one of your towns that follows your religion (feature E; the town scope `ownersFaith` with `keeps: true`);
  - a **god** is a pantheon belief (The Creed's reworked words);
  - **religion cards wait for Tier II:** no Tier I Doctrine needs The High Temple, a prophet or a founded religion;
  - a **conversion** is a moment (feature F). No Doctrine here needs it, so none waits on batch DV6.

**When each tier is offered, and the bar it is sized against** (`.claude/skills/card-design/references/power-bar.md`; the turns are the bot model):

| Doctrine tier | Offered with | First offer, about | The age then | A regular card pays | A headline card pays |
|---|---|---|---|---|---|
| I | tier-4 governments | turn 32 | late age 1, age 2 | 15 to 25 a turn | 40 to 50 |
| II | tier-10 governments | turn 72 | late age 2, age 3 | 35 to 60 | 100 or more |
| III | tier-18 governments | turn 133 | late age 3, age 4 | 60 to 120 | 200 or more |
| IV | tier-26 governments | turn 161 | age 4 | 60 to 120 | 200 or more |

A Doctrine is held all game and takes no chair. Your comments on the Expansionist and Scientific Doctrines (section 2) set the size here: a Doctrine with no drawback aims at the regular card of its tier or a little above, and the one with a drawback aims near the headline.

## 2. How the Doctrines fit the deck

**The deck in one line** (`docs/decks/deck-design.md`, "Direction, 2026-10-20"): Devotion is paid for devotion (faith spent, devout towns, followers), is strongest late, when the investment pays back, and gives up early tempo, because it pays up front. Your picture: *"faith allows greater authority and wider empires and allows larger population centers to remain happy"*, and *"Strength from having more followers, performing religious actions, performing actions in devout cities, and playing around the bonuses from your religion."*

**Your taste in Doctrines, and what this file does with it.** You commented on 22 of the 32 Expansionist Doctrines (`docs/plans/expansionist-builds.md`, "Your comments, 2026-10-23") and revised three Scientific ones (`docs/plans/scientific-doctrines.md`):
- Most revisions removed the drawback: *"remove the malice"*, *"no malice"*. So 15 of the 16 here carry none.
- You cut Doctrines that do not matter in their age: *"probably don't need to think about settling new cities in age 4"*. So each Doctrine here pays in the tier it is offered and still pays in age 4.
- You asked for a Doctrine to be stronger (*"This seems worse than crop rotation, needs to be stronger."*) and rewrote several as plain rules on one game object (*"Aqueducts supply +3 happiness and are built 50% faster."*). So each text here is one plain rule on one thing the deck already has: rites, gods, beliefs, devout towns, the holy city, holy sites, faith houses, faith spent.
- On Scientific you cut a surcharge from 25% to 10% and swapped +15% strength for a flat +5. So the one combat Doctrine here is a flat line.

**What a Devotion Doctrine does.** Each one turns a part of the deck's identity into a rule the seat keeps for the whole game:
- **The engine (2):** every faith the seat spends pays back. First in happiness (The Theoric Fund), then in the Magnum Opus (The Saint Peter's Indulgence).
- **The devout realm (4):** rites hold the realm (The Rites of Zhou), devout towns keep their rites for free (The Capitulary of Herstal), devout towns grow faster (The Imarets), and devout towns may buy every faith house (The House of Worship).
- **The holy places (3):** the holy city asks no happiness (The Patrimony of Peter), holy sites are always worked (The Canons of the Holy Sepulchre), and holy sites pay double (The Two Sanctuaries).
- **The spreading faith (4):** the gods count twice (The Serapeum), the religion holds two more beliefs (The Seven Councils), an empire whose capital follows you cannot go to war with you (Canossa), and the followers abroad pay you too (The Apostolic Camera).
- **The holy war (3):** each god and belief is strength (The Paean), land that follows your religion feeds the army (The Ribats), and the dead spread the faith (The Martyr's Crown).

**The religion waits for Tier II.** The four Tier I Doctrines read what age 1 has: faith spent, rites, gods, and gods and beliefs as one count. None needs The High Temple.

**The cost shows.** Devotion pays up front. The Tier I Doctrines pay back what the seat has already spent (faith, rites, the ladder's gods), so each starts small and grows. Eleven of the twelve Doctrines of Tiers II to IV need a religion the seat holds, which is the deck's real risk (question 3).

**A path through the tiers for each theme.** A seat that leans on one theme can find its Doctrine at most adoptions:

| Home | Tier I | Tier II | Tier III | Tier IV |
|---|---|---|---|---|
| engine | The Theoric Fund | | | The Saint Peter's Indulgence |
| devout realm | The Rites of Zhou | The Capitulary of Herstal | The Imarets | The House of Worship |
| holy places | | The Patrimony of Peter | The Canons of the Holy Sepulchre | The Two Sanctuaries |
| spreading faith | The Serapeum | The Seven Councils | Canossa | The Apostolic Camera |
| holy war | The Paean | The Ribats | The Martyr's Crown | |

- The holy places have no Tier I Doctrine because they have no Tier I card: holy sites need a prophet (themes pass, 4.2).
- The holy war has no Tier IV Doctrine. Its Tier IV Orders (The Last Crusade, The Host Restored, The Peace of God) already cover the Opus war.

**Doctrines that combine.** Two Doctrines that reward one commitment together are intended (your ruling for Dominion, 2026-10-16: *"#3 is intentional"*):
- The Rites of Zhou and The Capitulary of Herstal: devout towns keep their rites for free, and each rite town gives authority.
- The Canons of the Holy Sepulchre and The Two Sanctuaries: every holy site is worked, and pays double.
- The Imarets and The Patrimony of Peter: devout towns grow, and the holy city stays content however big it grows.
- The Theoric Fund and The Saint Peter's Indulgence read the same record (faith spent). The Capitulary of Herstal pulls against both, because a free rite spends no faith. That is a real choice.

**What the Doctrines leave to the Orders.** The Orders already open faith purchases, lengthen rites (The Octave), cut what devout towns cost in authority (The State Church, The Caliphate), keep big devout towns content per citizen (The Deaconries), raise the faith rate into the Opus (The Last Offering), pay the Opus for followers abroad (The Great Consecration), give sight (The Confessors), and give strength in land that follows your religion (The Spiritual Host). No Doctrine here does one of those jobs (section 7 checks each one).

**What a pair seat gets.** Adopting a government offers Doctrines of its tier: one from each of the seat's two decks, then a third from either (`drawDoctrineOffer`). A deck with no Doctrine left in the tier gives its place to the rest of the bag. With four a tier, a Devotion seat sees one or two Devotion Doctrines at each adoption, beside one or two of its partner's.

| Partner | Its Doctrines today | What the pair gets |
|---|---|---|
| Dominion | 15 live | The holy war. The Paean's strength sums with Combined Arms and The Fortress Empire. The Martyr's Crown turns the losses of Total Mobilisation and The Landsturm into faith pressed on the front. The Ribats and The Marian Reforms both waive upkeep, so a seat holding both has two answers to one cost. Canossa pulls against a conqueror: a neighbour whose capital follows you cannot be attacked. |
| Expansionist | none built; 24 after your comments of 2026-10-23 (`docs/plans/expansionist-builds.md`) | Sacred land and the wide realm. The Rites of Zhou and The Commanderies both make room for towns. The Imarets beside Synoecism grows devout towns faster still. Empire Without End's slower growth pulls against The Imarets. The Contented City and The Patrimony of Peter both ease happiness. |
| Commerce | none built; 16 proposed (`docs/plans/commerce-doctrines.md`) | Pilgrims and markets. The Forbidden Silks and The Monte di Pietà give happiness beside The Theoric Fund. The Peace of Lodi pays at peace, and Canossa keeps some neighbours at peace. The Opera del Duomo pours gold into the Opus and The Saint Peter's Indulgence speeds it with faith spent, so the pair raises it from two banks. |
| Scientific | none built; 16 proposed (`docs/plans/scientific-doctrines.md`) | Scholars of the faith. The Canons of the Holy Sepulchre shares The Pandidakterion's new shape (a work worked with no citizen). The Removal to Xianyang and The Imarets both grow towns faster. The Deputatoi heals the army at home and The Ribats feeds it there. The Platonic Academy turns great people into Academies; holy sites are a prophet's work, so they are not affected. |
| Magisterial | being written now | Magisterial owns the government system, the Doctrine offer included (ruling 4 of 2026-10-20). No Doctrine here changes the offer. The pairs are to confirm when its file is done. |

## 3. Tier I (with the tier-4 governments)

| Doctrine | Theme | Text | Drawback | Shape |
|---|---|---|---|---|
| **The Theoric Fund** | engine | +1 happiness for every 100 faith you have spent this game, at most +15. | None. | Near existing. `pays`, `where: 'empire'`, `basis: 'count'`, `count: 'faithSpent'`, `per: 100`, `to: 'happiness'`, `amount: 1`, `max: 15` (the enhancer Congregation's form). The count is the record of faith spent that The Book of Life needs (build plan, DV3: `Player.faithSpent` and the `CountKind` `faithSpent`). |
| **The Rites of Zhou** | devout realm | +1 authority for each of your towns keeping a rite. | None. | Existing. `authority`, `amount: 1`, `per: 'city'`, `scope: { test: 'keepingRite' }` (The Provincial Chancery's scoped form). |
| **The Serapeum** | spreading faith | Each of your gods gives twice its effects. | None. | **New shape, small:** a meta rule that reads the gods twice in `liveEffects`' fourth source (the sibling of `techCountsTwice`). Reading: an offer is not doubled. |
| **The Paean** | holy war | Your military units gain +1 strength for every god and belief you hold. | None. | Near existing. `combatLine`, `amount: 1`, `side: 'both'`, `when: { test: 'always' }`, `class: { category: 'military' }`, `scaled: { count: 'beliefsHeld', per: 1 }` (Centurions' scaled form). Missing: `beliefsHeld` as a `CombatScaleCount`, read as the `CountKind` that The Creed's rework widens to count gods (build plan, DV3). |

**The Theoric Fund** (engine)
- **Why:** the deck's cost is that it pays up front. This makes the investment visible as it grows: every faith the seat spends adds to a lasting payback. It also carries your picture of great cities kept content.
- **In play:** every faith that leaves the bank counts, as the build plan reads The Book of Life (reading 13): purchases, great-person drafts, contributions, rites, empire rites, rerolls and the gods the ladder buys. So the seat spends rather than hoards, which pulls against The Treasury of Merit. The happiness is empire-wide, so it lets a wide realm grow before it has a religion.
- **Size:** at the first offer the ladder has spent 96 faith on two gods, and a rite or two have cost 40 each, so about +2. About 700 spent by turn 72 gives +7, near two luxuries (4 each). The cap of +15 comes at 1,500 spent, near turn 95, which is close to a Tier II headline in civic life.
- **Model:** the theoric fund of Athens (from the 350s BC, under Eubulus) paid the seats of poorer citizens at the city's festivals. Money spent on the gods kept the city content.

**The Rites of Zhou** (devout realm)
- **Why:** your picture says faith allows greater authority and wider empires. Rites need only Divination, so this gives a wide realm room from Tier I, with no religion.
- **In play:** every town the seat wants to count keeps a rite. A rite lasts ten turns, so the seat renews its rites as a duty: a lapsed rite takes its authority away that turn, and negative authority stops the borders growing. Any rite counts, a prophet's empire rite included.
- **Size:** a founded town costs 3 authority, a coastal one 2 (`meters.authority`). Two or three rite towns at the first offer give +2 or +3, about one more town. Five or six by turn 72 give room for two more. A town in age 3 is worth 40 to 80 yield a turn (power bar). The price is the rites: 40 to 90 faith each for ten turns, that is 4 to 9 faith a town a turn.
- **Model:** the *Zhou li* (the Rites of Zhou), compiled in the 3rd and 2nd centuries BC, describes a state run through its offices of ritual. Confucius taught that ritual held a realm together better than punishment.

**The Serapeum** (spreading faith)
- **Why:** before the religion, the spreading faith's quantity is the gods (themes pass, 4.3). This makes the choice of gods a plan.
- **In play:** the seat picks gods it wants twice. Flats, percentages, combat lines and riders all count twice: Sacred Fire gives +2 faith in every town, God of the Forge +4 strength, Rites of Blood 50 faith a kill, Cult of Heroes +30% renown, The Vigil +20% science and culture in rite towns. A god from The Old Gods Remain counts twice as well. **Reading:** an offer is not doubled, so Keeper of the Calendar still offers one find every ten turns.
- **Size:** two gods at the first offer, for example Sacred Fire (+4 faith in four towns) and The Standing Stones (+1 culture and +1 faith on each Monument, about +8), pay about 12 a turn, so +12 more. With eight towns and three gods by turn 100 the gods pay 30 to 40, so +30 to +40.
- **Model:** in Ptolemaic Egypt (from about 300 BC) Greeks and Egyptians worshipped the same gods under two names, Zeus as Amun and Hermes as Thoth. Ptolemy I's new god Serapis joined Osiris and Apis, and the Serapeum at Alexandria served both peoples. Each god had two congregations.

**The Paean** (holy war)
- **Why:** the holy war's Tier I. Your picture asks for *"playing around the bonuses from your religion"*: here every god and belief is also strength.
- **In play:** it works in every fight, against barbarians too, at home and abroad. It grows with the faith: the ladder's gods, then the founded religion's beliefs, then the enhancers. It sums with The Spiritual Host (+4 in land that follows your religion) and with Joan of Arc's ability.
- **Size:** +2 at the first offer (two gods). +5 or +6 at Tier II (two or three gods and three follower beliefs). +8 to +10 late, and two more with The Seven Councils. The bar is +3 for a regular card at Tier I, +5 at Tier II and +6 at Tier III. A flat line, as your Scientific revision asked: worth most to the early units.
- **Model:** Greek hoplites sang the paean, a hymn to Apollo, as they went into battle. Aeschylus, who fought in the Persian wars, wrote in *The Persians* (472 BC) that the Greek fleet rowed into battle at Salamis (480 BC) singing it.

## 4. Tier II (with the tier-10 governments)

| Doctrine | Theme | Text | Drawback | Shape |
|---|---|---|---|---|
| **The Capitulary of Herstal** | devout realm | Rites cost your devout towns no faith, except rites that act at once. | None. | **New shape, small:** the rite price read for a town. `riteCostFor` (`religion.ts`) takes no town today. It takes the town, and a `CardRule` `riteCost` (`rulePercent` −100, scope devout) applies to a rite with no `atOnce` (the build plan's reading 9 of a season). |
| **The Seven Councils** | spreading faith | Your religion may hold one more follower belief and one more enhancer belief. | None. | Near existing. A slot grant for the religion's two pools, the sibling of `pantheonSlots`. `poolSlots` (`religion.ts`) reads `pools` with no empire; it asks the founder's cards too. |
| **The Patrimony of Peter** | holy places | Your holy city's citizens demand no happiness. | None. | Existing. `rulePercent` `happinessDemand` −100, `scope: { test: 'holyCity' }` (The Rites Commonwealth's scoped form). |
| **The Ribats** | holy war | Your military units cost no upkeep while they stand in land that follows your religion. | None. | Near existing. `upkeepRebate`, `free: true`, `class: { category: 'military' }`, with a new `where` member `followingTerritory` beside `ownTerritory` and `garrison` (the combat condition of that name exists). |

**The Capitulary of Herstal** (devout realm)
- **Why:** the devout realm's Tier II. The themes pass's fantasy: *"Every town keeps its feasts and fasts."* The investment in turning the realm pays back as seasons that cost nothing.
- **In play:** every devout town keeps a season at all times, so every card that reads rites pays everywhere: The Rogations, The Psalter, The Festival Calendar, The Priest-Astronomers, The Rites Commonwealth, The Fast, and The Rites of Zhou. The seat still starts each rite from the rites panel, so there is no new input. The Votive Offering and the Restoring of the Host act at once (`atOnce`), so they still cost faith: the Doctrine cannot hurry a build or heal an army for nothing. A town that is not devout pays as before, so the seat turns its captured towns.
- **Size:** a season costs 56 to 90 faith (age 2 to 4) for ten turns, so 6 to 9 faith a town a turn. Five devout towns at turn 72 save about 30 to 40 faith a turn. Ten at Tier III save 70 to 90.
- **Note:** the themes pass did not take two free-rite Orders (The Holy Year, The Unceasing Prayer) because each needed a new shape on the rite's price for one card (section 8). This Doctrine needs the same shape once, for a bigger payback (question 4).
- **Model:** the Capitulary of Herstal (779). Charlemagne made the tithe a law across the Frankish realm, so the faithful of each parish paid for its services.

**The Seven Councils** (spreading faith)
- **Why:** *"playing around the bonuses from your religion"*. The religion's shape is the spreading faith's Tier II quantity, and this gives it room to grow.
- **In play:** the seat buys one or two more prophets and spends them on beliefs, two charges each. A follower belief pays in every town that follows, so foreign towns that follow gain it too and pay their owners: the seat chooses beliefs that pay its own towns most. Every belief also counts for The Creed and The Paean. **Reading:** a seat that holds two religions (a captured holy city) gains the slots in each.
- **Size:** a follower belief pays about +3 to +5 in a devout town (Cathedrals of the Sky's +2 science and +2 culture on a Temple, Choirs' +1 culture for every four citizens), so +25 to +40 across eight devout towns. An enhancer pays the realm or bends the tide (World Church, Pilgrims' Coin, The Pulse of Bells). The price is a prophet: 120 faith and 60 more for each one before.
- **Model:** the seven ecumenical councils, from Nicaea (325) to the second council of Nicaea (787), each added a creed, canons or doctrines that bound every church of the faith.

**The Patrimony of Peter** (holy places)
- **Why:** the holy city is where the holy places begin (Jerusalem, Mecca, Rome). Your picture: faith *"allows larger population centers to remain happy"*. This makes the holy city the one that can grow without limit.
- **In play:** the seat grows its holy city and works its best land. The town often raises the Opus later (The Last Offering pays there). The holy city is the one a rival most wants: a captured holy city takes the religion with it, so the seat defends it (The Sacred Precincts). Other happiness lines in the town still count. **Reading:** a seat that holds two holy cities gains it in both.
- **Size:** a holy city of 10 citizens at turn 72 gains +10 happiness, 18 citizens at turn 130 gain +18, and 25 late gain +25. About +20 happiness is a Tier II headline in civic life (Commerce's The Forbidden Silks). It needs no cap, because it is one town.
- **Model:** Pope Gregory the Great (590 to 604) ran the Church's estates in Sicily and Italy, the patrimony of Saint Peter, and fed Rome from them through famine and plague.

**The Ribats** (holy war)
- **Why:** the holy war's Tier II. The land that follows your religion feeds the army that defends it.
- **In play:** at peace the army stands in devout towns and costs nothing. In war it costs nothing while it fights in land that follows your religion, so the faith goes ahead of the army (apostles, The Crusader Orders) and the army follows. A unit abroad on other land pays as usual. It works with every source of units. Ships are naval units and are not covered.
- **Size:** upkeep is 1 gold a unit for each age (`upkeep.goldPerUnitAge`). Eight units in age 2 save 16 gold a turn, ten in age 3 save 30, fifteen in age 4 save 60. A median seat makes 47 gold a turn in age 3, so this keeps most of the treasury free for buying.
- **Model:** the ribats of the Maghreb coast, Monastir (796) and Sousse (821): fortified convents where volunteers kept watch on the frontier for their faith, fed by the gifts of the faithful around them.

## 5. Tier III (with the tier-18 governments)

| Doctrine | Theme | Text | Drawback | Shape |
|---|---|---|---|---|
| **The Imarets** | devout realm | Your devout towns grow 25% faster. | None. | Existing. `rulePercent` `growthSurplus` +25, `scope: { test: 'ownersFaith', keeps: true }` (Commerce's proposed The Year and a Day uses the same rule with a scope). |
| **Canossa** | spreading faith | You and an empire whose capital follows your religion cannot declare war on each other. | You cannot declare war on them either. | **New shape:** a refusal in `declareWarError` (`diplomacy.ts`), asked in both directions, and the bots' war planner told of it. |
| **The Canons of the Holy Sepulchre** | holy places | Your holy sites yield as if worked, and need no citizen. | None. | Near existing, and shared with Scientific's proposed The Pandidakterion. A sibling of the rule `garrisonWorks` (The Limitanei, Dominion batch D13): a town's holy-site hexes join its worked hexes after the citizens' hexes, and eat no food. |
| **The Martyr's Crown** | holy war | Each of your units that dies in battle presses your religion on every town within three hexes. | None. | Existing. `windfallRider` on `death`, `grant: { pressure: { amount: 30, range: 3 } }` (the enhancer The Crusade's grant, on `kill`). `payBattleRiders` already pays the `death` moment and hands the presser down, so `pressLump` gains no caller. |

**The Imarets** (devout realm)
- **Why:** your picture: faith allows larger population centres. The devout towns become the realm's great towns.
- **In play:** devout towns outgrow the rest, so the seat turns its captured towns and keeps them turned (The Holy Inquisition). Each citizen counts for the cards that read them: The Deaconries, The Psalter, Choirs, Tithe Houses. Happiness becomes the limit, which The Deaconries, The Patrimony of Peter and The Theoric Fund meet.
- **Size:** ten devout towns with about +6 food each gain +1.5 a turn toward growth. Over thirty turns that is about two more citizens a town, twenty in all, worth about +80 to +100 a turn by turn 165.
- **Model:** the imaret, the public kitchen beside an Ottoman mosque. Orhan's at İznik (1336) fed students, travellers and the poor of the town every day.

**Canossa** (spreading faith)
- **Why:** the spreading faith's Tier III, and faith as a way to win: followers abroad keep the realm safe. The enhancer Theocratic Mandate (*"Rulers who share your faith owe you for it"*) is deferred because there was *"no diplomacy for a mandate to be made of"*. This is a mandate made of the one diplomatic verb that exists, a declaration of war.
- **In play:** the seat turns its neighbours' capitals (apostles, Mission Houses, Pentecost, The Conversion of Kings) to stop wars before they start. A war already running goes on, and peace can be made as usual. A capital that turns away lifts the refusal. The rival can answer with Temples, inquisitors or The Holy Inquisition. **The drawback is the choice:** the seat cannot attack those empires either, so a Dominion pair must choose between turning a neighbour and taking it.
- **Size:** measured in wars. A war lost in age 3 costs a town worth 40 to 80 yield a turn, or more. The refusal stops one before it starts.
- **Model:** Canossa (1077). Emperor Henry IV, excommunicated, waited three days in the snow at the castle of Canossa until Pope Gregory VII lifted the ban. A ruler who shared the faith could not stand against its head.

**The Canons of the Holy Sepulchre** (holy places)
- **Why:** the holy places' Tier III. A holy site costs a citizen to work, and most cards on it pay only while it is worked. This makes every site pay all the time.
- **In play:** the town's citizens work its farms and mines, and every card that reads a worked holy site pays in every holy-site town: The Saints' Fields (+5 food, +8 gold, +2 happiness), The Pilgrim Towns (+20% culture), The Seven Pilgrimages and The Holy Army. More sites come from The Anchorites, The Second Prophet and The Abbeys, which lands at the same tier.
- **Size:** each site frees a citizen worth 5 to 8 yield in age 3 and 4, and turns the "worked" cards on. Four to eight sites give about +40 to +100 a turn.
- **Model:** from 1114 Augustinian canons kept the Church of the Holy Sepulchre at Jerusalem, and said its services day and night, so the shrine never stood empty.

**The Martyr's Crown** (holy war)
- **Why:** the holy war's Tier III. Its dead spread the faith. It also suits your ruling of 2026-10-13 that feeding units to die is a way to play.
- **In play:** losses turn the front to your religion, so the next fight there is on land that follows it: The Spiritual Host, The Ribats and The Turning of Swords then apply. Joan of Arc's kills and the enhancer The Crusade press on a kill, so with them every fight presses. **Reading:** a death against barbarians counts; a unit taken by The Turning of Swords did not die, so it presses nothing (the build plan's reading 30).
- **Size:** measured in towns turned. Each death presses 30, half a proclamation's lump (`rules.religion.bombLump` 60). Ten units lost on one front press 300 on the towns there, enough to turn one or two border towns.
- **Model:** Thomas Becket was killed in Canterbury Cathedral in 1170 and made a saint in 1173. Pilgrims from all over Europe then came to the place of the killing.

## 6. Tier IV (with the tier-26 governments)

| Doctrine | Theme | Text | Drawback | Shape |
|---|---|---|---|---|
| **The Saint Peter's Indulgence** | engine | +1% production toward the Magnum Opus for every 150 faith you have spent this game. | None. | Near existing. `productionBonus`, `category: 'building'`, `building: 'theMagnumOpus'`, `percent: 1`, `count: 'faithSpent'`, `per: 150`, no `max` (The Great Consecration's form; no cap, your ruling of 2026-10-12). The count is The Theoric Fund's. |
| **The House of Worship** | devout realm | Your devout towns may buy the Mosque, the Wat, the Gurdwara and the Dar-e Mehr, whatever beliefs your religion holds. | None. | Near existing. Four `unlocksBuilding` effects. Missing: the faith houses' gate (`followingOnly`, "only in a city that keeps the faith that opened it") also admits a devout town of the empire whose Doctrine opened them. |
| **The Apostolic Camera** | spreading faith | Your follower beliefs also pay you in every foreign town that follows your religion. | None. | **New shape:** each follower belief's town lines, read in a foreign town that follows the holder's religion, paid to the holder too as one empire line. The owner keeps its own pay. |
| **The Two Sanctuaries** | holy places | Holy site yields are doubled. | None. | Existing. `pays`, `where: 'hex'`, `on: { test: 'improvement', improvement: 'holySite' }`, `wholePercent: 100` (The Strategoi's doubled citadels). |

**The Saint Peter's Indulgence** (engine)
- **Why:** your picture: *"faith should feel like a win condition"*. Every faith the seat has spent since the first god now counts toward the Magnum Opus.
- **In play:** the seat raises the Opus and keeps spending faith while it builds: each purchase, rite or reroll raises the percentage. Faith poured into the Opus counts too, so a contribution pays twice: once as hammers, once in the rate. It sums with The Great Consecration, The Work of God and The Last Offering.
- **Size:** about 4,500 faith spent by turn 135 gives +30%. About 8,000 to 10,000 by the Opus race gives +53% to +67%. That is above The Great Consecration's +40%, as a Doctrine held for good should be.
- **Model:** in 1507 Pope Julius II proclaimed an indulgence to pay for the new Saint Peter's in Rome. The gifts of the faithful across Latin Christendom built it over more than a century.

**The House of Worship** (devout realm)
- **Why:** the devout realm's Tier IV, and *"faith converts into everything"* (themes pass, section 2). Four follower beliefs open a faith house each; a seat holds three follower beliefs at most, so it opens one or two houses. This opens all four in every devout town.
- **In play:** the late faith bank becomes buildings in every devout town. The Mosque's authority and the Wat's happiness let the realm stretch further; the Gurdwara feeds and teaches; the Dar-e Mehr raises faith. Each house is still bought once in a town, with faith, and never built. It pairs with The Offered Stones (+2 culture for each building bought with faith).
- **Size:** the four houses: the Mosque (+3 faith, +2 production, +1 authority), the Wat (+3 happiness, +1 faith for every two citizens), the Gurdwara (+3 food, +3 faith, +2 science) and the Dar-e Mehr (+2 faith, +10% faith). Together about +25 to +30 a town. Each costs about 235 faith (medium size, column 5, about 117 hammers at 2 faith a hammer). Ten devout towns with all four pay about +250 to +300 a turn, for about 9,400 faith.
- **Model:** Akbar's Ibadat Khana, the house of worship at Fatehpur Sikri (1575), where the emperor gathered the teachers of every faith in the empire.

**The Apostolic Camera** (spreading faith)
- **Why:** the spreading faith's Tier IV. Today the followers abroad pay their own rulers, with only the founder's small share for you (+1 faith for each foreign town that follows, and +1 gold for every two). This makes them pay you in full.
- **In play:** the seat turns large foreign towns with Temples, because its follower beliefs now pay twice there: to the owner and to the seat. Turning a rival's town still helps the rival, as before. **Reading:** the town lines only, as The Doctors of the Church reads follower beliefs; the hex lines are not paid.
- **Size:** follower beliefs pay about +8 to +12 in a foreign town that follows (Cathedrals of the Sky on its Temple, Choirs and Tithe Houses on its citizens). Ten such towns give +80 to +120 a turn.
- **Model:** the Apostolic Camera, the papal treasury, gathered dues from churches across Latin Christendom. By the fifteenth century the dues of the faithful in every kingdom came to Rome through it.

**The Two Sanctuaries** (holy places)
- **Why:** the holy places' doubler. Doublers are the rarest pay-off, late, and only where the category has many cards (card-design skill, synergy item 7). Four Orders and one enhancer put lines on a holy site's hex.
- **In play:** every card that pays on a holy site's hex is worth twice as much: The Saints' Fields, The Old Holy Places, The Monastic University, The Holy Army, and the enhancer Ecclesia. Cards that pay the town around it (The Pilgrim Towns, The Seven Pilgrimages) are not doubled. The site must be worked to pay, so The Canons of the Holy Sepulchre is its partner.
- **Size:** a holy site pays 2 faith and 1 culture. With two of the cards above it pays about 15 to 20, so it gains as much again. Six to eight sites gain about +90 to +160 a turn.
- **Model:** in 1517 Selim I took Mecca and Medina and the title Servant of the Two Holy Sanctuaries. Each year the Ottomans then sent gifts to both cities and guarded the pilgrims' caravans to them.

## 7. The checks

- **Four a tier, sixteen in all,** and at most one for each home in each tier (section 8).
- **Most change a rule or the way the seat plays.** Ten bend a rule outright: the gods count twice, rites are free in devout towns, the religion holds two more beliefs, the holy city asks no happiness, a war cannot be declared, holy sites are worked with no citizen, deaths press the faith, every faith house opens, beliefs pay abroad, and holy sites pay double. The other six (The Theoric Fund, The Rites of Zhou, The Paean, The Ribats, The Imarets, The Saint Peter's Indulgence) are plain rules on one quantity that steer the seat.
- **One carries a drawback:** Canossa, where the choice between turning a neighbour and taking it is the point. The other fifteen have none, as your comments asked.
- **No Tier I Doctrine waits on the religion.** The Theoric Fund reads faith spent, The Rites of Zhou rites, The Serapeum gods, and The Paean gods and beliefs together.
- **No Doctrine matters only in one age.** Each pays in its own tier and in age 4. The Theoric Fund reaches its cap near turn 95 and keeps it.
- **No Doctrine repeats an Order's job:**
  - The Theoric Fund and The Saint Peter's Indulgence read faith spent, as The Book of Life does. One pays happiness and one pays the Opus; The Book of Life pays science and culture.
  - The Rites of Zhou pays authority for rite towns. The State Church and The Caliphate cut what devout towns cost; no Order reads rites for authority.
  - The Capitulary of Herstal changes a rite's price. The Octave changes its length.
  - The Imarets grows devout towns. The Festival Calendar raises food in rite towns, and The Deaconries keeps devout towns content.
  - The Patrimony of Peter is the only card that reads the holy city for happiness.
  - The Martyr's Crown presses the faith on a death. The Martyrology grows on the same moment, but pays faith and culture.
  - The Two Sanctuaries doubles the hex lines that The Saints' Fields and The Old Holy Places put on a site. It adds no line of its own.
  - The Apostolic Camera pays the follower beliefs abroad. The Living Hymnal pays a flat sum for each following town, and the founder's share pays faith and gold.
- **No Doctrine names a card.** Game objects named: the Magnum Opus, holy sites, the holy city, and the four faith houses.
- **The splits are followed:**
  - authority and happiness: Devotion raises them where faith is paid (rite towns, faith spent) and in devout towns and the holy city. No Doctrine reads public works or empire buildings (Expansionist's);
  - flexibility in how it wins: the Opus by faith spent, peace by Canossa, and the faith houses' varied yields;
  - great-person works: holy sites only;
  - wonders: only the Magnum Opus, which Devotion's Orders already reach, with no cap (your ruling of 2026-10-12). No Doctrine pays for holding a wonder (Magisterial's);
  - elite units: no ranks or experience (Dominion's);
  - the government system and drafts: no Doctrine changes chairs, offers or rerolls (Magisterial's).
- **No new player input.** Every Doctrine is automatic, or works through starting a rite, buying with faith, a prophet's act or a declaration of war. Canossa removes a declaration in some cases; it adds nothing.
- **Faith stays a minority.** No Doctrine pays faith directly. One saves faith (The Capitulary of Herstal). Some faith houses pay faith, bought with faith.
- **Production stays the gap.** Production comes only toward the Opus (The Saint Peter's Indulgence) and from the Mosque, which is bought with faith.
- **Areas, five of five:** the army (The Paean, The Ribats, The Martyr's Crown, Canossa), the land (holy sites: The Canons of the Holy Sepulchre, The Two Sanctuaries), the economy (The Imarets, The Ribats' gold, The House of Worship), civic life (The Theoric Fund, The Rites of Zhou, The Patrimony of Peter, The Capitulary of Herstal, The Seven Councils), and great people and wonders (holy sites as the prophet's work, and the Opus).
- **Every era fits its tier:** Tier I classical (480 BC to the 2nd century BC), Tier II late antique and early medieval (325 to 821), Tier III medieval (1077 to 1336), Tier IV early modern (1507 to 1575, and the fifteenth-century Camera).
- **Where it falls short:**
  - The engine has only two Doctrines. The Orders already cover what faith buys.
  - Eleven of the twelve Doctrines of Tiers II to IV need a religion the seat holds. A seat that lost the race to found is offered dead Doctrines (question 3).
  - The Martyr's Crown pays only in war, and Canossa only once a rival's capital follows you.
  - Eleven Doctrines need a new or near shape (section 9). Five are data only. Two of the near ones use the faith-spent record and one uses the widened `beliefsHeld`, so those three wait on batch DV3.
  - Every number is a guess. The bots say few rites and found religions late, so the rite and religion Doctrines are hard to measure until they do.

## 8. Counts

| Tier | Engine | Devout realm | Holy places | Spreading faith | Holy war | All |
|---|---|---|---|---|---|---|
| I | 1 | 1 | 0 | 1 | 1 | 4 |
| II | 0 | 1 | 1 | 1 | 1 | 4 |
| III | 0 | 1 | 1 | 1 | 1 | 4 |
| IV | 1 | 1 | 1 | 1 | 0 | 4 |
| **All** | **2** | **4** | **3** | **4** | **3** | **16** |

| | Data only (existing shapes) | Near existing | New shape |
|---|---|---|---|
| Doctrines | 5: The Rites of Zhou, The Patrimony of Peter, The Imarets, The Martyr's Crown, The Two Sanctuaries | 7: The Theoric Fund, The Paean, The Seven Councils, The Ribats, The Canons of the Holy Sepulchre, The Saint Peter's Indulgence, The House of Worship | 4: The Serapeum, The Capitulary of Herstal, Canossa, The Apostolic Camera |

## 9. The new shapes, grouped

Checked against the code at commit `81670e11`. Each family is read by more than one card where possible.

1. **The faith-spent record** (The Theoric Fund, The Saint Peter's Indulgence). The Devotion build makes it for The Book of Life (DV3): `Player.faithSpent`, raised by one seam (`spendFaith`) at the seven places faith leaves the bank, and a `CountKind` `faithSpent`. These two Doctrines only read it. Three cards on one record is the shared quantity the card-design skill asks for.
2. **The religion's own limits:**
   - the gods read twice (The Serapeum): a meta rule, the sibling of `techCountsTwice`, read in `liveEffects`' fourth source, which pushes each god's effects. An offer is not doubled;
   - the religion's two belief pools widened by the founder's cards (The Seven Councils): `poolSlots` asks the founder's cards, the sibling of `pantheonSlots`.
3. **The rite price, read for a town** (The Capitulary of Herstal). `riteCostFor(state, playerId)` takes the town, and a `CardRule` `riteCost` with a scope applies to a rite with no `atOnce`. The rites panel, the refusal and the charge read the one figure, as they do today.
4. **A work worked with no citizen** (The Canons of the Holy Sepulchre). The sibling of `garrisonWorks`: a town's holy-site hexes join its worked hexes after the citizens' hexes, and eat no food. Scientific's proposed The Pandidakterion needs the same shape for Academies, so one rule with an improvement field serves both.
5. **Land that follows your religion, read for the army:**
   - `upkeepRebate` gains `where: 'followingTerritory'` (The Ribats), read as the combat condition of the same name;
   - `CombatScaleCount` gains `beliefsHeld` (The Paean), read as the `CountKind` that The Creed's rework widens (DV3).
6. **The faith houses' gate** (The House of Worship). Four `unlocksBuilding` effects exist as a kind. The gate behind `followingOnly` must admit a devout town of the empire whose Doctrine opened the house.
7. **A refused declaration of war** (Canossa). One clause in `declareWarError`, asked in both directions, using `cityReligion` of the other empire's capital and the religions the holder is paid by (`heldReligions`). The bots must not plan a war the clause refuses.
8. **Follower beliefs paid abroad** (The Apostolic Camera). Each foreign town that follows a religion the holder is paid by: its follower beliefs' town lines, read with that town's facts, paid to the holder as one labelled empire line. The owner's own fold does not change. Rule 5 holds because the line is one entry in the holder's list.

**For less engine work, cut** The Apostolic Camera, then Canossa, then The Serapeum. Each is the largest change in its family.

## 10. Facts the cells rely on

Checked at commit `81670e11`.

- **A Doctrine row** lives in the deck file's `doctrines` map with `decks`, `band` (1 to 4), `text` and `effects` (`data/decks/dominion.json`). `data/decks/devotion.json` has no `doctrines` map today. Its effects are live from the turn it is taken (`liveEffects`' second source).
- **Rites** (`data/religion.json`): a rite costs 40, 56, 72 or 90 faith by age (`rite.costByAge`) and lasts ten turns, except the Votive Offering (one turn) and the Restoring of the Host (five), which carry `atOnce`. `riteCostFor` (`religion.ts`) asks the empire and its age, never a town. The build plan's reading 9: a season is a rite with no `atOnce`.
- **Authority** (`data/rules.json`, `meters.authority`): the palace gives 6, and each age 2 more; a founded town costs 3, a coastal one 2, a captured one 4. `authority` with `per: 'city'` and a scope is live (The Provincial Chancery).
- **Happiness:** each citizen demands 1 (`meters.happiness.demandPerPop`); a luxury kind gives 4. `rulePercent` `happinessDemand` with a scope is live (The Rites Commonwealth). The `holyCity` scope admits the town that holds the holy site of a religion the empire is paid by.
- **The gods:** the ladder buys them by itself when the bank covers the next rung (96 faith for the first two). Divination opens two slots and The High Temple one. `liveEffects`' fourth source pushes each god's effects once.
- **Beliefs:** a religion holds three follower beliefs and two enhancers (`religion.pools`), read by `poolSlots` with no empire. A prophet costs 120 faith and 60 more for each one before, with two charges; a belief costs both. Follower beliefs pay each following town's owner. `cardYieldAmplifier` `reads: 'followerBeliefs'` reads their town lines only. `beliefsHeld` counts nothing before a religion is held; DV3 widens it (the build plan's reading 16).
- **Holy sites:** a holy site yields 2 faith and 1 culture (`data/improvements.json`). `wholePercent` doubles a hex's whole fold, the lines other cards put on it included (`docs/yields.md`, step 8).
- **Upkeep:** 1 gold a unit for each age (`upkeep.goldPerUnitAge`). `upkeepRebate` takes `where`: `ownTerritory`, `foreignTerritory` or `garrison`. Military units are `category: 'military'`; ships are `naval`.
- **Combat scales** (`CombatScaleCount`): cities, adjacentFriendlies, greatPeopleOfFamily, slottedOrdersOfSlot, capitalGreatWorks, uniqueLuxuries, bankedGold, attacksOnTarget, townCitizensHere, charterTechsKnown, techLead. No `beliefsHeld`.
- **Pressure on a battle moment:** `payBattleRiders` (`combat.ts`) pays `kill`, `death` and `capture`, and hands a presser down to `payWindfallGrants`. The enhancer The Crusade presses 20 within three hexes on a kill. A proclamation's lump is 60 (`rules.religion.bombLump`).
- **The faith houses:** the Mosque, the Wat, the Gurdwara and the Dar-e Mehr are medium, column 5, `purchaseOnly` with faith, `followingOnly`, and `unlockedByCard`. A follower belief opens each one (`unlocksBuilding`).
- **Growth:** `rulePercent` `growthSurplus` with a scope is read per town (`cardRulePercent` with a city).
- **War:** `declareWarError` (`diplomacy.ts`) refuses a declaration on self, the wild, a gone empire, a war already running, and a truce. `cityReligion` (`state.ts`) derives a town's religion.
- **The Opus:** `productionBonus` toward `theMagnumOpus` with a `count` and `per` is live (The Great Consecration).
- **The bots** price every card by its effects (`src/ai/value.ts`, an exhaustive switch), and `score` has no Devotion group yet (build plan, DV9). Each new shape needs a price there before the bots take the Doctrine.

## 11. Questions for the user

1. **Canossa refuses a declaration of war** between you and an empire whose capital follows your religion, in both directions. It is the largest rule change here, and the bots must learn it. *Recommended: yes, as written.* The drawback (you cannot attack them either) is the choice the Doctrine is about. If you want it to be a gift with no cost, it can refuse only their declaration.
2. **The Apostolic Camera's new shape** pays you your follower beliefs in foreign towns that follow you. *Recommended: yes,* because it is the spreading faith's payback for the long game. If it is too much engine work, cut it; the spreading faith keeps three Doctrines.
3. **A "Needs a religion" gate on the Doctrine offer.** Eleven Doctrines of Tiers II to IV pay nothing to a seat that holds no religion. *Recommended: yes,* the same gate the Expansionist proposals asked for ("Needs a levy", "Needs tended land"), so a seat that lost the race is offered its partner's Doctrines in their place. A captured holy city counts as holding a religion.
4. **The Capitulary of Herstal makes seasons free in devout towns.** The themes pass declined two free-rite Orders for needing a new shape for one card. *Recommended: yes,* because it is the devout realm's payback and the shape serves one Doctrine at full value. The smaller version is half price.
5. **The faith-spent record** serves three cards: The Book of Life, The Theoric Fund and The Saint Peter's Indulgence. *Recommended:* count every faith that leaves the bank, as the build plan reads it (reading 13).
6. **The House of Worship opens all four faith houses** in every devout town, so the follower beliefs that open them matter less to a seat that takes it. *Recommended: yes,* because it is Tier IV and the houses are bought with the late faith bank.
7. **One drawback in sixteen.** *Recommended: as written,* following your comments on Expansionist and Scientific.
8. **What comes next.** *Recommended:* after your pass, the Doctrines go into the four Doctrine tables DV1 adds to the Devotion sheet, then a triage sorts them into data-only and new-shape batches after DV9, as the build plan says.
