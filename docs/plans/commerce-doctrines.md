# Commerce Doctrines (proposal)

**Status:** proposal, 2026-10-23. Nothing is built. No code, data or deck sheet changed. This is stage 6 of the deck pass (the card-design skill, "Doctrines") for Commerce. The build plan (`docs/plans/commerce-themes-triage.md`, "Doctrines") gives the sheet four empty Doctrine tables in batch T1 and leaves the design to this pass.

The user's request, 2026-10-23, verbatim: *"could you assign a subagent to create doctrines for commerce and scientific, update the doc when done."* The Scientific Doctrines are in `docs/plans/scientific-doctrines.md`.

## 1. How to read this

- **One section a tier,** Tiers I to IV. Each starts with a table: Doctrine | Theme | Text | Drawback | Shape. Notes on each Doctrine follow the table: why it is here, what it changes in play, its size against the power bar, and its historical model.
- **Theme:** the engine (gold and what it buys), or one of the four themes of `docs/plans/commerce-themes.md`: the home market, the far trade, the goods and the bankers.
- **Shape:**
  - *existing:* the effect kinds and fields that already say it, with the live row that uses the same form;
  - *near existing:* one small field or member on a shape that exists;
  - *new shape:* what is missing. Section 9 groups the new shapes.
- **Numbers are first guesses.** The effort went into what each Doctrine does.
- **Plain text, no card names.** No Doctrine names an Order or another Doctrine (principle 8). A Doctrine may name a game object: a building, the Magnum Opus, a trading post.
- **The deck's current text is the build plan's.** Section 13 of the themes pass and the triage's readings outrank sections 2 to 12, so this file uses the card names and texts in the triage's tier tables (for example The Grain Banks, not The Agora).

**When each tier is offered, and the bar it is sized against** (`.claude/skills/card-design/references/power-bar.md`; the turns are the bot model):

| Doctrine tier | Offered with | First offer, about | The age then | A regular card pays | A headline card pays |
|---|---|---|---|---|---|
| I | tier-4 governments | turn 32 | late age 1, age 2 | 15 to 25 a turn | 40 to 50 |
| II | tier-10 governments | turn 72 | late age 2, age 3 | 35 to 60 | 100 or more |
| III | tier-18 governments | turn 133 | late age 3, age 4 | 60 to 120 | 200 or more |
| IV | tier-26 governments | turn 161 | age 4 | 60 to 120 | 200 or more |

A Doctrine is held all game and takes no chair. So a Doctrine with a real drawback aims near the headline of its tier, and one with no drawback aims at the regular card.

## 2. How the Doctrines fit the deck

**The deck in one line** (`docs/decks/deck-design.md`, "Direction, 2026-10-20"): Commerce is paid for connections (routes, posts, deals), is strongest steadily and more as the world connects, and gives up production and needs partners at peace. It is the most flexible deck: it buys what it needs.

**What a Commerce Doctrine does.** Each one turns a part of that identity into a rule the seat lives with for the whole game:

- **The engine (2):** gold buys the seat's colonists (The Apoikia) and, at the end, its Magnum Opus (The Opera del Duomo).
- **The home market (3):** the realm's own towns become one market. Food moves along the routes (The Grand Canal), the towns on the network grow and the others shrink (The Year and a Day), and the seat may close its ports to trade at home only (The Sea Ban).
- **The far trade (4):** the seat chooses its partners and keeps the peace. Coastal towns are cheap to hold (The Delian League), posts take root fast (The Sogdian Colonies), every partner opens a route (The Muda), and peace pays (The Peace of Lodi).
- **The goods (3):** claim, hold and count the goods. Resource hexes are cheap (The Laurion Leases), luxuries kept at home give double happiness (The Forbidden Silks), and strategic resources count as luxuries (The Tea and Horse Agency).
- **The bankers (4):** keep or spend. The coin is worth less and there is more of it (The Debased Denarius), only towns with a counting house may buy (The Flying Money), gold lent to rulers comes back twice over (The Bardi Company), and the hoard keeps the people content (The Monte di Pietà).

