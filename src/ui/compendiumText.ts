/**
 * The Compendium's written shelves — the Introduction and the Concepts.
 *
 * Every other shelf in the Compendium is *generated*: a row of the data and the
 * sim's own describer, so a number on the page is a number the game is actually
 * using. These two shelves are the exception, and they are kept in their own
 * module so the exception is legible: **prose about how the game is played, and
 * never about a number.** Nothing here names a cost, a rung or a percentage;
 * where a figure matters the sentence points at the shelf that prints it. That
 * is what lets `compendium.ts` keep its digit-free rule and what keeps this file
 * true after every balance edit.
 *
 * Voice and shape (user rulings, 2026-08-27): plain and matter-of-fact, written
 * for someone who has never played a game like this. Every entry runs in the
 * same order — what the thing is and why it matters, then what you actually do,
 * then the precise rules last, under a paragraph that begins "Details:". Terms
 * are explained before they are used.
 */

import type { CompendiumEntry } from './compendium';
import { pamphletEntry } from './pamphlet';

/** A shelf entry with nothing but prose — the two written shelves' shape. */
function written(
  section: 'intro' | 'concept',
  id: string,
  name: string,
  eyebrow: string,
  glyph: string,
  paragraphs: readonly string[],
  flavor: string | null = null,
): CompendiumEntry {
  return {
    id: `${section}:${id}`,
    section,
    name,
    eyebrow,
    mark: { kind: 'glyph', glyph },
    rows: [],
    clauses: paragraphs.map((text) => ({ text })),
    flavor,
    written: true,
  };
}

// --- the Introduction --------------------------------------------------------

export const INTRO_ENTRIES: readonly CompendiumEntry[] = [
  // The printed pamphlet, first on the shelf: the leaflet a new player is
  // handed before the tutorial's first step lives here forever after
  // (`pamphlet.ts` — one table, and this page is its second mount). The book
  // still *opens* on How to play (`DEFAULT_ENTRY`); the pamphlet is where the
  // overlay's dismissal note and the tutorial's last card point back to.
  pamphletEntry(),
  written(
    'intro',
    'howToPlay',
    'How to play',
    'start here',
    '❧',
    [
      'This is a turn-based strategy game. You lead a civilisation from a single settler to an empire of many cities. The map is made of hexagonal tiles ("hexes"); you build cities on them, move units across them, and improve them to produce more. Each turn you give orders, and then the game advances one turn for everyone at once.',
      'Your first turn: select your settler and press the Found City button. The city appears, and the hexes around it become yours. Then select your warrior and right-click a hex to move it — walk it around to see what is nearby. Select your city to open its screen and choose what it builds first; a warrior or a scout for exploring, or a worker to improve your land, are good early choices. When you have nothing else to do, press End Turn.',
      'Over the following turns you will: build more settlers and found more cities; research technologies, which unlock new units and buildings; build workers and use them to put farms, mines and other improvements on your hexes; collect cards that give your empire bonuses; and defend against barbarians, who roam the unexplored parts of the map.',
      'Details: all players take their turns simultaneously — nothing resolves until everyone has pressed End Turn. Right-click moves the selected unit; a unit ordered further than it can go this turn keeps walking next turn on its own. The "?" button lists every control. Every number in this Compendium is read live from the game\'s data, so it is always current.',
    ],
  ),
  written(
    'intro',
    'goal',
    'The goal',
    'how the game is won',
    '✶',
    [
      'The game ends when one civilisation is the last one left. To win, you need to survive — and, in a game with rivals, eventually to conquer them or be the only one still standing.',
      'In practice, most of the game is about building a strong empire: more cities, bigger cities, better technology, more culture, wonders, and great people. A strong empire is what lets you defend yourself and, when you choose, take cities from others.',
      'Details: barbarians are not a civilisation and do not count — you do not have to clear the map of them to win. A game with only one player never declares a winner. A second way to win, the Bead Race (a race to complete achievements, scored on the Abacus screen, finished by a final project called the Magnum Opus), is designed but not yet in the game.',
    ],
  ),
  written(
    'intro',
    'aTurn',
    'A turn, in order',
    'what happens when you press End Turn',
    '⟳',
    [
      'A turn is the game\'s unit of time. During your turn you can do as much or as little as you like, in any order: move units, change what cities build, pick research, answer choices. Nothing happens in the world until you press End Turn.',
      'When every player has pressed End Turn, the game resolves the turn: units carry out their orders, cities produce, grow and build, research advances, and so on. Then a new turn starts and your units can move again.',
      'If something still needs your decision, End Turn will not proceed and the button will say why — for example a city with nothing in its build queue, or no technology chosen. Deal with it, or skip it if you really want to.',
      'Details: the resolution always runs in the same fixed order — standing orders move; cities collect yields, grow and complete the front item of their queue; research progresses; culture accumulates toward the next card draft; borders expand; barbarian camps spawn units; every unit\'s movement is refilled. Because all players move at once, two units can be ordered onto the same hex in one turn; orders are resolved in the order they were given, and a unit that could not finish its move keeps its orders.',
    ],
  ),
  written(
    'intro',
    'readingTheSheet',
    'Reading the numbers',
    'hover to see where a number comes from',
    '▤',
    [
      'The game shows a lot of numbers — how much food a city makes, what a unit costs, how strong it is in a fight. You never have to take one on trust: hover the mouse over almost any number and a breakdown appears, listing each thing that contributed and how much.',
      'This is the fastest way to learn the game. If a city is not growing, hover its food figure and see what is eating it. If an attack looks weak, hover the strength and see which bonuses apply.',
      'Details: each breakdown lists its sources with their amounts and shows the total under a double line; there is no hidden arithmetic beside the list. On a card, a struck-through line is an effect that is designed but not yet implemented, and a line in lighter text is a note; everything else on the card is in effect.',
    ],
  ),
];

