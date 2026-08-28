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
 * Voice: plain and matter-of-fact (user ruling, 2026-08-27). Short sentences,
 * no address, no metaphor. Mechanics keep their plain names.
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
    'the basics',
    '❧',
    [
      'All players take their turns at the same time. During a turn you move units, set what each city builds, choose a technology to research, and answer any pending choices. Press End Turn when you are done. When every player has ended their turn, the game resolves everything at once and the next turn begins.',
      'Start by founding a city with your settler. A city works the hexes around it to produce yields, builds units and buildings from its queue, and expands its borders with culture. Use your warrior and scout to explore. Use your worker to build improvements on tiles — a farm, a mine, or the improvement a resource requires.',
      'Production builds things. Science unlocks technologies. Culture earns Statecraft cards. Faith buys augurs. Gold buys units, buildings and tiles. Renown earns great people.',
      'Right-click a hex to move the selected unit there. A unit ordered further than it can move this turn continues automatically next turn. The "?" button lists the controls. Every number in this Compendium is read from the game\'s current data.',
    ],
  ),
  written(
    'intro',
    'goal',
    'The goal',
    'how the game is won',
    '✶',
    [
      'Currently the game is won by being the last empire standing. Barbarians do not count as an empire. A game with only one player never declares a winner.',
      'A second victory — the Bead Race, scored on the Abacus and finished by the Magnum Opus — is designed but not yet built. Until it is, the practical goals are: grow a large, stable empire; build wonders; recruit great people; and keep your neighbours from conquering you.',
    ],
  ),
  written(
    'intro',
    'aTurn',
    'A turn, in order',
    'what End Turn resolves',
    '⟳',
    [
      'Nothing resolves until every player has pressed End Turn. Then the game runs these steps in a fixed order: units with standing orders move; cities collect yields, grow, and complete the item at the front of their queue; research progresses; culture accumulates toward the next card draft; borders expand; barbarian camps spawn units; every unit\'s movement is refilled.',
      'End Turn is blocked while something needs an answer: a city with an empty build queue, no technology selected, a card draft waiting, or a great person waiting to be chosen. The button names the blocker. You can resolve it or skip it.',
      'Because all players move at once, two units can be ordered onto the same hex in the same turn. Orders are resolved in the order they were given. A unit that could not complete its move keeps its orders for next turn.',
    ],
  ),
  written(
    'intro',
    'readingTheSheet',
    'Reading the numbers',
    'how totals are shown',
    '▤',
    [
      'Every total in the game is the sum of a list of sources. Hover over a yield, a price, a combat strength or a meter to see the list. Each line shows its source and its amount; the total is shown under a double line.',
      'On a card, a struck-through line is an effect that is designed but not yet implemented. A line in lighter text is a note. Every other line is in effect.',
    ],
  ),
];

// --- the Concepts ---------------------------------------------------------------

