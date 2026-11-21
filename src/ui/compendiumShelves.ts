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
 * Since the Compendium pass of 2026-11-21 a lead page also carries the rules
 * that are true of every entry on its shelf (how a unit is priced, how a ship
 * moves, what a wonder is), so that no entry has to say them. New text here is
 * plain English: short sentences, no em dashes (`CLAUDE.md`, Writing).
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

import { techDef } from '../sim/techData';
import { WAGER_RULES } from '../sim/wagerData';
import type { CompendiumEntry, CompendiumSectionId } from './compendium';
import { numberWords } from './numberWords';

/**
 * The technology that lets an empire pay faith for a new hand of Orders, as a
 * link with the name the data gives it.
 */
const LONG_COUNT = `[[tech:theLongCount|${techDef('theLongCount').name}]]`;

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
  // The pass of 2026-11-21: the rules every unit of a kind shares are said here,
  // one time, and no longer on each entry (the price, upkeep, upgrades, a
  // resource copy, charges, exploring, ships).
  unit: lead('unit', 'About units', '⚔', [
    'Units are the pieces you move on the map. A city builds a unit with production, or you buy it in a city with gold. A few units, such as the prophet, are bought with faith.',
    'Military units fight. Civilian units (settlers, workers, prophets and great people) cannot fight, and an enemy that reaches one captures it. A trader is neither. It has a slot of its own on a hex, so it can stand with a soldier and a civilian, and any number of traders can share a hex.',
    'Each entry below gives the figures of a unit, then what it does, then how you get it. The rules in the list below are true of every unit, so an entry does not say them again.',
    'Price: the production cost on an entry is the base price. A city can pay more, because each settler costs more than the last and cards change prices. The city screen shows the price your city pays.',
    'Upkeep: a military unit costs gold each turn. A civilian, a trader and a scout cost nothing, and a unit the game gave you costs nothing.',
    'Upgrades: when you research the technology of a better unit, your units of the older kind become the better unit, and the older unit leaves the build list. If the better unit needs a resource and you have no spare copy, the units stay as they are and the older unit stays on the list.',
    'Resources: a unit that needs a resource takes one spare improved copy when you add it to a build queue. It holds the copy for as long as it lives, and the copy comes back when the unit dies or is disbanded.',
    'Charges: a worker spends one or more charges on each improvement, and it is used up when it has none left.',
    'Exploring: you can tell any military unit to explore. It moves to unexplored land on its own until it can reach no more, and any other order stops it.',
    'Ships: a ship moves on coast and lake hexes. It can enter land only in a coastal city of yours, which is also where it is built. One land unit at sea can share a hex with a ship, and two ships cannot share a hex.',
    'Headings: after the ordinary units come the units of one leader, the units a card unlocks, and the units that are not in the game now.',
  ]),
  building: lead('building', 'About buildings', '▣', [
    'A building is a permanent part of one city. The city builds it with production, or you buy it there with gold. A captured city keeps its buildings.',
    'Each entry below gives the cost and the upkeep of a building, where it can be built, every effect it has, and what unlocks it. Upkeep is gold each turn, and the buildings that earn renown are the ones that cost it.',
    // The user, 2026-11-19: empire buildings are named and explained in the book.
    'Some buildings are [[concept:empireBuilding|empire buildings]]: your empire may normally have only one of each. If you lose the town that holds one, you lose the building too. Their entries below say so.',
    'Headings: after the ordinary buildings come the buildings of one leader, the buildings a card unlocks, and the buildings that are not in the game now. Wonders are on their own shelf.',
  ]),
  wonder: lead('wonder', 'About wonders', '✶', [
    'A wonder is a building that only one empire in the world can have. A city builds it with production. It cannot be bought with gold, and it has no upkeep.',
    'If another empire finishes a wonder first, your city stops building it. If the wonder was first in the build queue, the production you put in comes back as gold, at a lower rate.',
    'The effects of a wonder belong to the city that holds it, so an empire that captures the city gets them. Finishing a wonder pays renown.',
    'Each entry below gives the cost of a wonder, where it can be built, every effect it has, and the technology that unlocks it.',
  ]),
  improvement: lead('improvement', 'About improvements', '⛏', [
    'An improvement is built on one hex and makes that hex pay more. It is also how you get the use of a resource: most resources give nothing until the improvement they need stands on them.',
    'A worker builds most improvements, and each one costs work charges. A new improvement replaces the one that was on the hex.',
    'A great person builds the work of its family, and a prophet builds the holy site. These are great people’s works. A card that counts works counts each of them, and a work gives access to a resource on its hex.',
    'Each entry below gives what an improvement adds to its hex, where it can be built, the resources it gives access to, what it does, and what unlocks it.',
    'Headings: after the ordinary improvements come the improvements of one leader, the improvements a card unlocks, and the works of great people.',
  ]),
  resource: lead('resource', 'About resources', '◆', [
    'A resource is on a hex from the start of the game. A bonus resource adds yields to its hex. A luxury gives your whole empire a bonus. A strategic resource is what some units are made of.',
    'You need three things to use a resource: the technology that reveals it, the improvement it needs (or a city on the hex), and the hex inside your borders. Before you research the technology, you cannot see the resource, it pays nothing and you cannot use it.',
    'For the bonus of a luxury or a strategic resource, one improved copy is enough. A unit that needs a strategic resource holds one copy for as long as it lives, and a unit in a build queue holds one too. The copies you have left are the units you can still build.',
    'Each entry below gives the yield of a resource, where it appears, the technology that reveals it, the improvement it needs, the units that need it, and what it does for your empire.',
  ]),
  tech: lead('tech', 'About technologies', '✦', [
    'A technology is a thing your empire has learned. Your science researches one technology at a time. A finished technology unlocks units, buildings, improvements and abilities, or makes a thing you have pay more.',
    'You choose a technology on the research screen. If it needs other technologies, the game researches those first. Technologies are in ages, written Æra I, Æra II and so on. Your empire enters the next age when it has enough technologies of the present one.',
    'A charter technology is one that only an empire with its charter card can research. The charter technologies are under their own heading, after the ordinary ones.',
    'Each entry below gives the research cost of a technology, the technologies it needs first, and everything it gives.',
  ]),
  rule: lead('rule', 'About named rules', '§', [
    'Most technologies hand over a thing — a unit, a building, an improvement — and a few hand over a rule instead: something about your empire that is true from the moment the technology is finished, for the rest of the game.',
    'A short rule is printed on the technology itself, on the star chart and on its page here. A long one would not fit on a node, so it is given a name, the name is printed on the node in bold, and the whole of it is written down on this shelf. The name is the technology’s own.',
    'Each entry below gives the rule in full, says which technology brings it, and explains in ordinary words what it is for.',
  ]),
  // Rewritten on 2026-11-21 to the standard of the Compendium pass: one topic a
  // paragraph, the topic named first, short sentences, and links to the pages
  // a paragraph names.
  order: lead('order', 'About Orders', '❧', [
    'An Order is a card that gives your empire a bonus while it sits in a chair of your government. Culture earns Orders: when you have saved enough, a draft opens.',
    `Draft: the game offers a hand of Orders. Take one, or pass. A pass makes rarer cards more likely in your next draft. After you research ${LONG_COUNT} you can also pay faith for a new hand. That price rises each time, and it starts over with each new government.`,
    'Chairs: an Order works only while it is in a chair. Each chair and each card has a type: Military, Economic, Civic or Wildcard. A card fits a chair of its own type or a Wildcard chair, and a Wildcard card fits only a Wildcard chair. A card from a deck with no types yet fits any chair. A newly seated Order is locked for a few turns.',
    'Governments: a government sets how many chairs you have and their types. When you adopt a new one, each Order keeps its chair if the chair is still there and still fits. The others move to free chairs that fit them. An Order that fits no chair goes back to your collection.',
    'The last governments: each government of the last tier makes the cards of one type stronger. While it is your government, the yields, percentages and strengths of a seated card of that type rise by the share the government names. Costs, rules, happiness, authority and renown do not rise.',
    'Decks: each card is in a deck: Dominion, Expansionist, Commerce, Devotion, Scientific or Magisterial. Your [[leader:about|leader]] has two decks. You are offered the cards of those two decks, the cards that one of them shares with another deck, and the cards of no deck. One leader draws from all six. This shelf has a heading for each deck.',
    'Bands: each card has a band: early, middle, late, advanced or final. A band opens after a number of drafts, at the same draft as a new tier of governments. Your age does not matter. You are offered only the cards of the latest band you have reached, and the cards you hold stay yours.',
    'The held-back hand: at a few drafts you are also dealt a free hand of the cards your decks hold back. It waits until you open it, and a pass costs nothing.',
    'Keywords: [[concept:commission|Commission]], [[concept:charter|Charter]], [[concept:scaler|Scaler]] and [[concept:boon|Boon]] are printed first on a card, and each has a page. A Charter and a Boon take no chair.',
    'Words on cards: authority limits how many cities you can govern, and authority capacity is its ceiling. Border expansion is how fast a city claims its next hex. Leftover production is what is left in a city when a thing is finished. A unique luxury is one kind of luxury you have improved, however many copies you hold. A fortification level is one turn a unit has stayed dug in, up to a cap.',
    'Cards you cannot draw: a card marked not dealt yet has a rule the game cannot do yet. A withdrawn card is out of the game, and an empire that took one keeps it. The withdrawn cards are under the last heading.',
    'Each entry below gives the deck, the band and the rarity of an Order, and what it does.',
  ]),
  doctrine: lead('doctrine', 'About Doctrines', '✦', [
    'A Doctrine is a permanent bonus for your whole empire. It takes no chair, it is held for the rest of the game, and it can never be lost or replaced.',
    'Doctrines come with a new form of government. When you adopt one, you are offered Doctrines of that government’s tier from your own two decks: one from each deck, and a third from either. You take one, or pass and take none. Each tier of governments is paired with one tier of Doctrines: the governments of the first tier offer the first tier of Doctrines, the governments of the second tier the second, and so on. A Doctrine you already hold is never offered again.',
    'Every deck has its own Doctrines, written on its sheet, and only those whose rules the game can already carry out are offered so far. The older Doctrines from before the decks are withdrawn and offered to nobody; their pages are kept because an empire that took one keeps it, and it still pays exactly what it says.',
    'Each entry below gives a Doctrine’s deck, its tier and exactly what it does. The words these cards use are explained on the Orders shelf.',
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
    'Most rites last a stated number of turns from the turn they are said; a few do their work at once instead. A town keeps only one rite at a time unless an Order lets it keep more, and the price in faith rises with each age.',
    'Each entry below gives who can say a rite, how long it lasts, what it does, and the technology or Order that teaches it.',
  ]),
  greatPerson: lead('greatPerson', 'About great people', '★', [
    'A great person joins your empire when you have enough renown. You cannot build or buy one. Renown comes from some buildings, from wonders and from Triumphs. When the bar is full, the game offers you a choice of great people.',
    'Each great person has a family: scholar, artist, engineer, merchant or general. The person appears in your capital, and you use it in one of two ways: for the act of its family, or to build the work of its family on a hex. Each way uses up the unit.',
    'Each great person also has a legacy, which is the bonus on its entry. Your empire keeps the legacy for the rest of the game, whichever way you use the person.',
    'Only one empire in a game can recruit each name. Each entry below gives the family, the age and the strength of a great person, then the act, the work and the legacy.',
  ]),
  triumph: lead('triumph', 'About Triumphs', '✵', [
    'A Triumph is an achievement that pays renown, and renown is what attracts great people. You never choose a Triumph; the game credits one to you the moment you do the thing it names, and tells you so.',
    'How often a Triumph can be earned varies: some once per game, some once per age, some every time it happens, and some go only to the first player in the world to manage it.',
    'Each entry below gives how often a Triumph may be earned, how much renown it pays, and which family of great people that renown counts toward.',
  ]),
  bead: lead('bead', 'About the Bead Race', '◉', [
    'The Bead Race is the way to win without conquest. Every empire has one rod of glass beads on the Abacus, where everyone can see it. A full rod does not win the game. It lets you begin the Magnum Opus, and the empire that finishes the Magnum Opus wins, however many beads any other empire holds.',
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
    'A leader is who you play. You choose one when you set up the game, and the choice does not change.',
    'A leader gives you two abilities, which work from the first turn for the rest of the game. A leader also gives you a unit, and a building or an improvement, that no other empire can build. You get each of those when you research the technology that unlocks it.',
    'A leader also decides which two decks your Orders come from, where on the map you start, the names of your cities and the colours of your borders. One leader draws Orders from all six decks.',
    'Each entry below gives the decks of a leader, both abilities, the two things only that leader can build, and the colours and city names.',
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
