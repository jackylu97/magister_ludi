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
 * Voice: the Chamberlain addressing the Magister — courteous, brief, and it
 * names the rule (`docs/art-pass.md` §I). Mechanics keep their plain names.
 */

import type { CompendiumEntry } from './compendium';

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
  written(
    'intro',
    'howToPlay',
    'How to play',
    'in one page',
    '❧',
    [
      'You hold a seat at the table. Each turn, every seat moves at once: order your pieces, set your cities to work, choose what to study, and press End Turn. When every seat has ended, the world resolves — marches complete, cities grow, research lands, the wild stirs — and the next turn opens.',
      'Begin by founding a city with your settler. A city works the hexes around it and turns them into yields; its queue builds units and buildings; its borders grow with culture. Send your warrior to look around, your scout further, and your worker to improve the ground — a farm, a mine, a pasture on the resource it wants.',
      'Three things pace the game: what you build (production), what you learn (science, on the star chart), and what you decide (culture, which deals you cards of Statecraft). Faith calls augurs to bless your towns; gold buys what you cannot wait for; renown calls great people to your court.',
      'Right-click moves a piece. A piece ordered beyond its reach keeps walking next turn. The "?" card in the corner lists the controls; every number in this Compendium is the number the game is using right now.',
    ],
  ),
  written(
    'intro',
    'goal',
    'The goal',
    'what winning is',
    '✶',
    [
      'Today the game is won by outlasting every other empire: when one seat is all that remains, it has won. The wild does not count — barbarians are weather, not rivals — and a solo game never declares a winner, because winning by default is not a result.',
      'The Bead Race — a victory of feats, counted on the Abacus, ending in the Magnum Opus — is designed and not yet built. Until it lands, play for the long game: a wide and happy empire, a court of great people, the wonders of the world under your banner, and neighbours who would rather trade than march.',
    ],
    'Non omnis moriar.',
  ),
  written(
    'intro',
    'aTurn',
    'A turn, in order',
    'what End Turn does',
    '⟳',
    [
      'The turn window is yours until you end it; nothing resolves while a seat is still thinking. When the last seat ends, the world resolves in one fixed order, the same every time: standing orders march, then cities collect their yields, grow, and complete what they were building; research settles; culture fills the draft basket; borders creep; the wild musters; and every piece is refilled for the next turn.',
      'End Turn will stop you if something is owed — a city with an empty queue, a research not chosen, a card waiting to be picked, a great person waiting to be named. Answer the blocker or skip it; the corner tells you which.',
      'Because every seat moves at once, two pieces may want the same hex on the same turn. The world settles such contests in the order the orders were given, and a piece that lost the race simply keeps its orders for next turn.',
    ],
  ),
  written(
    'intro',
    'readingTheSheet',
    'Reading a sheet',
    'how the numbers explain themselves',
    '▤',
    [
      'Every total in this game is the sum of a list you can read. Hover a yield, a price, a strength, a meter, and the list unfolds: each line names its source and its figure, and the total sits under a double rule. If a number surprises you, the list is the answer; there is no arithmetic hidden beside it.',
      'A struck-through clause on a card is a promise the game does not yet keep — the sentence is ratified, the mechanism is not built. A faint note is a caveat. Everything else printed on a card is in force.',
    ],
  ),
];

// --- the Concepts ---------------------------------------------------------------

