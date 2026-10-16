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
 * "authority capacity" or "camp" the Compendium **explains the word** rather than rewriting
 * it. One vocabulary, glossed once.
 *
 * `compendium.ts`'s digit rule holds here, and for the same reason: nothing on
 * these pages may type a number, because a number written in prose is a second
 * table that goes stale on the next balance pass. Where a figure matters the
 * sentence points at the cards below it, which print the live one.
 * `test/ui/compendium.test.ts` runs its scanner over this file as well. The one
 * exception is a figure the sentence cannot do without, such as what a kept
 * wager pays: it is read from data and written in words (`numberWords.ts`), so
 * it follows the data when it is retuned. `test/ui/guideCopy.test.ts` fails on
 * a bead count typed into this file, and on a retired system named in it.
 */

import { WAGER_RULES } from '../sim/wagerData';
import type { CompendiumEntry, CompendiumSectionId } from './compendium';
import { numberWords } from './numberWords';

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

/** "two beads", "one bead": a count of beads read from data, in words. */
function beadsInWords(count: number): string {
  return `${numberWords(count)} ${count === 1 ? 'bead' : 'beads'}`;
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
    'Units are the pieces you move on the map. You get one by putting it in a city’s build queue and letting the city’s production pay for it, or by buying it outright — most units with gold, and a few, such as the prophet, with faith instead.',
    'Military units fight. Civilian units — settlers, workers, prophets and great people — cannot fight, and are captured if an enemy reaches them. Several civilians are used up by the job they do: a settler becomes a city, a worker spends charges until it has none left.',
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
  rule: lead('rule', 'About named rules', '§', [
    'Most technologies hand over a thing — a unit, a building, an improvement — and a few hand over a rule instead: something about your empire that is true from the moment the technology is finished, for the rest of the game.',
    'A short rule is printed on the technology itself, on the star chart and on its page here. A long one would not fit on a node, so it is given a name, the name is printed on the node in bold, and the whole of it is written down on this shelf. The name is the technology’s own.',
    'Each entry below gives the rule in full, says which technology brings it, and explains in ordinary words what it is for.',
  ]),
  order: lead('order', 'About Orders', '❧', [
    'An Order is a policy card. Culture is what earns them: when enough has accumulated a draft opens, the game offers a small hand of Orders, and you keep the one you pick.',
    'An Order does nothing while it sits in your collection. You place it in one of your government’s chairs on the Statecraft screen, and it works for exactly as long as it stays there. A newly placed Order is locked for a few turns, meaning it cannot be moved yet.',
    'Every card and every chair has a type: Military, Economic, Civic or Wildcard. A Military, Economic or Civic card fits a chair of its own type or a Wildcard chair, and a Wildcard card fits only a Wildcard chair. A card from a deck that has not been sorted into types yet fits any chair. A government decides how many chairs you have and of which types, and a better form of government has more of them. When you adopt a new one, each placed Order keeps its chair if that chair is still there and still fits it; the rest move to free chairs that fit them, and any that fit none go back to your collection.',
    'Your leader decides which cards you will ever be offered. Every card belongs to a deck — Dominion, Expansionist, Commerce, Devotion, Scientific or Magisterial — and a leader holds two of them for the whole game. Beside those, two kinds of card are open to you whatever you play: the ones two decks share, which you may draw if you hold either, and the ones that belong to no deck at all, which everybody may draw. One leader is the exception and draws from all six. This shelf is arranged the same way, a heading to a deck, so the cards you can be dealt are the cards you can find.',
    'Each card also names a band — early, middle, late, advanced or final — which is how far along a realm must be before that card can turn up. A band asks for two things at once and waits for the later of them: a government that has reformed far enough, and scholarship that has reached the matching age. The advanced and final bands both ask for the last age, so the final band waits only on the government. You are only ever offered cards from the latest band you have reached. When a new band opens, the cards of earlier bands stop being offered, though any you already hold stay yours. Until then, a card you passed on may be offered again.',
    'A draft gives you three answers, not one. You may take a card; you may pass, which spends the hand and makes your next draft likelier to offer rarer cards; or, once your calendars can call for a second reading, you may pay faith to have the same draft dealt again. The reroll costs more every time you use it and more in later ages, and the button always prints what the next one will cost before you press it. At a few points along the ladder of reforms you are also dealt a hand of nothing but the cards your decks hold back. That one is free, it waits until you open it, and passing it costs you nothing.',
    'A charter is the one card that is never placed. It is drafted like any other, and taking it opens what it names — a study your scholars could not otherwise begin, a building your masons could not otherwise raise, a rite your temples could not otherwise perform. It takes no chair and can never be turned out of one, and it hands nothing over free: what it opens still has to be researched or built.',
    'A few phrases on these cards mean something exact. Authority is the meter that limits how many cities you can govern, and it can go negative. Border expansion is how fast a city claims its next hex, fed by that city’s own culture — banked separately from the culture that earns you drafts. Leftover production is what is left in a city’s basket when something finishes. A unique luxury means each different kind of luxury resource you have improved, however many copies of it you hold. A fortification level counts the turns a unit has spent dug in, up to its cap. Authority capacity is the ceiling the meter measures against, not the meter itself — a card that raises it lets you govern more cities.',
    'Two kinds of card here cannot be drawn, and each says which it is at the top of its page. A card marked not dealt yet is one whose wording is settled and whose rule the game cannot yet carry out; it is printed so you can read it, and it joins its deck the day that rule is built. A card marked withdrawn is one the design has taken out for good — an empire that took one before it went keeps it, and it still pays what it says. The withdrawn cards are the last shelf below, behind everything a draft can still deal.',
    'Each entry below gives an Order’s deck, its band, how often it turns up, and exactly what it does.',
  ]),
  doctrine: lead('doctrine', 'About Doctrines', '✦', [
    'A Doctrine was a permanent bonus for your whole empire — the reward for adopting a new form of government, chosen from the Doctrines offered at that government’s tier rather than drafted with culture. It needed no chair and could never be lost or replaced.',
    'The class is withdrawn. No government offers one any more, and the reward for reforming is a hand of the rarest Orders instead: cards your own decks hold back, dealt free at a few points along the ladder, taken into the collection like any other. The pages below are kept because an empire that took a Doctrine before they went keeps it, and it still pays exactly what it says.',
    'Each entry below gives the government tier a Doctrine belonged to and exactly what it does. The words these cards use are explained on the Orders shelf.',
  ]),
  belief: lead('belief', 'About beliefs', '◈', [
    'A belief is a permanent card your religion or your pantheon keeps. They are drawn from three separate pools, and the eyebrow on every card below says which pool it belongs to, because the three are drawn by different units and paid to different people.',
    'A god arrives on its own. Faith accumulates the way culture does, and when enough of it has been banked the game offers you a hand of gods and takes the faith when you pick one; each one after costs more than the last. A god belongs to your pantheon: it pays every city you own, for the rest of the game, and nothing can take it away. Your pantheon holds only a limited number, so the early ones decide a great deal about what your civilisation is good at.',
    'The other two belong to the religion a prophet founds. A follower belief applies in every city that follows the faith, and it pays whoever owns that city — so a rival whose towns keep your religion is quietly getting your follower beliefs, and a rival’s faith in your towns is a gift you did not choose. An enhancer belief is the other half: it bends the spread itself — how far a holy site reaches, how hard it presses, how long a proclamation lasts — and it pays whoever holds the faith’s holy city, which is the city whose land the first holy site stands on. Take that city and you take what the faith pays. Both are drawn with a prophet’s charge, and a prophet can give a pool back and draw again.',
    'Each entry below gives exactly what a belief does. The words these cards use are explained on the Orders shelf.',
  ]),
  // The augur is retired: a rite is a town's own verb, paid for in faith, and a
  // prophet can say one over every town at once (`docs/religion-v2.md`, Rites).
  rite: lead('rite', 'About rites', '☩', [
    'A rite is a temporary blessing that a town pays for in faith. Any of your towns can say a rite your empire knows, and a prophet can say one over every town you own at once.',
    'Most rites last a stated number of turns from the turn they are said; a few do their work at once instead. A town keeps only one rite at a time, and the price in faith rises with each age.',
    'Each entry below gives who can say a rite, how long it lasts, what it does, and the technology or Order that teaches it.',
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
  bead: lead('bead', 'About the Bead Race', '◉', [
    'The Bead Race is the only way to win. There are no separate paths — no conquest track, no science track — just one row of glass beads per player, on the Abacus, where everyone can see them. A full rod is not the win: it is the permission to begin the Magnum Opus, and the empire that finishes that great work takes the game, however long anybody else’s rod is.',
    // Since batch Q1 no bead is raced for: a wager's bar can be met by every
    // empire, and a grant is paid once to each empire (`docs/beads.md`).
    'Every bead is an announced event, and nothing is counted in private: every rod is on the Abacus, and so is how close every empire stands to each goal the age has set. The one secret is which goal each empire staked.',
    `There are two ways to earn one. The wager is the first and the ordinary one: every age from the second sets the whole world ${numberWords(WAGER_RULES.dealt)} bars, you stake one of them, and clearing a bar pays. The second is a handful of things that hand a bead over outright — finishing the last technology of the chart, raising one of the few buildings that pay one, raising the Magnum Opus itself.`,
    'There used to be more. Feats, race projects, quests and reckonings were the older answer — firsts in the world, races in the build list, deeds dealt from an age’s deck, and a measurement of everybody at the age’s close — and the wager replaced all four. Their pages are still below, marked withdrawn, because a game that earned one of those beads keeps it.',
    'Every bead belongs to one of four families — domination, culture, science, economic — and the family decides the colour of the bead and nothing else: they are all worth the same, and a rod of four colours opens the Magnum Opus exactly as a rod of one does. A bead pays nothing else today. Some of the withdrawn beads below paid a reward when they were earned, and a game that earned one keeps it.',
    'One slot on every rod is different. The last bead is golden, it can only be earned by completing the Magnum Opus, and its slot sits empty from the first turn — the standing question of the whole game. The pages below give the rules of the race, then everything that has ever paid a bead.',
  ]),
  wager: lead('wager', 'About the wager', '◈', [
    // The counts are read from `data/wagers.json` (`rules.dealt`,
    // `rules.stakeBeads`, `rules.otherBeads`) and written in words.
    `Every age from the second deals the whole world ${numberWords(WAGER_RULES.dealt)} targets at once, out of a deck cut for that age. Each of them is a bar — a figure to reach, not a race to win — so anybody who clears one clears it, however many others already have.`,
    `On the turn the cards are dealt you stake one of the ${numberWords(WAGER_RULES.dealt)}, in secret, and you cannot end that turn without staking. Clearing the card you staked pays ${beadsInWords(WAGER_RULES.stakeBeads)}; clearing any of the others pays ${beadsInWords(WAGER_RULES.otherBeads)}; and the beads are minted the moment a bar is met rather than at the age’s close, so a bar met and then lost to a war still paid.`,
    'Missing the card you staked is the only thing the wager punishes. At the age’s close a seat whose own bar went unmet is dealt a malice — a card with a bad face that takes one of its government’s chairs and stays there until the next age’s wager is judged. The malices are on their own shelf.',
    'A wager reads one of two ways, and the entry below says which. A standing bar reads your realm as it is now; a flowing bar counts what you have gathered since the cards were dealt. Some cards ask several things at once, and then the bar is how many of their clauses hold on one turn — all of them.',
    'Each entry below gives the thread a card is dealt under, which rod its beads land on, what it asks in plain words, and the bar it sets in each of the ages it can be dealt in.',
  ]),
  malice: lead('malice', 'About malices', '✕', [
    'A malice is what a missed wager costs you. It is a card like any other — it says what it does in the same words an Order does, and it pays what it says every turn — except that nobody chooses it, it arrives with the age’s judgement, and it cannot be taken out.',
    'It takes a chair. Each malice names a kind of chair, it seats itself in the last chair of that kind your government has, and whatever Order was sitting there is turned out into your hand with its lock lifted — nothing is refunded, because nothing was spent. A realm with no chair of that kind takes it in a wildcard chair, and a realm with no free chair at all takes it anyway. Losing the chair is the sharper half of the punishment: a wide council is one seat narrower until the debt is paid.',
    'The debt is paid by the next wager. A malice stays until the next age’s wager is judged: keep the bar you stake that age and it leaves, miss it and the old one stays while a new one joins it. A realm carries at most two at a time, and a third replaces the oldest. Adopting a new government lifts every lock on your Orders and does not lift this — the malice simply takes a chair in the new spread.',
    'Each entry below gives the kind of chair a malice takes and exactly what it does while it sits there. Its lines are credited to it by name wherever your yields are broken down, so it is always possible to see what it is costing you.',
  ]),
  leader: lead('leader', 'About leaders', '♛', [
    'A leader is who you play, and you pick one when the game is set up. The choice is made once and it is the whole of what your realm can do that no other realm can: nothing about it is drafted later, and nothing about it changes.',
    'A leader gives you four things. Two of them are lines of your own, true from the first turn and for the rest of the game, whatever else you build or research — they are read and paid exactly as a card in one of your chairs is, and they are credited by name wherever your yields are broken down. The other two are a unit and a building that only your realm may ever raise. Those are not gifts: each waits for the technology that opens it, like any other unit or building, and until then it is simply something you know is coming.',
    'A leader also decides where in the world you are seated — a leader whose whole game is horses is put on grass with horses on it — what your towns are called as you found them, and the two colours your borders and pieces wear.',
    'The pages below give each leader in full: both lines in the words the game itself uses for them, the two things only they can build, their towns in order, and their colours.',
  ]),
  meter: lead('meter', 'About the meters', '⚖', [
    'The meters are the empire-wide limits on how far you can expand, and they are shown on the top bar. Happiness answers to how big your cities are; authority answers to how many of them there are. Each gives your empire a bonus while it is in surplus and a penalty while it is in deficit, in steps.',
    'Neither is a wall — you can go over and simply pay for it — which is what makes deciding when to found the next city a real decision. Growth is not a meter but the rule underneath both: how much food a city must bank to gain its next citizen.',
    'The pages below spell out every number the game actually uses for the three, read live from its data.',
  ]),
  trade: lead('trade', 'About trade', '⇄', [
    'Trade turns the distance between your cities into income. You hire a route with gold on the Trade screen — pick a pair of towns and pay for it — and a caravan appears in the town it sets out from and takes to the road at once. The route pays the town it arrives at every turn until it runs out, and how much it pays depends on the buildings in the town it left, so routes are worth running out of your best-built city.',
    'The trader lays road on every hex it walks over on the way. Roads are permanent, belong to everyone, and make units move faster; and once a city is joined to your capital by road it pays gold every turn on its own, whether or not a trade route is running.',
    'The pages below spell out what a route pays, what a road connection is worth, and what roads cost to keep.',
  ]),
};