// --- the Concepts ---------------------------------------------------------------

export const CONCEPT_ENTRIES: readonly CompendiumEntry[] = [
  written(
    'concept',
    'yields',
    'Yields',
    'what your cities produce',
    '⚙',
    [
      'A "yield" is anything a city produces each turn. There are six: food, production, gold, science, culture and faith. Food makes the city grow. Production builds units and buildings. Gold goes into your treasury to buy things. Science researches technologies. Culture earns you cards and expands your borders. Faith buys augurs and prophets, the game\'s religious units.',
      'Where yields come from: each of your citizens works one hex near the city, and that hex pays whatever its terrain, resource and improvement are worth — a grassland hex gives food, a hill gives production, a farm adds more food, a mine adds more production. Buildings add more on top. So a city grows by getting more citizens, working better hexes, and building.',
      'You can see a city\'s yields on its screen, and every hex\'s yield by hovering it — or all at once with the yields lens, which paints each hex\'s pay straight onto the map. Citizens are placed automatically; you can lock one to a hex you want worked.',
      'Details: if a hex has both hills and a feature such as forest, the feature\'s yield is what counts. The city\'s own hex is always worked. Bonuses from cards, luxuries and the happiness and authority meters are percentages, applied in two stages — city-level bonuses first, then empire-level — with all the percentages in one stage added together before they are applied. A city that is building a settler puts its citizens on production rather than food until it is done.',
    ],
  ),
  written(
    'concept',
    'cities',
    'Cities and borders',
    'founding, growing, expanding',
    '⌂',
    [
      'Cities are the heart of the game. A city works the land around it, builds everything you own, and claims territory. You found a city with a settler — a unit you build in an existing city — and more cities generally means a stronger empire, as long as you can keep them happy and governed (see Happiness and authority).',
      'A city grows when it has spare food after feeding its people; each new citizen works one more hex. Its borders expand over time as it accumulates culture, taking in nearby hexes one at a time. You can also buy a specific hex with gold — open the city and press Buy Tiles to see prices on the map.',
      'On the map, every city wears a banner. The number on it is the city\'s size, the ring around that number fills as the city grows toward its next citizen, and the line under the name says what the city is building and how many turns remain — so a glance across your banners is a glance across your whole empire\'s work.',
      'As a city\'s buildings earn renown, some of its people leave the fields for the trades. A guild forms on its own, needs nothing from you, and takes one citizen off the land in exchange for what that trade pays — scholars study, merchants trade, engineers build, artists compose. Only a fraction of a city\'s people ever join one, and if you would rather have the hex back you can dismiss a guildsman from the city panel.',
      'Cities can be captured. Reduce a city\'s defence by attacking it, then move a melee (close-combat) unit onto it. Protect your own cities with walls and a unit stationed inside.',
      'Where you settle matters for growth: a city beside a river, a lake or an oasis has fresh water and grows at full speed, while one founded away from water grows slowly until you build an aqueduct in it.',
      'Details: spare food fills a growth basket; when it is full the city gains a citizen. A granary keeps part of the basket after each growth. Border expansion picks the best available hex each time. A captured city keeps its buildings and counts against the new owner\'s authority. Your oldest city is your capital; if it is captured, the next oldest becomes the capital.',
    ],
  ),
  written(
    'concept',
    'meters',
    'Happiness and authority',
    'the two limits on expansion',
    '☺',
    [
      'Two empire-wide meters, shown on the top bar, stop you from growing without limit. Happiness is about the size of your cities: every citizen demands some, and if you run out, growth slows down. Authority is about the number of your cities: each one costs some, and if you exceed what you have, your science and culture are reduced.',
      'Neither is a hard wall — you can go over, you just pay for it. Keep happiness up with luxury resources, buildings such as Funeral Games, and cards. Keep authority up by building the right buildings and advancing through the ages, and by not founding cities faster than you can support them.',
      'Details: happiness surplus gives bonuses in steps, and a deficit slows growth in steps. Exceeding authority reduces science and culture by a percentage. Hover a meter on the top bar for its sources and click it for the full breakdown. Each city\'s own buildings are combined into that city\'s demand line, so every city shows a single net figure.',
    ],
  ),
  written(
    'concept',
    'technology',
    'Technology',
    'research and the ages',
    '✦',
    [
      'Technologies unlock new things: units, buildings, improvements, and abilities. Your science yield researches them one at a time. Open the research screen to see the tree — later technologies require earlier ones, and they are grouped into ages that mark the game\'s progress from the earliest era onward.',
      'To research something, click it. If it needs other technologies first, the game queues those first automatically. Hold Shift and click to add more to the queue, and the numbers on the tree show the order.',
      'Details: some technologies reveal a resource that was on the map all along — you cannot see or use it until then. Your empire moves into the next age when it holds enough of the current age\'s technologies. The age affects unit costs, how your cities look, and which great people can be recruited.',
    ],
  ),
  written(
    'concept',
    'statecraft',
    'Statecraft',
    'cards that shape your empire',
    '♠',
    [
      'Statecraft is the game\'s policy system. Your culture yield earns you cards called Orders, which give your empire bonuses — more production toward units, cheaper land, extra happiness, and so on. You choose which Orders to use by placing them in your government\'s slots.',
      'Every so often, when enough culture has accumulated, you draft: the game offers a few Orders and you pick one. Open the Statecraft screen to place Orders in slots; there are military, economic and wildcard slots, and an Order only works while it is placed. As you draft more, you can adopt a new form of government, which changes your slots and grants a Doctrine — a permanent bonus that needs no slot.',
      'Details: a newly placed Order is locked for a few turns before it can be removed. A removed Order keeps its level. Adopting a government clears every lock. Governments are offered in fixed sets of three at set draft counts. The Orders and Doctrines shelves in this Compendium show every card\'s exact effect.',
    ],
  ),
  written(
    'concept',
    'religion',
    'Faith and religion',
    'augurs, prophets, beliefs, followers',
    '🕯',
    [
      'Faith is a yield, produced by religious buildings such as shrines and temples and by holy sites on the land. It buys two units, and they are the whole of what faith does. An augur adds a belief to your pantheon — a permanent bonus for every city you own — or performs a rite on a city, which is a blessing that starts at once and runs for a stated number of turns. A prophet founds and spreads a religion.',
      'A religion is a faith of your own, with a name. Your prophet plants a holy site, and the religion is founded there, out of the gods your pantheon already keeps; the name is made from what those gods are about, and you can change it on the Religion screen. Only so many religions exist in a world — roughly two thirds as many as there are players — so founding one is a race, and a civilisation that waits may find there is none left to found.',
      'A religion spreads to people, not to places. Every turn, holy sites, nearby cities that already follow, roads, trade routes and proclamations press on each city in reach; when enough has accumulated, one citizen of that city changes faith. A city follows the religion more than half its citizens do, and until one religion passes half the city follows nothing. A temple is the defence: it doubles the pull of the faith a city already keeps and halves everybody else\'s. Growth adds a citizen who follows nothing, which is why a big city is slow to convert.',
      'A religion holds beliefs of its own, drawn with a prophet\'s charge, and the two pools are paid to two different people. A follower belief applies in every city that follows the faith and pays whoever owns that city — yours or a rival\'s, which is why a rival\'s faith taking hold in your towns is a gift rather than a wound. An enhancer belief bends the spread itself, and it pays whoever holds the faith\'s holy city: the city whose land the first holy site stands on. So does the trickle that foreign following cities pay in faith and gold. Lose that city to a conqueror and the trickle and the enhancers go with it; your pantheon, which is native to your empire, does not.',
      'A prophet is one deed, and it spends the whole piece. It founds your religion where it stands, raising the holy site that anchors it — the only thing about a religion an enemy can take away, by capturing the hex or pillaging it. Or it draws another belief for a religion you have already founded. Or it proclaims: a wide, strong pulse of conversion on the hex it stands on, which converts and then fades to nothing, leaving no site behind. Or it gives a pool of your religion\'s beliefs back so they can be drawn again.',
      'Details: each augur and each prophet costs more faith than the last, and they are counted separately. Every religious agent carries a single charge, so any one deed uses the whole piece — which is why the price ladder is the decision. The pantheon is never redrafted — it is what the religion was founded out of. A captured city keeps its followers, exactly as it keeps its buildings. Your religion, its beliefs, what its holy city is paid, and every city in the world that follows are all on the Religion screen; a city\'s own congregations are on its city screen, and hovering one shows what is pressing on it and from where.',
    ],
  ),
  written(
    'concept',
    'trade',
    'Trade and roads',
    'traders, routes, city connections',
    '⇄',
    [
      'Trade is a way to make your cities richer and to build roads at the same time. Once you have researched Currency you can build a trader, which is its own kind of unit — neither a soldier nor a civilian, with a slot of its own on a hex. Select a trader and choose Start route. Pick any available route in the Trade screen; the trader moves to the origin city and begins. The route pays extra food, production and gold to the destination city every turn.',
      'Where you send it matters: a route pays the destination city based on the origin city\'s buildings, so run routes out of your best-developed cities to the ones that need feeding. The trader does not have to be standing anywhere in particular — pick the pair you want and it comes to the origin. As the trader travels it lays road on every hex it passes, and roads make every unit move faster. Use the Trade screen (the ⇄ button on the top bar) to see your routes and every pair still on offer.',
      'Details: each market provides one route slot; the top bar shows routes in use and available. With no slot free, Start route is greyed and every route in the Trade screen reads "Not enough trade route capacity". A route lasts a fixed number of turns and can be set to renew automatically. Roads are permanent and any unit can use them: moving between two road hexes costs a fraction of a movement point and ignores terrain. Each city connected to your capital by road pays gold every turn; the roads you built cost a small upkeep. An enemy melee unit can attack a trader and take its cargo.',
    ],
  ),
  written(
    'concept',
    'wonders',
    'Wonders',
    'unique buildings, one per game',
    '✶',
    [
      'Wonders are powerful buildings that only one player in the whole game can build. They cost a lot of production but give effects that ordinary buildings do not — extra cards in every draft, cheaper units, a free technology, and so on.',
      'Because only one copy exists, building a wonder is a race. Pick wonders that suit your plan, start them early in a city with strong production, and check what your rivals are building. Some wonders can only be built in certain places, such as a coastal city.',
      'Details: a wonder\'s effect belongs to the city that holds it, so if that city is captured, the effect changes owner too. Completing a wonder awards renown and sometimes an immediate bonus. If another player finishes a wonder you were building at the front of your queue, the production you had invested is refunded as gold at a reduced rate.',
    ],
  ),
  written(
    'concept',
    'greatPeople',
    'Great people and Triumphs',
    'renown and the people it attracts',
    '✦',
    [
      'Great people are famous individuals — scholars, engineers, prophets, merchants, generals — who join your civilisation and give it a lasting advantage. You attract them with renown, a kind of prestige earned from certain buildings, from wonders, and from Triumphs.',
      'Triumphs are achievements: the first player to do something notable — found a certain number of cities, win a battle, raise a wonder — is credited with it and gains renown. When you have enough renown, the game offers you a choice of great people; pick one and they appear in your capital. Then either use them once for an immediate effect, or have them build a special improvement on a hex.',
      'Details: the offer is drawn from the current age and weighted toward the kinds of renown you have earned. Each great person can be recruited by only one player per game. Their legacy is added permanently to your government whichever way you use them. The special improvements are the academy, landmark, manufactory, customs house and citadel.',
    ],
  ),
  written(
    'concept',
    'combat',
    'Combat and movement',
    'moving units and fighting',
    '⚔',
    [
      'Units move a limited number of hexes each turn, and rough ground such as hills and forest slows them down. To attack, move a unit onto an enemy. Each unit has a strength; the stronger side does more damage. Before you attack, the game shows a forecast of the result.',
      'Terrain and position matter: a unit on a hill or inside a city defends better, and a unit that stays still for a couple of turns fortifies and defends better still. Ranged units such as archers attack from a distance without being hit back. Wounded units heal by staying still, faster in your own territory. Stepping between land and water — wading out to embark, or coming ashore — spends all of a unit\'s remaining movement, so a landing always costs a turn; ships dock and sail freely. A great general of yours left standing on the map makes every soldier of yours near it fight harder, attacking and defending alike.',
      'Barbarians appear from camps in unexplored land and raid nearby cities. Clearing a camp with a military unit gives a reward to your nearest city. Keep a warrior near each new city early on.',
      'Details: enemy units and cities exert zone of control on the hexes next to them — moving from one hex next to an enemy to another hex next to the same enemy costs one extra movement point. The general\'s bonus reaches a short distance, applies to your military units only, and does not stack with a second general. Combat is a single attack. Hills and forests add to a defender\'s strength, and fortifying adds more each turn it stays, up to a cap; cards and wonders can add further bonuses to either side. A city takes no benefit from the ground it stands on — instead it defends with the strength of the best unit its owner could build, plus its walls. A city with every neighbouring land hex controlled by enemies is under siege — but only once the besieger has learned Siegecraft: before that technology, war is raids, and a surrounded city still heals. Under a real siege it cannot heal and loses a little health each turn, but only an attack can capture it. A melee unit that destroys the defender advances into its hex. A civilian unit alone on a hex is captured by a melee attack, except a trader, which is destroyed and its cargo taken. A camp you have seen stays on your map until you see the hex again without it.',
    ],
  ),
  written(
    'concept',
    'fog',
    'Fog of war',
    'what you can and cannot see',
    '🧭',
    [
      'You do not see the whole map. Hexes you have never explored are blank. Hexes you have explored but cannot currently see are shown as you last saw them — the land, roads and improvements, but not units, which may have moved. Explore with scouts and warriors to reveal more.',
      'Details: each player has their own view of the map. A resource is not shown until you have researched the technology that reveals it; when you do, its icon, its model and its yield all appear at once.',
    ],
  ),
  written(
    'concept',
    'resources',
    'Resources and improvements',
    'what the land gives you',
    '◆',
    [
      'Some hexes carry a resource. Bonus resources such as wheat or fish add yields. Luxury resources such as silk or gems make your whole empire happier. Strategic resources such as iron or horses let you build certain units. Improvements are things a worker builds on a hex — a farm, a mine, a pasture — to increase its yield or to work its resource.',
      'To use a resource, build the improvement it asks for on it (the hex will tell you which) and own the hex. Workers have a limited number of uses, so spend them on your best hexes first. Clearing a forest gives a one-time production boost to the nearby city, and that boost grows with every technology you learn — though more slowly than the price of a soldier or a settler climbs, so it is not a substitute for a good mine.',
      'Details: you need three things to use a resource — the technology that reveals it, the right improvement on it (or a city built on it), and ownership of the hex. A hex with a resource only accepts the improvement that resource requires. Luxuries count once per type, except silver and gold, where every copy counts. Clearing forest or jungle is not allowed on a hex with a resource you could otherwise work. Improvements built by great people can go on any land hex and give access to any resource on it.',
    ],
  ),
];