export const CONCEPT_ENTRIES: readonly CompendiumEntry[] = [
  written(
    'concept',
    'yields',
    'Yields',
    'food, production, gold, science, culture, faith',
    '⚙',
    [
      'A city produces six yields. Food grows population. Production builds units and buildings. Gold goes to the treasury. Science researches technologies. Culture earns card drafts and expands borders. Faith buys augurs.',
      'Each worked hex pays according to its terrain, its feature (forest, jungle, and so on), its resource, and its improvement. If a hex has both hills and a feature, the feature\'s yield applies. The city centre hex is always worked. Buildings add flat amounts. Cards, luxuries and the meters add percentages. Percentages are applied in two stages — city bonuses first, then empire bonuses — and percentages within one stage are added together before being applied.',
      'Citizens are assigned to hexes automatically each turn using a fixed rule. You can lock a citizen to a hex. A city building a settler prioritises production over food.',
    ],
  ),
  written(
    'concept',
    'cities',
    'Cities and borders',
    'founding, growth, expansion, capture',
    '⌂',
    [
      'A settler founds a city. The city starts with the hexes around it and grows from there. Population grows when the city\'s food, after feeding its citizens, fills the growth basket. A granary keeps part of the basket after each growth. Borders expand one hex at a time as the city accumulates culture; the city picks the best available hex. Hexes can also be bought with gold — the price is shown on the map.',
      'A city is captured by moving a melee unit onto it after its defence has been reduced. A captured city keeps its buildings and counts against the new owner\'s authority. The oldest city is the capital. If the capital is captured, the next oldest city becomes the capital.',
    ],
  ),
  written(
    'concept',
    'meters',
    'Happiness and authority',
    'the two empire-wide limits',
    '☺',
    [
      'Happiness limits how large cities can grow. Each city\'s population demands happiness; luxuries, buildings and cards supply it. A surplus gives bonuses in steps; a deficit slows growth in steps. Authority limits how many cities you can hold. Each city costs authority; the palace, certain buildings and technologies supply it. Exceeding your authority reduces science and culture by a percentage. Neither meter is a hard cap.',
      'Both meters are shown on the top bar. Hover to see the sources; click to open the full breakdown. A city\'s own buildings are combined with that city\'s demand line, so each city shows a single net figure.',
    ],
  ),
  written(
    'concept',
    'technology',
    'Technology',
    'the research tree',
    '✦',
    [
      'Science is spent on technologies in a tree, arranged by age. Each technology unlocks units, buildings, improvements, rites or abilities; some reveal a resource on the map. Click a technology to research it. Clicking a technology you cannot research yet queues its prerequisites first. Shift-click adds a technology to the end of the queue. Numbered markers show the order.',
      'Your empire advances to the next age when it holds enough technologies of the current one. The age determines unit costs, city appearance, and which great people can be recruited.',
    ],
  ),
  written(
    'concept',
    'statecraft',
    'Statecraft',
    'Orders, Doctrines, governments',
    '♠',
    [
      'Culture accumulates toward a card draft. Each draft offers a choice of Orders. An Order is placed in one of your government\'s slots — military, economic, or wildcard — and applies while it is slotted. A newly slotted Order is locked for a few turns. Removing an Order keeps its level for later.',
      'After a set number of drafts you can adopt a new government from a fixed choice of three. Adopting a government changes your slots, clears every lock, and offers a Doctrine — a permanent effect that does not use a slot. The Orders and Doctrines shelves in this Compendium show every card\'s exact effect.',
    ],
  ),
  written(
    'concept',
    'religion',
    'Faith and the pantheon',
    'augurs, beliefs, rites',
    '🕯',
    [
      'Faith is produced by shrines, temples, some luxuries and some cards. It is spent on augurs, whose price rises with each one bought. An augur can consecrate a belief into your pantheon (while a belief slot is open) or perform a rite: an immediate effect on a city that lasts a stated number of turns. Performing a rite uses the augur\'s movement for the turn.',
      'Beliefs are cards that apply to every city you own and cannot be lost. Prophets, named religions, and the spread of religion between cities are designed but not yet built.',
    ],
  ),
  written(
    'concept',
    'trade',
    'Trade and roads',
    'traders, routes, city connections',
    '⇄',
    [
      'After researching Currency you can build traders. A trader standing in one of your cities can be sent to another of your cities. It travels back and forth between the two for a fixed number of turns and lays road on every hex it stops on. The route pays the origin city: food and production based on the destination city\'s buildings, and gold based on the population of both cities. Each market provides one route slot. The top bar shows routes in use and routes available.',
      'Roads are permanent and can be used by any unit. Moving between two road hexes costs a fraction of a movement point and ignores terrain. Each city connected to the capital by road pays gold every turn. Roads you built cost a small upkeep. A trader can be attacked by a melee unit; its cargo goes to the attacker\'s nearest city.',
    ],
  ),
  written(
    'concept',
    'wonders',
    'Wonders',
    'one per game',
    '✶',
    [
      'A wonder is a building that only one city in the game can build. Its effect belongs to the city that holds it, so a captured wonder changes owner with the city. Completing a wonder awards renown and may grant an immediate bonus such as a unit, a technology or a card draft. Some wonders require a site: a coastal city, a desert city, or a city next to a mountain.',
      'If another player completes a wonder you are building at the front of your queue, the production you had spent on it is refunded as gold at a reduced rate.',
    ],
  ),
  written(
    'concept',
    'greatPeople',
    'Great people and Triumphs',
    'renown',
    '✦',
    [
      'Renown is earned each turn from certain buildings, in a lump from wonders, and from Triumphs — achievements that can be earned once per age, with the first player to achieve one credited. When enough renown accumulates, you are offered a choice of great people from the current age; the offer is weighted toward the families you have earned renown in. The chosen great person appears at your capital.',
      'A great person can either act once — for example a burst of science or production — or build a special improvement: an academy, a landmark, a manufactory, a customs house or a citadel. In both cases their legacy is added permanently to your government. Each great person can be recruited by only one player per game.',
    ],
  ),
  written(
    'concept',
    'combat',
    'Combat and movement',
    'strength, terrain, zone of control',
    '⚔',
    [
      'A unit moves until its movement points run out. Hills and forests cost more; roads cost less. Enemy units and cities exert zone of control over adjacent hexes: moving from one hex adjacent to an enemy to another hex adjacent to the same enemy ends the unit\'s movement. A unit that does not move for two turns becomes fortified and defends better. Units heal when they do not move, faster in friendly territory.',
      'Combat is a single attack. Both units\' strengths are modified by terrain, fortification, garrison, cards and wonders; the forecast is shown before you attack. Ranged units attack without taking damage. A melee unit that destroys the defender moves into its hex. A civilian unit alone on a hex is captured by a melee attack, except a trader, which is destroyed and its cargo taken.',
      'Barbarian camps spawn units. Clearing a camp gives a reward to your nearest city. A camp you have seen stays on your map until you see the hex again without it.',
    ],
  ),
  written(
    'concept',
    'fog',
    'Fog of war',
    'the map',
    '🧭',
    [
      'The map is revealed as your units and cities see it. Unexplored hexes are blank. Explored hexes you cannot currently see show what was there when you last saw them — terrain, roads, improvements, camps — but not units. Each player has their own view of the map.',
      'A resource is not shown on the map until you have researched the technology that reveals it. When you do, its icon, its model and its yield appear at the same time.',
    ],
  ),
  written(
    'concept',
    'resources',
    'Resources and improvements',
    'bonus, luxury, strategic',
    '◆',
    [
      'Bonus resources add yields to a hex. Luxury resources give an empire-wide bonus, mainly happiness, once per type (silver and gold are the exception: every copy counts). Strategic resources are required to build certain units. To use a resource you need all three of: the technology that reveals it, the improvement that works it (or a city on the hex), and ownership of the hex.',
      'A worker has a limited number of charges and spends one per improvement. A hex with a resource only accepts the improvement that resource requires. Clearing a forest or jungle gives a one-time production bonus to the nearest city, but is not allowed on a hex with a resource you could otherwise work. Great-person improvements can be built on any land hex and give access to any resource on it.',
    ],
  ),
];