**The user's rulings this pass keeps:**
- **No route before Tier II** (section 13 of the themes pass, section 12's question 1: *"yes"*). The four Tier I Doctrines pay before Currency: none needs a trade route or a trading post.
- **War ends trade** (*"remove safe conduct (your trade can just get pillaged)"*). No Doctrine keeps a route, a post or a deal alive in war. The Peace of Lodi pays more at peace and less at war, and The Bardi Company's loan is lost in a war.
- **No unit-buying limits** (Bought Swords: *"remove, not that helpful, especially in age 1"*). No Doctrine changes how many units a town may buy in a turn.
- **Gold is strong** (playtest, 2026-09-03: *"gold is way too strong"*). One Doctrine raises gold income (The Debased Denarius), and it raises every price by as much.

**The cost shows.** Thirteen of the sixteen carry a stated drawback, and most are the deck's own cost: slow building, dear purchases, towns that cannot buy, a lost loan in war, a slower Opus, or a closed border.

**What a pair seat gets.** Adopting a government offers Doctrines of its tier: one from each of the seat's two decks, then a third from either (`drawDoctrineOffer`). A deck with no Doctrine left in the tier gives its place to the rest of the bag. Today only Dominion has Doctrines, so a Commerce seat with any other partner is offered none (the triage, "Doctrines"). With 4 a tier, a Commerce seat sees one or two Commerce Doctrines at each adoption.

| Partner | Its Doctrines today | What the pair gets |
|---|---|---|
| Dominion | 15 live | Merchants and their guards. The Marian Reforms leaves buying unaffected, so a pair seat buys its army: The Flying Money makes that cheaper and The Debased Denarius dearer. The Peace of Lodi and The Bardi Company pull against Dominion's wars, which is the pair's tension. |
| Expansionist | none built; 32 proposed, 24 after your comments of 2026-10-23 (`docs/plans/expansionist-builds.md`) | The land and the market. The Apoikia buys the settlers a wide realm needs. The Grand Canal's new shape (food moved between towns) was shared with the proposed The Annona, which your comments of 2026-10-23 cut, and The Sea Ban shares one with the proposed The Inward Roads (a refused foreign route). The Laurion Leases slows the borders Expansionist grows. |
| Scientific | none built; 16 proposed (`docs/plans/scientific-doctrines.md`) | The patrons. The Grand Canal feeds the great cities that The Universitas and The Two Capitals pay. The Apoikia halves the price of a bought settler and The Removal to Xianyang doubles it: those two cancel, which is intended. |
| Devotion | being written now | Pilgrims and markets. The Forbidden Silks and The Monte di Pietà give happiness, which Devotion also raises in its own towns. |
| Magisterial | being written now | The art market. The Opera del Duomo pours gold into the Magnum Opus, the race Magisterial's wonder cards also join. |

## 3. Tier I (with the tier-4 governments)

| Doctrine | Theme | Text | Drawback | Shape |
|---|---|---|---|---|
| **The Apoikia** | engine | Settlers and workers cost half as much gold to buy. Your towns build them at half speed. | Building settlers and workers is slow. | Existing. `purchaseRider`, `class: { modelClasses: ['settler', 'worker'] }`, `on: 'unit'`, −50; `productionBonus` unit with the same class, −50, `stage: 'empire'` (The Marian Reforms' form). |
| **The Laurion Leases** | goods | Hexes with a resource cost half as much gold to buy. Your borders grow half as fast. | Borders grow slowly. | Near existing. `rulePercent` `borderCulture` −50 exists. **New, small:** a hex test on the `tilePurchase` rule (`tile: { test: 'hasResource' }`), asked of the hex `explainTilePurchase` prices. |
| **The Debased Denarius** | bankers | Your towns gain +50% gold. Units, buildings, caravans and hexes cost 50% more gold. | Everything you buy costs half again. | Existing. `percentYields` gold +50; `purchaseRider`, `class: {}`, `on: 'all'`, +50 (Foreign Procurement's form); `rulePercent` `tilePurchase` +50. |
| **The Delian League** | far trade | Your coastal towns cost 1 less authority. Your other towns cost 1 more. | Inland towns cost more. | Near existing. `meterRule` `coastalCityCost` `delta: −1`. **New, small:** a negated scope `notCoastal` (as `notFreshwater` is) for `meterRule` `cityCost` `delta: 1`. |

**The Apoikia** (engine)
- **Why:** the user asked for early Commerce cards that help a seat settle (section 11 of the themes pass). The deck's verb is buying, so this lets gold found the towns.
- **In play:** the seat buys its settlers and workers and keeps its towns' production for Markets and Granaries. Building them is so slow that a seat with little gold should not take it. The settler ladder still raises each price.
- **Size:** a settler is 28 hammers, 112 gold, so 56 before the ladder. With 10 to 20 gold a turn at turn 40, the seat buys a settler every three to five turns. That is a band 1 headline for a seat that settles.
- **Model:** a Greek *apoikia* (8th to 6th century BC) was a colony that its mother city paid for, armed and sent out by sea.

**The Laurion Leases** (goods)
- **Why:** Commerce claims the goods the world wants (the user's picture). This makes the claim a purchase, not a wait for the borders.
- **In play:** the seat buys the hexes with luxuries, metal and stone, and its borders grow half as fast elsewhere. The land follows the money. A Land Speculation seat gets half as much culture a hex, because that card pays half the price paid.
- **Size:** an early hex costs about 50 gold, so 25, and each later hex costs more (the purchase ladder). The slower borders cost a seat of five towns about one free hex every few turns.
- **Model:** Athens leased its silver mines at Laurion to private operators (5th century BC). The city sold the right to dig, not the land.

**The Debased Denarius** (bankers)
- **Why:** the bankers pay for gold kept, and the engine for gold spent. This splits them on purpose: a seat that keeps its hoard gains, and a seat that buys pays for it.
- **In play:** every coin is worth less and the treasury fills faster. Upkeep, deals and the hoard's cards (The Nest Egg, Bills of Exchange, Money at Work, The Money Lenders) all gain. Purchases cost as much as before in real terms, or more.
- **Size:** about +10 gold a turn at turn 40 and +200 at turn 160, against prices half again as high.
- **Model:** Nero cut the silver in the denarius in AD 64. There were more coins, and prices rose to meet them.

**The Delian League** (far trade)
- **Why:** sea routes pay half again (`trade.seaYieldPercent`), and the far trade by sea is Zheng He's. This shapes the realm for the sea from the first government, before the first caravan.
- **In play:** the seat settles the coast and pays for every town inland. Authority is not Expansionist's alone (ruled 2026-10-07); Commerce's other authority cards read Markets and routes, and this one reads the coast.
- **Size:** a founded town costs 3 authority, a coastal one 2 (`meters.authority`). Four coastal towns and two inland ones gain 2 points of room: about one more town.
- **Model:** the Delian League (478 BC), the league of coastal and island cities that Athens led by sea.

## 4. Tier II (with the tier-10 governments)

| Doctrine | Theme | Text | Drawback | Shape |
|---|---|---|---|---|
| **The Grand Canal** | home market | Each of your domestic routes carries half of its origin's surplus food to its destination. | The origin loses that food. | **New shape:** food moved along a route, as a labelled line in both towns' folds. Expansionist's proposed The Annona and The Royal Works needed the same family; your comments of 2026-10-23 cut both. |
| **The Sogdian Colonies** | far trade | Your trading posts are established after ten turns, not twenty. | None. | Near existing. **New, small:** a `CardRule` `postTerm` for `rulePercent` (−50), `routeTerm`'s sibling, read by `postTermTurns()`. |
| **The Forbidden Silks** | goods | Your luxuries give twice their happiness. You cannot lend luxuries in deals. | No luxury may be lent. | Near existing. `effectAmplifier` `luxuryHappiness` +100 exists. **New, small:** a flag rule that refuses a deal in which you lend a luxury (`proposeDealError`). |
| **The Flying Money** | bankers | Your towns with a gold building buy units and buildings 20% cheaper. Your other towns cannot buy them. | Towns without a gold building cannot buy. | Near existing. `purchaseRider` on `unit` and on `building`, −20, scope `{ test: 'buildingsOfCategory', category: 'gold', atLeast: 1 }`. **New, small:** `purchaseError` refuses a purchase in a town the rule's scope does not admit. |

**The Grand Canal** (home market)
- **Why:** the home market's fantasy is the barges on the Grand Canal (themes pass, 4.1). This lets the network feed one great market town at the cost of the others.
- **In play:** the seat sends its farm towns' caravans to the town it wants big: the capital, a Chartered Metropolis town, a Home Market town. The farm towns stop growing. It differs from The Grain Barges, which pays the destination with nothing taken from the origin: this one moves food, and a Grain Barges seat holding both feeds its market town twice.
- **Size:** a farm town with +8 surplus sends +4. Four routes into one town give it +16 food.
- **Model:** the Sui Grand Canal (609) carried the grain of the south to the capitals and armies of the north.

**The Sogdian Colonies** (far trade)
- **Why:** the user's picture: *"establishing trading posts, setting the seeds for commerce and seeing the effects of this expand throughout the ages."* This makes the seeds take root in half the time.
- **In play:** every post card pays ten turns sooner: The Factors' Houses, The Hanse, The Foreign Factor, The Fondaci and The Capitulations. A route still needs ten unbroken turns, so a war or a plundered caravan still costs the post. It has no drawback: it is a supply Doctrine for the posts.
- **Size:** at Tier II the seat plants four to eight posts; each pays from ten turns earlier.
- **Model:** Sogdian merchants (4th to 8th century) kept colonies in every town of the Silk Road, from Samarkand to Chang'an.

**The Forbidden Silks** (goods)
- **Why:** the goods theme asks the seat to choose, at each offered swap, whether to hold or to trade (themes pass, 4.3). This makes the choice for the whole game: hold.
- **In play:** every luxury kind is worth twice its happiness, which lets a wide realm grow. The table closes for luxuries, so Export Guilds and The Commenda pay nothing. Deals of tribute and open borders stay open, and The Treaty Ports still counts them.
- **Size:** a luxury kind gives 4 happiness (`perUniqueLuxury`), so +4 more a kind. Five kinds give +20 happiness, a band 2 headline in civic life.
- **Model:** Byzantine law kept the finest purple silks, the *kekolymena*, in the empire. In 968 the customs at Constantinople took them from the envoy Liutprand of Cremona as he left.

**The Flying Money** (bankers)
- **Why:** the bankers own the gold buildings. This makes them the only place gold can be spent.
- **In play:** the seat raises a Market in every town that will buy, and pays less there. A town with no gold building can still build, but cannot buy. Hexes and caravans are not units or buildings, so they stay open everywhere.
- **Size:** a Tier II building costs 300 to 600 gold, so each purchase saves 60 to 120.
- **Model:** Tang merchants (about 806) paid coin into a capital office and drew it out at an office in the provinces. The money could be drawn only where an office stood.

## 5. Tier III (with the tier-18 governments)

| Doctrine | Theme | Text | Drawback | Shape |
|---|---|---|---|---|
| **The Year and a Day** | home market | Your towns that a domestic route reaches grow 25% faster. Your other towns grow 25% more slowly. | Towns off the network grow slowly. | Existing. `rulePercent` `growthSurplus` +25, scope `{ test: 'routeEndsHere', crossing: 'domestic', direction: 'arriving' }`; −25 with the same scope and `atMost: 0`. |
| **The Muda** | far trade | +1 trade route for each empire your routes reach. Your domestic routes pay 25% less. | Home routes pay less. | Existing. `routeRider`, `count: 'tradePartnerEmpires'`, `extra: 1`; `pays`, `where: 'route'`, `crossing: 'domestic'`, `share` all −25 (a negative share, to check in the triage). |
| **The Bardi Company** | bankers | Gold you give another empire in a deal is a loan. When the deal ends, that empire pays it back twice over. A war between you cancels the loan. | A war loses the loan. | **New shape:** a loan on a deal. |
| **The Tea and Horse Agency** | goods | Your strategic resources also count as luxuries. | None. | **New shape:** the luxury readings also count strategic kinds and copies, for the holder. |

**The Year and a Day** (home market)
- **Why:** the user's picture: *"gain passive bonuses from wealth as populations grow and the world becomes more connected."* This makes the network itself the reason a town grows.
- **In play:** the seat sends a caravan into every town it wants to grow. A town no caravan reaches falls behind the others. So the home market runs to every town, not only the best pairs.
- **Size:** in age 3 to 4, +25% growth in six to eight towns adds one or two citizens a town over twenty turns.
- **Model:** German town law (12th and 13th centuries): a serf who lived in a town for a year and a day became free, so people moved into the market towns.

**The Muda** (far trade)
- **Why:** the far trade's quantity is partners. This makes each partner a route slot, so the network grows with the world.
- **In play:** the seat meets and courts every empire it can, because each new partner opens a route. Its domestic routes pay less, so it looks outward. It pulls against The Sea Ban, which is the point.
- **Size:** four partners open four routes. A foreign route pays the sender about 10 to 15 a turn with the Tier II cards, so +40 to +60, against a quarter off the home routes.
- **Model:** the Venetian *muda* (14th century): convoys of state galleys sent each year to every partner port, from Alexandria to Flanders.

**The Bardi Company** (bankers)
- **Why:** Commerce is *"the faction most interested in trade deals/diplomacy"* (the user's picture), and the bankers lend to kings. This makes a gift of gold a loan.
- **In play:** the seat lends its hoard to its neighbours through the deals screen it already has. A neighbour in debt to it has a reason to stay at peace, and the seat has a reason never to declare war on its debtors. A war cancels the loan, so the deck's cost (it needs partners at peace) is the risk.
- **Size:** 500 gold lent comes back as 1,000 twenty turns later, about 3.5% a turn compounded. The Money Lenders pays 4% a turn with no risk, but it takes a chair.
- **Model:** the Bardi and Peruzzi banks of Florence lent to Edward III of England. His default in the 1340s broke them both.

**The Tea and Horse Agency** (goods)
- **Why:** the goods theme counts kinds and copies. This adds the map's horses, iron and copper to the count, and bridges the goods to the army (Strategic Exports, Numidian Cavalry).
- **In play:** each strategic kind gives a luxury's happiness and counts for every luxury card: Salt Tithes, The Staple Right, The Spice Exchange, The Monopoly, Corner the Market. Strategic resources are never lent in deals, and they still arm the units as before. It has no drawback: it is a supply Doctrine for the goods.
- **Size:** three strategic kinds give +12 happiness, and with two copies each, +9 gold and +6 culture from The Staple Right alone.
- **Model:** the Song Tea and Horse Agency (1074) traded Sichuan tea to Tibet for the horses the army needed.

## 6. Tier IV (with the tier-26 governments)

| Doctrine | Theme | Text | Drawback | Shape |
|---|---|---|---|---|
| **The Sea Ban** | home market | Your domestic routes pay twice as much. You cannot send trade routes to other empires. | No foreign routes. | Near existing. `pays`, `where: 'route'`, `crossing: 'domestic'`, `share` all +100 exists. **New, small:** `routeStartable` refuses a foreign destination. Expansionist's proposed The Inward Roads needs the same refusal. |
| **The Peace of Lodi** | far trade | While you are at peace, your trade routes pay 50% more. While you are at war, they pay 25% less. | War costs a quarter of the routes' pay. | Existing. `conditionRule` `atPeace` with `pays` `where: 'route'`, `share` all +50; `conditionRule` `atWar` with `share` all −25. |
| **The Opera del Duomo** | engine | Gold you pour into the Magnum Opus buys twice as many hammers. Your towns build the Magnum Opus 25% more slowly. | The Opus town builds slower. | Near existing. **New, small:** a `CardRule` `goldContribution`, `faithContribution`'s sibling in `contributionRate`. Existing: `productionBonus` building `theMagnumOpus` −25 (The Great Catalogue's form). |
| **The Monte di Pietà** | bankers | Every 200 gold in your treasury gives +1 happiness, at most +20. Your towns make 10% less gold. | Gold income falls by a tenth. | Existing. `pays`, `where: 'empire'`, `basis: 'count'`, `count: 'bankedGold'`, `per: 200`, `to: 'happiness'`, `amount: 1`, `max: 20` (The Money Lenders' count); `percentYields` gold −10. |

**The Sea Ban** (home market)
- **Why:** a war switches off the far trade, and the home market keeps running (themes pass, "Its cost"). This makes the turn inward a whole policy: a realm that trades only with itself.
- **In play:** the seat stops sending caravans abroad and doubles its home routes. Every home-route card gains: Provisioning Contracts, The Return Leg, The Grain Barges, The Champagne Fairs. Routes already running abroad run out their term. It suits a seat at war with its neighbours, or one whose partners are far.
- **Size:** ten home routes paying 10 to 20 each double to about +100 to +200 a turn, against the foreign routes given up.
- **Model:** the Ming *haijin* (1371 to 1567) banned private sea trade abroad, while the Grand Canal carried the empire's trade at home.

**The Peace of Lodi** (far trade)
- **Why:** the deck needs partners at peace. This makes peace its late multiplier, and war its price.
- **In play:** the seat keeps the peace with everyone, buys its way out of wars, and sends no army abroad. Barbarians do not count: a seat that clears camps is still at peace (`atPeace`). A war does not end the domestic routes, but it cuts their pay.
- **Size:** fifteen routes paying about 15 each gain about +110 a turn at peace, a band 4 headline.
- **Model:** the Peace of Lodi (1454) ended the wars of the Italian states, and forty years of trade followed.

**The Opera del Duomo** (engine)
- **Why:** gold buys anything, and in the last age the thing to buy is the win. Gold may already be poured into the Magnum Opus at 4 gold a hammer (`contribute`); this halves the price.
- **In play:** the seat builds the Opus with its treasury, not its towns, so the hoard the bankers kept becomes the win. The Opus town builds it slowly, so a seat with no gold should not take it. It differs from The Merchant Works, which turns a town's own gold into production every turn: this one is the seat's choice of when to pour.
- **Size:** a hoard of 6,000 gold buys 3,000 hammers of the Opus instead of 1,500.
- **Model:** the works office of Florence Cathedral, paid for by the wool guild, which raised Brunelleschi's dome (1420 to 1436).

**The Monte di Pietà** (bankers)
- **Why:** the bankers keep gold. This makes the hoard a public good: a city with a full treasury is a calm one.
- **In play:** the seat keeps a hoard for its people as well as for its cards. Happiness lets a wide Commerce realm keep growing late. A treasury below zero counts as nothing (`bankedGold`).
- **Size:** 4,000 gold gives the full +20 happiness. A tenth off about 400 gold a turn is −40.
- **Model:** the *monti di pietà* (Perugia, 1462): public pawnbanks that lent to the poor at low interest to keep the city at peace.

## 7. The checks

- **Four a tier, sixteen in all.** Each tier has four Doctrines.
- **Most change a rule or the way the seat plays.** Ten bend a rule outright: a hex price by its resource, a town's authority by its coast, food moved along a route, a post's term, a refused luxury loan, a refused purchase, a deal that is a loan, strategic resources counted as luxuries, a refused foreign route, and a cheaper gold contribution. The rest change a price, a rate or a pay with a cost that steers the seat.
- **Most carry a drawback:** thirteen of sixteen state one. The Bardi Company carries a risk (war). The Sogdian Colonies and The Tea and Horse Agency have none; both are supply Doctrines.
- **Each theme and the engine get at least two:** engine 2, home market 3, far trade 4, goods 3, bankers 4 (section 8).
- **No Tier I Doctrine needs a route.** The Apoikia, The Laurion Leases, The Debased Denarius and The Delian League all pay before Currency.
- **No Doctrine repeats an Order's job:**
  - The Debased Denarius raises gold as Private Patronage does, but its cost is the price of buying, where Private Patronage's is the speed of building. One pushes the seat to keep gold, the other to spend it.
  - The Laurion Leases and Land Speculation both read a bought hex with a resource: one changes its price, the other pays culture for it.
  - The Grand Canal moves food along home routes; The Grain Barges and Provisioning Contracts pay the destination and take nothing from the origin.
  - The Muda opens routes by partners; The Great Fair, The Merchant Guilds and The Trade Winds open them by other counts.
  - The Opera del Duomo halves the gold price of a contribution; The Merchant Works turns a town's gold into production on its own.
  - The Monte di Pietà is the only card that reads the hoard for happiness.
- **No Doctrine names a card.** Two name game objects: the Magnum Opus and the gold buildings.
- **The splits are followed.** Roads and joined towns are Expansionist's: no Doctrine reads a road. Great-person works: none. Wonders: The Opera del Duomo pours gold into the Opus, which the game already allows; no Doctrine pays for holding a wonder.
- **No new player input.** Every Doctrine is automatic or uses buying, sending a route, the deals screen or the contribute button. The Bardi Company changes what a gift of gold means, not how it is given.
- **Gold stays a minority.** One Doctrine raises gold income, and it raises prices as much. Four lower a gold price, one cuts gold income, and the rest pay food, growth, happiness, authority, routes or route pay.
- **Every era fits its tier:** Tier I classical (8th century BC to AD 64), Tier II late antique and early medieval (4th to 10th century), Tier III medieval (1074 to the 1340s), Tier IV late medieval and early modern (1420 to 1567; the Ming sea ban began in 1371 and lasted into the 16th century).
- **Where it falls short:**
  - The engine gets only two. The Orders already cover most of what gold buys (wonders, great people, units without metal, debt, redraws).
  - Ten Doctrines need a new or near shape (section 9). Six are data only.
  - The Bardi Company needs the bots to price a loan before they meet one (question 1).

## 8. Counts

| Tier | Engine | Home market | Far trade | Goods | Bankers | All |
|---|---|---|---|---|---|---|
| I | 1 | 0 | 1 | 1 | 1 | 4 |
| II | 0 | 1 | 1 | 1 | 1 | 4 |
| III | 0 | 1 | 1 | 1 | 1 | 4 |
| IV | 1 | 1 | 1 | 0 | 1 | 4 |
| **All** | **2** | **3** | **4** | **3** | **4** | **16** |

| | Data only (existing shapes) | Near existing | New shape |
|---|---|---|---|
| Doctrines | 6: The Apoikia, The Debased Denarius, The Year and a Day, The Muda, The Peace of Lodi, The Monte di Pietà | 7: The Laurion Leases, The Delian League, The Sogdian Colonies, The Forbidden Silks, The Flying Money, The Sea Ban, The Opera del Duomo | 3: The Grand Canal, The Bardi Company, The Tea and Horse Agency |

## 9. The new shapes, grouped

Checked against the code at commit `48f37cf8`. Most are one field or one member.

1. **Refusals** (The Forbidden Silks, The Flying Money, The Sea Ban). One flag rule each, read where the verb is refused: `proposeDealError` (a luxury lent), `purchaseError` (a purchase in a town the scope does not admit), and `routeStartable` (a foreign destination). Expansionist's proposed The Inward Roads needs the third.
2. **Rule percents** (The Sogdian Colonies, The Opera del Duomo). Two `CardRule` members: `postTerm`, read by `postTermTurns()` as `routeTerm` is read by `routeTermFor`; and `goldContribution`, read in `contributionRate` beside `faithContribution`.
3. **Narrowings** (The Laurion Leases, The Delian League). A hex test on the `tilePurchase` rule, asked of the hex `explainTilePurchase` already holds; and a `notCoastal` scope beside `notFreshwater`.
4. **Food moved along a route** (The Grand Canal). A domestic route takes half the origin's surplus food and pays it to the destination, as two labelled lines. Expansionist's proposed The Annona and The Royal Works needed the same family (food or production sent between towns); your comments of 2026-10-23 cut both, so it serves The Grand Canal alone.
5. **The loan** (The Bardi Company). A deal that moves gold from the holder keeps a row (a deal of gold alone leaves none today). At its `untilTurn` the partner pays back twice the gold, as far as its treasury allows; `cancelDealsBetween` drops the loan in a war. The bots' deal appraisal (`explainSide`, `src/ai/diplomacy.ts`) must price the repayment, or a bot would accept a loan as a gift.
6. **Strategic resources as luxuries** (The Tea and Horse Agency). The four luxury counts (`uniqueLuxuries`, `luxuryCopies`, `duplicateLuxuries`, `monopolyLuxuries`) and the luxury happiness also count the holder's strategic kinds and copies. The deal gate does not, so a strategic resource is never lent. Like Strategic Exports' amplifier, it is applied outside the holdings memo.

**For less engine work, cut** The Bardi Company, then The Tea and Horse Agency, then The Grand Canal.

## 10. Facts the cells rely on

Checked at commit `48f37cf8`.

- **A Doctrine row** lives in the deck file's `doctrines` map with `decks`, `band` (1 to 4), `text` and `effects` (`data/decks/dominion.json`). `data/decks/commerce.json` has no `doctrines` map today.
- **Purchases** (`src/sim/purchase.ts`): a purchase costs the full price at `goldPerHammer` (4), never the remainder. `purchaseRider` takes `class`, `on` (`unit`, `building`, `route` or `all`), `percent` and `scope`. Hex prices are `explainTilePurchase` (`src/sim/cities.ts`), a list that holds the cell, with one `tilePurchase` card line and no tile test.
- **Contributions:** only rows marked `acceptsContributions` take them (the Cathedral and the Magnum Opus). `contributionRate` changes the faith rate by `faithContribution` and leaves the gold rate at 4.
- **Authority** (`data/rules.json`, `meters.authority`): a founded town costs 3, a coastal one 2, a captured one 4. `coastalCityCost` shifts the coastal price; `cityCost` takes a delta with a scope. No `notCoastal` scope exists.
- **Routes and posts:** a route runs 20 turns (`trade.routeTurns`); a post is established after 20 unbroken turns (`postTermTurns()`) and pays only at peace and unblockaded. `routeRider` takes `count`, `per` and `max`; `tradePartnerEmpires` counts the empires your routes serve. A route `pays` row takes `crossing` and `share`. `routeEndsHere` takes `crossing`, `direction` (`arriving` or `departing`), `atLeast` and `atMost`. `routeStartable` (`src/sim/trade.ts`) has five clauses (the pair, the slot, the direction, the mode and range, war and meeting); none refuses a foreign destination as such.
- **Deals** (`src/sim/deals.ts`): terms are gold once, tribute a turn, lent luxuries, open borders and, at a peace, towns. A deal runs 20 turns (`war.dealTurns`). A deal of gold alone leaves no row. War cancels every deal between the two (`cancelDealsBetween`).
- **Conditions:** `atPeace` is true when the empire is at war with no one; barbarians never count. `atWar` is its complement.
- **Luxuries:** each kind gives 4 happiness (`meters.happiness.perUniqueLuxury`), read through the `luxuryHappiness` amplifier target.
- **The hoard:** `bankedGold` counts a treasury below zero as nothing, and a `pays` row may pay `happiness`.
- **The bots** price every card by its effects (`src/ai/value.ts`, an exhaustive switch) and never renew a route. Each new shape needs a price there before bots take the Doctrine.

## 11. Questions for the user

1. **The Bardi Company's loan** is the largest new shape here: a deal that moves your gold becomes a loan, repaid twice over at the deal's end, and lost in a war. The bots must learn to price it. *Recommended: yes,* because it makes the deals screen a banker's tool with no new button. If it is too much work, cut it; the bankers keep three Doctrines.
2. **Bans as drawbacks.** The Forbidden Silks forbids lending luxuries, The Sea Ban forbids foreign routes, and The Flying Money forbids buying in a town with no gold building. *Recommended: accept them,* as Expansionist's proposals recommend (its question 6). Each is clear on the card and binds only the seat that chose it.
3. **The Grand Canal against The Grain Barges.** Both feed a home route's destination. *Recommended: keep both,* because The Grand Canal moves food from one town to another and The Grain Barges creates it. If you read them as one job, The Grand Canal can carry production instead: the realm pours its hammers into one town.
4. **The Opera del Duomo against The Merchant Works.** Both turn gold into the Magnum Opus. *Recommended: keep both,* because one is a cheaper choice to pour and the other a steady conversion. If you read them as one job, The Opera del Duomo becomes a home-market Doctrine instead.
5. **The Delian League** reads the coast for authority, where Commerce's other authority cards read Markets and routes. *Recommended: yes,* because the far trade by sea needs a reason to settle the coast before the first caravan.
6. **The Tea and Horse Agency** counts strategic resources as luxuries for happiness and for every luxury card, but not in deals. *Recommended: yes.* The smaller version counts them for cards only, which gives it no floor without the goods' Orders.
7. **The Debased Denarius** raises the price of units, buildings, caravans and hexes, but not of great-person drafts or gold redraws. *Recommended: as written,* which keeps it data only.
8. **What comes next.** *Recommended:* after your pass, the Doctrines go into the four Doctrine tables batch T1 adds to the Commerce sheet, then a triage sorts them into data-only and new-shape batches after T9.
