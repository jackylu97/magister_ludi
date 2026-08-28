/**
 * The lead page of every *generated* shelf.
 *
 * `compendiumText.ts` writes the two shelves that are nothing but prose. This
 * module writes the one page of prose that stands at the head of each of the
 * other fourteen, and it exists for the reason the user's ruling names: a card
 * built out of a data row can say what a thing *costs* and never what a thing
 * *is*. A reader who lands on the Units shelf and meets a strength figure has
 * not been told that units are the pieces on the map, that a city's queue is
 * where they come from, or that a civilian cannot fight.
 *
 * So the same three questions are answered at the top of every shelf, in the
 * same order and in the Compendium's plain voice (user ruling, 2026-08-27):
 * **what this kind of thing is, how you come by one, and where in the game you
 * use it** — followed, where the shelf needs it, by a paragraph of the words its
 * generated cards use. That last paragraph is the one concession this pass makes
 * to a describer it may not edit: the simulation's card vocabulary is the game's
 * own (`describeCard` in `src/sim/statecraft.ts`, the single place a card effect
 * becomes words, and it feeds the in-game hover cards too), so where a card says
 * "writ" or "camp" the Compendium **explains the word** rather than rewriting
 * it. One vocabulary, glossed once.
 *
 * `compendium.ts`'s digit rule holds here, and for the same reason: nothing on
 * these pages may name a number, because a number written in prose is a second
 * table that goes stale on the next balance pass. Where a figure matters the
 * sentence points at the cards below it, which print the live one.
 * `test/ui/compendium.test.ts` runs its scanner over this file as well.
 */

import type { CompendiumEntry, CompendiumSectionId } from './compendium';

/** The id every lead page carries on its shelf: `unit:about`, `tech:about`. */
export const SHELF_INTRO_KEY = 'about';

/**
 * A lead page, in the written shelves' shape.
 *
 * `written: true` is doing two jobs and both are wanted here: the card prints as
 * paragraphs rather than as a bulleted list of clauses, and the index's search
 * reads its prose as well as its name — so a reader typing "pantheon" finds the
 * page that explains what one is, not only the cards that happen to be named
 * after a god.
 */
function lead(
  section: CompendiumSectionId,
  name: string,
  glyph: string,
  paragraphs: readonly string[],
): CompendiumEntry {
  return {
    id: `${section}:${SHELF_INTRO_KEY}`,
    section,
    name,
    eyebrow: 'overview',
    mark: { kind: 'glyph', glyph },
    rows: [],
    clauses: paragraphs.map((text) => ({ text })),
    flavor: null,
    written: true,
  };
}

/**
 * The fourteen lead pages, by shelf.
 *
 * A record rather than a list because the one question `compendiumSections` asks
 * is "does this shelf have a lead page", and a shelf with none — the two written
 * shelves, which are already prose — simply is not a key.
 */