export const CONCEPT_ENTRIES: readonly CompendiumEntry[] = [
  written(
    'concept',
    'yields',
    'Yields',
    'the six voices',
    '⚙',
    [
      'A city speaks in six voices: food, production, gold, science, culture and faith. Food grows citizens; production builds the queue; gold fills the treasury; science climbs the star chart; culture fills the draft basket and pushes the borders; faith calls augurs and, in time, prophets.',
      'Each worked hex pays what its ground, its feature, its resource and its improvement say — a wooded hill is the wood\'s, not the hill\'s. The city centre works itself. Buildings add flat lines; cards, luxuries and the meters add percentages, and percentages compound across two stages — the city\'s and the empire\'s — and never inside one. Every line is on the sheet.',
      'Citizens are placed for you each turn, by the same rule every time; pin a hex to keep a citizen on it, and a city building a settler works for production until it is done.',
    ],
  ),
  written(
    'concept',
    'cities',
    'Cities and borders',
    'founding, growing, claiming',
    '⌂',
    [
      'A settler founds a city; the city claims its ring and grows from there. Growth is food over upkeep, banked toward the next citizen; a granary keeps a share of the basket when the town grows. Borders grow with culture, one hex at a time, choosing the best hex the town can reach; gold buys a hex outright, and the price plates on the map say what each one costs.',
      'A city may be captured by walking a melee unit onto it after its defence is beaten down. A captured town keeps its buildings, changes its roofs to its new owner\'s era, and costs its captor authority. The oldest-founded city is the capital; if it falls, the next oldest takes the palace.',
    ],
  ),
  written(
    'concept',
    'meters',
    'Happiness and authority',
    'the two limiters',
    '☺',
    [
      'Two meters keep an empire honest. Happiness is the tall limiter: each city\'s citizens demand it, luxuries and buildings and cards supply it, and an empire in surplus climbs rungs that pay a bonus, while one in deficit stifles its growth. Authority is the wide limiter: every city costs it, the palace and certain buildings and ages supply capacity, and an empire past its writ pays a soft penalty on science and culture — never a hard wall.',
      'Both are lists on the top bar: hover the chip for the sources, click it for the ledger. A city\'s own buildings are folded into that city\'s demand line, so a town with games reads as what it nets.',
    ],
  ),
  written(
    'concept',
    'technology',
    'Natural philosophy',
    'the star chart',
    '✦',
    [
      'Science climbs the star chart — the technology tree — one node at a time, oldest ages first. Each technology unlocks units, buildings, improvements, rites or abilities, and some reveal a resource that was under your feet all along. Click any node to research it: a locked node queues its prerequisites in order, and shift-click adds more to the plan. The numbered chips say where each stands.',
      'Every empire begins in the first age and passes into the next when it holds enough of the age\'s nodes; a town\'s roofs, a unit\'s cost and the great people who will answer your call all follow the age.',
    ],
  ),
  written(
    'concept',
    'statecraft',
    'Statecraft',
    'Orders, Doctrines, governments',
    '♠',
    [
      'Culture fills a basket; when it fills, you draft. A draft deals a hand of Orders — cards that sit in your government\'s offices (military, economic, or any) and shape how the empire behaves while they are seated. An Order is sealed for a few turns after it is placed; an unseated Order keeps its level. Every few drafts you may adopt a new government from a fixed triple, which jumps your offices, forgives every seal, and deals a Doctrine — a permanent law that takes no office.',
      'Nothing is a bare percentage of a yield: every card says what it changes and in what circumstance. The Compendium\'s Orders and Doctrines shelves print each card as the game reads it.',
    ],
  ),
  written(
    'concept',
    'religion',
    'Faith and the pantheon',
    'augurs, beliefs, rites',
    '🕯',
    [
      'Faith accumulates from shrines, temples, certain luxuries and cards, and it is spent on augurs — agents called from a city for a rising price. An augur may consecrate a belief into your pantheon while a slot is open, or perform a rite: a blessing on a city that pays at once and lingers for a stated span. A rite spends the augur\'s turn.',
      'Beliefs are cards in the same vocabulary as Statecraft: they pay every city you own, always, and are never taken from you. Prophets, religions with names of their own, and the spread of belief between cities are designed and are the next thing to be built.',
    ],
  ),
  written(
    'concept',
    'trade',
    'Trade and roads',
    'caravans, routes, the city connection',
    '⇄',
    [
      'A trader, once the empire knows currency, is sent from a city it stands in to another of your cities. The caravan walks there and back for the route\'s span, and every hex it rests on becomes road. The route pays the city it set out from, in food and production read off the destination\'s buildings and in gold read off both towns\' people — so the partner matters. Each market holds one route; the chip on the top bar counts them.',
      'Roads are permanent and anyone may walk them: a step between two paved hexes costs a fraction and ignores the ground. A city joined to the capital by road pays connection gold every turn; the roads you laid cost a little upkeep. A caravan on the road can be plundered by a melee blow — its cargo goes to the plunderer\'s nearest city.',
    ],
  ),
  written(
    'concept',
    'wonders',
    'Wonders',
    'one per world',
    '✶',
    [
      'A wonder is a building only one city in the world may raise. Its effect is a card — read from the city that holds the stones, so a captured wonder changes sides with them — and completing one pays renown and may grant something at once: a unit, a technology, a draft. Some wonders want a site: a harbour, a desert, a mountain within reach.',
      'If another empire finishes a wonder you were building at the front of your queue, the hammers you had banked toward it come back as gold at a lesser rate; that is the penalty for losing the race, and the reason to watch what your neighbours are raising.',
    ],
  ),
  written(
    'concept',
    'greatPeople',
    'Great people and Triumphs',
    'renown and the court',
    '✦',
    [
      'Renown is a fifth currency, paid by certain buildings every turn, by wonders in a lump, and by Triumphs — feats of the empire, each earned once per age, the first in the world to do it taking the honour. When the ladder fills, a hand of great people is dealt from the age\'s roster, weighted toward the families you have fed; you name one, and they arrive at your capital.',
      'A great person acts once — a burst of science, a hurried build, a blessing — or plants a work on the ground: an academy, a landmark, a manufactory, a customs house, a citadel. Either way their legacy stays with your government for the rest of the game. No two empires may call the same name.',
    ],
  ),
  written(
    'concept',
    'combat',
    'Combat and movement',
    'strength, terrain, control',
    '⚔',
    [
      'A piece moves as far as its points allow, paying the ground\'s price per hex; hills and woods cost more, roads less, rivers nothing yet. An enemy piece or city controls the hexes around it: stepping from one such hex to another beside the same enemy ends the move. A piece that rests two turns fortifies; a fortified piece defends harder, and one that rests in friendly ground heals.',
      'A fight is one blow, resolved from both strengths and every line that modifies them — terrain, fortification, a garrison, a card, a wonder — and the sheet shows the forecast before you commit. Ranged pieces strike without reply; melee pieces advance into a hex they clear. A lone civilian is captured by a melee blow, not killed — save a caravan, which is plundered.',
      'Barbarian camps spawn raiders from the fog; a camp is worth clearing for its bounty, and a camp you have seen stays on your chart until you see it gone.',
    ],
  ),
  written(
    'concept',
    'fog',
    'Terra Incognita',
    'the chart and the fog',
    '🧭',
    [
      'The world is drawn in as you see it. Unexplored ground is blank vellum with a sea-serpent or two in the margins; explored ground you cannot see right now is remembered as it was — the terrain, the roads, the improvements, a camp — but pieces move only where you can see them. Every seat has its own chart.',
      'A resource you have no word for is not on your chart at all until the technology that names it lands; then its mark, its prop and its yield appear together.',
    ],
  ),
  written(
    'concept',
    'resources',
    'Resources and improvements',
    'bonus, luxury, strategic',
    '◆',
    [
      'A bonus resource feeds a city; a luxury pays the whole empire once per kind, chiefly in happiness, with silver and gold the marked exceptions that count every copy; a strategic resource unlocks units. Access needs three things at once: the technology that names the resource, the improvement that works it (or a city standing on it), and the ground being yours.',
      'A worker carries a few charges and spends one per improvement; the improvement a resource wants is the only one the ground will take. Clearing a wood pays a lump of hammers to the nearest city — but never over a seam you could otherwise work. A great work may stand anywhere and opens whatever seam it covers.',
    ],
  ),
];