export const SHELF_INTROS: Partial<Record<CompendiumSectionId, CompendiumEntry>> = {
  unit: lead('unit', 'About units', '⚔', [
    'Units are the pieces you move on the map. You get one by putting it in a city’s build queue and letting the city’s production pay for it, or by buying it outright — most units with gold, and a few, such as the augur, with faith instead.',
    'Military units fight. Civilian units — settlers, workers, augurs, prophets and great people — cannot fight, and are captured if an enemy reaches them. Several civilians are used up by the job they do: a settler becomes a city, a worker spends charges until it has none left.',
    'A trader is neither, and has a slot of its own on a hex: a caravan may stand where a civilian and a soldier are already standing, and any number of caravans may share one hex. A trader that an enemy reaches is destroyed rather than captured, and its cargo goes to the attacker.',
    'Each entry below gives a unit’s combat strength, how far it moves, how far it sees, what it costs, what it costs the treasury every turn to keep, and which technology unlocks it. Soldiers cost gold every turn; civilians, traders and the scout cost nothing, and neither does a unit the game handed you rather than sold you.',
  ]),
  building: lead('building', 'About buildings', '▣', [
    'A building is a permanent addition to one city. You add it to that city’s build queue, its production pays for it over several turns, and once finished it stays for the rest of the game — a captured city keeps everything that was built in it.',
    'Buildings are how a city gets better at something: extra yields every turn, faster production of one kind of thing, stronger defence, wider sight, or renown that attracts great people.',
    'Each entry below gives a building’s production cost, what it pays every turn, what it costs the treasury every turn to keep, any other effect it has, and the technology that unlocks it. The buildings that cost upkeep are the institutions — the ones that earn renown — and the older the technology behind one, the cheaper it is to run. Wonders are on their own shelf, and a wonder costs nothing to keep.',
  ]),
  wonder: lead('wonder', 'About wonders', '✶', [
    'A wonder is a building only one player in the whole game can have. You build it the way you build anything else, but if a rival finishes it first yours is cancelled — so a wonder is a race, and worth starting early in a city with strong production.',
    'A wonder’s effect belongs to the city that holds it, which means a captured city carries its wonders to the new owner. Wonders cannot be bought with gold, and some can only be built in a particular kind of place, such as a coastal city.',
    'Each entry below gives a wonder’s production cost, everything it does, where it must be built, and the technology that unlocks it.',
  ]),
  improvement: lead('improvement', 'About improvements', '⛏', [
    'An improvement is something built on a single hex to make that hex worth more — a farm, a mine, a pasture, a fishing boat. It is also how you gain the use of a resource: most resources pay nothing until the improvement they ask for stands on them.',
    'Workers build almost all of them. A worker carries a number of work charges, spends one or more on each improvement, and is used up when they run out. A few at the end of this shelf are built by nobody else: five of them are a great person’s own work, one for each family, and the holy site is planted by a prophet.',
    'Each entry below gives what an improvement adds to a hex, the terrain it may be built on, the resources it opens, and the technology that unlocks it.',
  ]),
  resource: lead('resource', 'About resources', '◆', [
    'A resource sits on a hex from the moment the map is made and makes that hex more valuable. Bonus resources simply add yields. Luxury resources give your whole empire a standing bonus, usually happiness or gold. Strategic resources are what certain units are made of, and you cannot build those units without one.',
    'Three things stand between you and a resource: the technology that reveals it, the improvement it asks for, and ownership of the hex. Until the revealing technology is researched the resource is invisible, pays nothing, and cannot be used.',
    'Each entry below gives a resource’s yield, where it appears, the technology that reveals it, the improvement that opens it, and — for a luxury — what holding one does for your empire.',
  ]),
  tech: lead('tech', 'About technologies', '✦', [
    'A technology is something your civilisation has learned. Your science yield researches one at a time, and each finished technology unlocks new units, buildings, improvements and abilities, or makes something you already have pay more.',
    'You choose what to research on the research screen. A technology that requires others queues those ahead of it automatically. Technologies are grouped into ages, written here as Æra I, Æra II and Æra III; your empire enters the next age once it holds enough of the current one, which changes unit prices, the look of your cities, and which great people are offered.',
    'Each entry below gives a technology’s research cost, what it requires first, and everything it hands over.',
  ]),
  order: lead('order', 'About Orders', '❧', [
    'An Order is a policy card. Culture is what earns them: when enough has accumulated a draft opens, the game offers a small hand of Orders, and you keep the one you pick.',
    'An Order does nothing while it sits in your collection. You place it in one of your government’s slots on the Statecraft screen, and it works for exactly as long as it stays there. Slots are military, economic or wildcard; a card fits a slot of its own kind, and a wildcard slot takes any card. A newly placed Order is locked for a few turns, meaning it cannot be moved yet.',
    'A few phrases on these cards mean something exact. Authority is the meter that limits how many cities you can govern, and it can go negative. Border culture is the culture a city puts toward claiming its next hex, which is banked separately from the culture that earns you drafts. Leftover production is what is left in a city’s basket when something finishes. A unique luxury means each different kind of luxury resource you have improved, however many copies of it you hold. A fortification level counts the turns a unit has spent dug in, up to its cap. Authority capacity is the ceiling the meter measures against, not the meter itself — a card that raises it lets you govern more cities.',
    'Each entry below gives an Order’s slot kind, the draft pool it comes from, and exactly what it does.',
  ]),
  doctrine: lead('doctrine', 'About Doctrines', '✦', [
    'A Doctrine is a permanent bonus for your whole empire. It is the reward for adopting a new form of government, and it is chosen from the Doctrines offered at that government’s tier rather than drafted with culture.',
    'A Doctrine needs no slot and can never be lost or replaced, so it stacks with every Order you place and with every other Doctrine you have taken. That is what makes an adoption worth planning for.',
    'Each entry below gives the government tier a Doctrine belongs to and exactly what it does. The words these cards use are explained on the Orders shelf.',
  ]),
  belief: lead('belief', 'About beliefs', '◈', [
    'A belief is a permanent card your religion or your pantheon keeps. They are drawn from three separate pools, and the eyebrow on every card below says which pool it belongs to, because the three are drawn by different units and paid to different people.',
    'A god is drawn by an augur, a religious unit bought with faith, and the augur is used up entirely doing it. A god belongs to your pantheon: it pays every city you own, for the rest of the game, and nothing can take it away. Your pantheon holds only a limited number, so the early ones decide a great deal about what your civilisation is good at.',
    'The other two belong to the religion a prophet founds. A follower belief applies in every city that follows the faith, and it pays whoever owns that city — so a rival whose towns keep your religion is quietly getting your follower beliefs, and a rival’s faith in your towns is a gift you did not choose. An enhancer belief is the other half: it bends the spread itself — how far a holy site reaches, how hard it presses, how long a proclamation lasts — and it pays whoever holds the faith’s holy city, which is the city whose land the first holy site stands on. Take that city and you take what the faith pays. Both are drawn with a prophet’s charge, and a prophet can give a pool back and draw again.',
    'Each entry below gives exactly what a belief does. The words these cards use are explained on the Orders shelf.',
  ]),
  rite: lead('rite', 'About rites', '☩', [
    'A rite is a temporary blessing performed by an augur. Unlike adding a belief, a rite spends only one of the augur’s charges, so a single augur can perform several before it is used up.',
    'Most rites are performed on one of your cities and last a stated number of turns; one is performed on a unit instead. The effect starts at once, and performing a rite uses up the augur’s movement for that turn.',
    'Each entry below gives what a rite is performed on, how long it lasts, what it does, and the technology that teaches it.',
  ]),
  greatPerson: lead('greatPerson', 'About great people', '★', [
    'A great person is a famous individual who joins your civilisation. They are neither built nor bought. Renown — earned from certain buildings, from finishing wonders, and from Triumphs — fills a bar, and when it is full the game offers you a choice of great people to recruit.',
    'Each great person belongs to a family: scholar, artist, engineer, merchant or general. Once one appears in your capital you have two ways to spend it. Use it once, for the immediate effect its family gives; or send it to a hex and have it build its family’s special improvement. Either way the unit is used up, and its legacy — the standing bonus listed on its card — stays with your empire for good.',
    'Each name can be recruited by only one player in a game, so an offer is worth taking. Each entry below gives a great person’s family, age, how strong it is considered, and everything it does.',
  ]),
  triumph: lead('triumph', 'About Triumphs', '✵', [
    'A Triumph is an achievement that pays renown, and renown is what attracts great people. You never choose a Triumph; the game credits one to you the moment you do the thing it names, and tells you so.',
    'How often a Triumph can be earned varies: some once per game, some once per age, some every time it happens, and some go only to the first player in the world to manage it.',
    'Each entry below gives how often a Triumph may be earned, how much renown it pays, and which family of great people that renown counts toward.',
  ]),
  meter: lead('meter', 'About the meters', '⚖', [
    'The meters are the empire-wide limits on how far you can expand, and they are shown on the top bar. Happiness answers to how big your cities are; authority answers to how many of them there are. Each gives your empire a bonus while it is in surplus and a penalty while it is in deficit, in steps.',
    'Neither is a wall — you can go over and simply pay for it — which is what makes deciding when to found the next city a real decision. Growth is not a meter but the rule underneath both: how much food a city must bank to gain its next citizen.',
    'The pages below spell out every number the game actually uses for the three, read live from its data.',
  ]),
  trade: lead('trade', 'About trade', '⇄', [
    'Trade turns the distance between your cities into income. You build a trader, select it and choose Start route; you then pick any available route in the Trade screen, and the trader moves to the origin city and begins. That sets up a trade route, which pays the city the trader arrived at every turn until the route runs out — and how much it pays depends on the buildings in the city the trader left, so routes are worth running out of your best-built city.',
    'The trader lays road on every hex it walks over on the way. Roads are permanent, belong to everyone, and make units move faster; and once a city is joined to your capital by road it pays gold every turn on its own, whether or not a trade route is running.',
    'The pages below spell out what a route pays, what a road connection is worth, and what roads cost to keep.',
  ]),
};
