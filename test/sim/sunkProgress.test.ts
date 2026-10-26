/**
 * **Sunk progress** — batch S2, schema 111, `docs/flags.md` item (www).
 *
 * The user's ruling, verbatim: *"the pool of yields shouldn't swap over when
 * reselecting something, i.e. science is placed into a tech, and that tech is
 * committed at the end of turn, swapping to a different tech shouldn't allow you
 * to keep your technology progress on the new tech, same for production"* — and,
 * on which way the beakers go: *"kept and not lost is what i was thinking too"*.
 *
 * Four claims, and they are why this is one file rather than cases scattered
 * across `tech.test.ts` and `cities.test.ts`:
 *
 *   · **A switch keeps, and does not carry.** Aiming somewhere else parks what
 *     was banked under the thing it was spent on and starts the new thing from
 *     whatever *it* had. Both buckets survive; nothing is confiscated and
 *     nothing rides along.
 *   · **Overflow is not progress.** What is left after a thing completes was
 *     never spent toward it, so it follows the *queue* to whatever comes up —
 *     which is what overflow has always done, and the one place the two rules
 *     could have been confused with each other.
 *   · **A project's bucket is simply the accumulator.** A conversion never
 *     completes (Entry XXVI), so its bucket has nothing to spend down and a town
 *     that puts one aside comes back to the hammers it left in it.
 *   · The two properties every command in this codebase owes: a refusal leaves
 *     the state byte-identical, and a log replays to the same bytes.
 */

import { describe, expect, it } from 'vitest';

import { type Command, applyCommand } from '../../src/sim/commands';
import { foundCityAt, settleProduction, turnsToBuild } from '../../src/sim/cities';
import { dispatch, snapshotState } from '../../src/sim/game';
import { getTileAt } from '../../src/sim/map';
import {
  type City,
  type GameState,
  SCHEMA_VERSION,
  bankedTowardItem,
  bankedTowardTech,
  bumpRevision,
  frontKey,
  playerById,
  queueItemKey,
  reaimProduction,
} from '../../src/sim/state';
import { techDef } from '../../src/sim/techData';
import { advanceResearch } from '../../src/sim/tech';
import { game } from './purchaseHelpers';

// --- harness ----------------------------------------------------------------

/**
 * The simulation's own text, read through Vite's raw glob rather than
 * `node:fs` — this project has no node typings and a source assertion is not
 * worth a dependency (`cities.test.ts`' note).
 */
const SIM_SOURCE = import.meta.glob(['../../src/sim/*.ts', '../../src/sim/*/*.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function simSource(file: string): string {
  const key = Object.keys(SIM_SOURCE).find((path) => path.endsWith(`/${file}`));
  expect(`${file} readable`).toBe(key === undefined ? `${file} missing` : `${file} readable`);
  return SIM_SOURCE[key!]!;
}

function found(state: GameState, playerId: number): City {
  const unit = state.units.find((u) => u.ownerId === playerId)!;
  return foundCityAt(state, playerId, getTileAt(state.map, unit.col, unit.row)!);
}

function chooseResearch(techId: string, playerId = 0): Command {
  return { type: 'chooseResearch', playerId, techId } as Command;
}

function setProduction(cityId: number, queue: unknown[], playerId = 0): Command {
  return { type: 'setCityProduction', playerId, cityId, queue } as Command;
}

// --- the schema -------------------------------------------------------------

describe('the schema says so', () => {
  it('bumps to the version the changelog writes the rule down at', () => {
    // 111 is this batch's; 112 landed on top of it the same evening (F2, the
    // prophet's charges), so the constant reads the later number.
    // 119 is the decks rework (D1a, branch `decks`): four seat fields, the
    // reward hands, universal chairs and a draw that deals every hand
    // differently — a v118 save is refused (`state.ts`'s changelog).
    // 121 since D2d (the decks rework, branch `decks`): a town remembers when
    // each of its buildings went up, a hex when its work was raised and a route
    // when it opened, so a v120 log answers "not old enough" to every card
    // written on an age — a bump within the branch, which migrates nothing
    // either way.
    // 123 since C8: a town records which bank paid for each of its buildings.
    // 124 since the current-band ruling of 2026-10-13: a hand is dealt only from
    // the seat's current band, so a v123 log would pick from different hands.
    // 125 since WC1: a town taken by force enters unrest, so a v124 log's
    // captured towns would bank hammers, beakers and culture this build withholds.
    // 126 since WC2: a war's losses are recorded and cost happiness, so a v125
    // log's losing empires would grow on turns this build holds them back.
    // 127 since WC3: units earn ranks in combat, so a v126 log's veterans
    // would fight weaker than this build makes them.
    // 128 since D0: fourteen Dominion cards join the decks and three are
    // retired, so a v127 log's picks name cards this build never dealt.
    // 129 since C2a: chairs have types again, adoption re-seats the council,
    // and the tier-38 governments are retired, so a v128 log can seat a card
    // where this build refuses it.
    // 130 since D1: eleven Dominion cards that give units experience or pay
    // when a unit earns a rank, a new end-of-turn phase and a new record, so
    // a v129 log's picks name cards this build never dealt.
    // 131 since C3: the reward hands go and an adoption opens a Doctrine
    // offer, so a v130 seat carries fields this build no longer reads.
    // 132 since D2: nine Dominion cards that read a unit's rank or change a
    // rule of combat, and a new unit field, so a v131 log's picks name cards
    // this build never dealt.
    // 133 since D3: nine Dominion cards about pillaging and where a grant
    // lands, and a new record, so a v132 log's picks name cards this build
    // never dealt.
    // 134 since E0: the Expansionist deck is typed and its cards that need
    // no new shape are built, so a v133 log's picks and seatings name cards
    // and chairs this build deals and fits differently.
    // 135 since D4: twelve Dominion cards about unrest, the writ and the game's
    // records, and a new record, so a v134 log's picks name cards this build
    // never dealt.
    // 136 since E1: the Expansionist levy cards, three new fields and a new
    // end-of-turn phase, so a v135 log's picks name cards this build deals
    // differently and its resolutions run one phase fewer.
    // 137 since D5: fourteen Dominion cards that raise units or pay on new
    // moments, and a new record, so a v136 log's picks name cards this build
    // never dealt.
    // 138 since D6: eleven Dominion cards about captures, commissions and the
    // end of a war, and new records on wars, towns and seats, so a v137 log's
    // picks name cards this build never dealt.
    // 139 since E2: ten Expansionist cards about moments, records and counts,
    // two new town fields and a new end-of-turn phase, so a v138 log's picks
    // name cards this build deals differently and its resolutions run one
    // phase fewer.
    // 140 since E3: ten Expansionist cards about the land and two new tile
    // fields, so a v139 log's picks name cards this build deals differently.
    // 141 since E4: ten Expansionist cards about works, claims and borders,
    // and two new end-of-turn phases, so a v140 log's picks name cards this
    // build deals differently and its resolutions run two phases fewer.
    // 142 since D7: thirteen Dominion cards about economy rules and Double
    // Time, and a fourteenth step in a town's yields, so a v141 log's picks
    // name cards this build never dealt.
    // 143 since E5: eight cards about meters, commissions and the shared
    // militia, and a new town field, so a v142 log's picks name cards this
    // build deals differently.
    // 144 since the lake fix (L1): a lake is water like the coast, so pieces
    // path across lakes and a v143 log's moves meet a different board.
    // 145 since D8: the last eight Dominion Doctrines and a record of the
    // attacks made this turn, so a v144 log's Doctrine offers hold cards
    // this build deals differently.
    // 146 since E6: The Breadbasket and Veteran Colonies come live, so a v145
    // log's picks name cards this build deals differently.
    // 147 since the movement fixes (flags item xxxxxx): a landing is planned
    // only where the piece may stop, and a blocked march goes round, so a
    // v146 log's marches would walk different routes.
    // 148 since the take (flags item aaaaaaa): a pin may take a hex from
    // another town of the empire, so a v147 log is judged by a new rule.
    // 149 since the rung fix: the Order tiers open at the government tiers
    // (4, 10, 18 and 29 drafts), so a v148 log's hands from draft 10 on
    // come from a different tier.
    // 150 since Tier IV moved to 26 drafts (flags item ddddddd), with the
    // tier-29 governments, so a v149 log's drafts 26 to 28 deal differently.
    // 151 since the Order tiers open at their draft rung alone (flags item
    // eeeeeee), so a v150 log's hands from a seat ahead of its research age
    // come from a later tier.
    // 152 since the charter technologies (Scientific batch S0): thirteen
    // technologies join the tree and two Scientific cards come live, so a
    // v151 log's research and drafts meet a different tree and deck.
    // 153 since the line traits (Scientific batch S1): three Scientific
    // charters are dealt, so a v152 log's hands differ from the first draft.
    // 154 since the Scientific types and retirements (batch S1b): a
    // Scientific seat's pool loses eleven cards, and typed chairs refuse some
    // seat commands a v153 log holds.
    // 155 since Dominion batch D9: ten Dominion Orders and one Doctrine are
    // retired and one Order comes live, so a v154 log's Dominion hands and
    // Doctrine offers hold different cards.
    // 156 since Scientific batches S2 and S3 (the guildsmen, and readings
    // against the empires a seat has met): eight Orders come live, so a v155
    // log's Scientific and Commerce hands hold different cards.
    // 157 since Dominion batch D10: nine Dominion Orders come live and two
    // change, so a v156 log's Dominion hands hold different cards.
    // 158 since Scientific batch S4 (the building charters): eight Scientific
    // charters are dealt, and five buildings and the Physic Garden join the
    // tables, so a v157 log's Scientific hands hold different cards.
    // 159 since Dominion batches D11 and D12, which landed together. D11:
    // five Dominion Orders come live and one changes. D12: two Dominion
    // Orders come live, three change, and resource lines read the sight gate.
    // So a v158 log's Dominion hands hold different cards.
    // 160 since Scientific batch S5 (the learned land): the Surveyors' and
    // the Alchemists' Charters are dealt, eight more Scientific Orders come
    // live and The Assay is shared with Expansionist, so a v159 log's
    // Scientific and Expansionist hands hold different cards.
    // 161 since Dominion batches D13, D14 and D15, which landed together. D13:
    // The Limitanei comes live. D14 and D15: The Relay Stations,
    // Circumvallation and The Upstarts come live and Marine Drill becomes The
    // Longships. So a v160 log's Dominion hands hold different cards.
    // 162 since Scientific batch S6 (the research record): eleven more
    // Scientific Orders come live, so a v161 log's Scientific hands hold
    // different cards.
    // 163 since Scientific batch S7 (the data-only cards of Tiers 0 to II):
    // nine more Scientific Orders come live and three change, so a v162
    // log's Scientific hands hold different cards.
    // 164 since Scientific batch S8 (great people and the great houses):
    // eleven more Scientific Orders come live, so a v163 log's Scientific
    // hands hold different cards.
    // 165 since Expansionist batches E7 and E8, which landed together. E7
    // (the themes sheet): fifteen Expansionist rows are retired, ten change in
    // place and five change type. E8 (five new data-only cards): five more
    // Expansionist Orders come live. So a v164 log's Expansionist hands and
    // chairs hold different cards.
    // 166 since Scientific batch S9 (the army and the Opus): nine more
    // Scientific Orders and the shared The Soldier-Scholars come live, so a
    // v165 log's Scientific and Dominion hands hold different cards.
    // 167 since Expansionist batches E9 and E10, which landed together. E9
    // (the land): two more Expansionist Orders come live and a worker's burn
    // may mark an improved hex. E10 (the militia and the trades): two more
    // Expansionist Orders come live and a retired soldier pays a citizen. So a
    // v166 log's Expansionist hands, land and towns differ.
    // 168 since Expansionist batches E11 and E12, which landed together. E11
    // (public works and empire buildings): two more Expansionist Orders come
    // live and The Topping Out pays every town for an empire building. E12
    // (The Cura Aquarum): one more Expansionist Order comes live. So a v167
    // log's Expansionist hands and towns differ.
    // 169 since Commerce batch T1 (the sheet of record): eleven Commerce rows
    // are retired, four move to the shared file, fifteen change in place, and
    // every listed Commerce row carries a type. So a v168 log's Commerce hands
    // and chairs hold different cards.
    // 170 since Commerce batch T2 (the new data-only cards): eight new
    // Commerce cards are dealt, and the shared Merchant Scholars moves to
    // Tier III with new text. So a v169 log's Commerce and Scientific hands
    // hold different cards.
    // 171 since Commerce batch T7 (the pair cards): the shared The Art Dealers
    // is dealt and pays on a card drafted, and The Standing Army moves to the
    // shared file for Dominion and Commerce. So a v170 log's Commerce,
    // Magisterial and Dominion hands hold different cards.
    // 172 since Commerce batch T3 (routes and posts): four Commerce cards come
    // live, a post established is a new moment, a home route may pay its
    // origin, and The Admiralty of Trade's waiver widens. So a v171 log's
    // Commerce hands hold different cards.
    // 173 since Commerce batch T4 (the trade commissions): Commission: The
    // Great Fair is a new Commerce card, and The World's Fair has a new goal
    // and a reward that writes posts. So a v172 log's Commerce hands hold
    // different cards.
    // 174 since Commerce batch T5 (goods and deals): two counts read the
    // deal register, a lent luxury may still count for its lender, a
    // foreign post may lend a luxury, and five more Commerce cards are
    // dealt. So a v173 log's Commerce hands hold different cards.
    // 175 since Commerce batch T6 (the purse and the hoard): purchases may
    // go into debt under a credit line, a turn's end is a tally moment, a
    // bought unit may carry an upkeep waiver, and four more cards are dealt.
    // So a v174 log's Commerce hands hold different cards.
    // 177 since Magisterial batch MG1 (the sheet of record): the deck's
    // rows carry types, 64 rows are retired and four cards change in
    // place. Devotion batch DV1 took 176 for its own sheet of record. So a
    // v175 log's Devotion and Magisterial hands hold different cards.
    // 178 since Devotion batch DV2 (the new data-only cards): seven Devotion
    // cards and four shared cards are dealt, and the charter technology
    // Scholasticism opens the Cathedral and the Apostle early. So a v177
    // log's Devotion, Dominion and Scientific hands hold different cards.
    // 179 since Magisterial batch MG2 (the data-only cards of Tiers 0 and
    // I): fourteen Magisterial cards are dealt. So a v178 log's Magisterial
    // hands hold different cards.
    // 180 since Devotion batch DV3 (the engine's shapes): `Player.faithSpent`
    // joins the state, four Devotion cards and the shared The Rising Nave are
    // dealt, and The Creed counts gods. So a v179 log's Devotion and
    // Magisterial hands hold different cards.
    // 181 since Magisterial batch MG3 (the data-only cards of Tiers II to
    // IV): eleven Magisterial cards are new and dealt, and The Golden Age
    // and The Magister's Court leave `deferred`. So a v180 log's Magisterial
    // hands hold different cards.
    // 182 since Devotion batch DV4 (rites are seasons): a rite that acts at
    // once no longer counts as a rite started, a prophet's rite counts once
    // in each town it reaches, the Rite of the Sabbath is new, and three
    // Devotion cards are dealt. So a v181 log's Devotion hands hold
    // different cards.
    // 183 since Magisterial batch MG4 (the collection and the wonder
    // commissions): two counts, a commission figure and two tally occasions
    // are new, five Magisterial cards are dealt, and Travelling Players pays
    // for each deck among the seated cards. So a v182 log's Magisterial hands
    // hold different cards.
    // 184 since Devotion batch DV5 (the faith's reach): a founding can press
    // a lump of the founder's religion, The Confessors' sight rule and the
    // commission goal's `every` switch are new, and three Devotion cards
    // are dealt. So a v183 log's Devotion hands hold different cards.
    // 185 since Magisterial batch MG5 (the draft's price): an Order hand
    // keeps the culture it cost, the two draft moments carry that price, the
    // discount rule is new, and three Magisterial cards are dealt. So a v184
    // log's Magisterial hands hold different cards.
    // 186 since Devotion batch DV6 (a conversion as a moment): a foreign
    // town that turns pays a new moment, queued and paid when the pressing
    // ends, a town keeps the turn it last turned to each religion, and two
    // Devotion cards are dealt. So a v185 log's Devotion hands hold
    // different cards.
    // 187 since Magisterial batch MG6 (the hand): a card may refuse an Order
    // reroll, an offer rider may be counted, an Order may hand over a great
    // person when it is drafted, and three Magisterial cards are dealt. So a
    // v186 log's Magisterial hands hold different cards.
    // 188 since Devotion batch DV7 (the holy sites, the Opus and the
    // authority capstone): a card may set the price of an act of the clergy,
    // an apostle may raise a holy site, a rival's town that follows a
    // religion may stop its Opus, and four Devotion cards are dealt. So a
    // v187 log's Devotion hands hold different cards.
    // 189 since Magisterial batch MG7 (the council's moments): adopting a
    // government is a moment the cards pay on, a card may count the Doctrines
    // held, a commission may ask for a council in order and offer a Doctrine,
    // and three Magisterial cards are dealt. So a v188 log's Magisterial
    // hands hold different cards.
    // 190 since Devotion batch DV8 (the two largest rule-breakers): an enemy
    // soldier killed on the faith's ground may change sides, a town may keep
    // two rites, and two Devotion cards are dealt. So a v189 log's Devotion
    // hands hold different cards.
    // 191 since Magisterial batch MG8 (great people spent): spending a great
    // person is a moment the cards pay on, a rider may pay only while the
    // Magnum Opus is being built, a card may make each legacy count twice, a
    // commission may count the families of the works in your borders, and four
    // Magisterial and shared cards are dealt. So a v190 log's Magisterial and
    // Devotion hands hold different cards.
    // 192 since Magisterial batch MG9 (works on the land, and the wonder
    // towns): a great-person work may claim the unowned hexes beside it, a
    // unit may gain strength standing on a work, a commission may ask for one
    // town with wonders and worked works, a lost wonder race may move its
    // hammers on, and four Magisterial cards are dealt. So a v191 log's
    // Magisterial hands hold different cards.
    // 193 since Magisterial batch MG10 (the light capstones): a rider may pay
    // only for an Order hand that cost culture, an amplifier's share of a hex
    // line keeps the line's per-neighbour count, and three Magisterial cards
    // are dealt. So a v192 log's Magisterial hands hold different cards.
    // 194 since Magisterial batch MG11 (Magnificence): culture is a third
    // bank of the purchase verb, which a card opens to buy the wonder at the
    // front of a queue, and one Magisterial card is dealt. So a v193 log's
    // Magisterial hands hold different cards.
    // 195 since Magisterial batch MG12 (The Mixed Constitution): a card may
    // let every card of its holder fit every chair, the council is re-seated
    // at once when that card leaves, and one Magisterial card is dealt. So a
    // v194 log's Magisterial hands hold different cards.
    // 196 since Magisterial batch MG13 (The Universal Genius): a great
    // person may act and stay on the board to lay their work, marked by a
    // new unit field, and one Magisterial card is dealt. So a v195 log's
    // Magisterial hands hold different cards.
    // 197 since Magisterial batch MG14 (the boons): a card may hand over a
    // random card from a deck the seat does not hold, or pay yields when it
    // is drafted, and two Magisterial cards are dealt. So a v196 log's
    // Magisterial hands hold different cards.
    expect(SCHEMA_VERSION).toBe(197);
  });

  it('says in the changelog what a v110 log does now', () => {
    const source = simSource('state.ts');
    const entry = source.slice(source.indexOf(' * v111 ('), source.indexOf('export const SCHEMA_VERSION'));
    expect(entry).toContain('v111 (batch S2');
    // The template every entry keeps: the user's own words, and what a log from
    // the version before does about it.
    expect(entry).toContain('A v110 log replays');
    expect(entry).toContain('techProgress');
    expect(entry).toContain('itemProgress');
  });
});

// --- beakers ----------------------------------------------------------------

describe('beakers stay with the technology they were spent on', () => {
  it('parks the old node’s progress and starts the new one at nought', () => {
    const { state } = game();
    const player = playerById(state, 0)!;
    expect(applyCommand(state, chooseResearch('mining'))).toEqual({ ok: true });
    player.sciencePool = 40;
    bumpRevision(state);

    expect(applyCommand(state, chooseResearch('earthenware'))).toEqual({ ok: true });
    expect(player.researching).toBe('earthenware');
    expect(player.sciencePool).toBe(0);
    expect(bankedTowardTech(player, 'mining')).toBe(40);
    expect(bankedTowardTech(player, 'earthenware')).toBe(0);
  });

  it('finds the bucket where it was left when the empire comes back', () => {
    const { state } = game();
    const player = playerById(state, 0)!;
    applyCommand(state, chooseResearch('mining'));
    player.sciencePool = 40;
    bumpRevision(state);
    applyCommand(state, chooseResearch('earthenware'));
    player.sciencePool = 7;
    bumpRevision(state);

    // Both buckets stand, and each holds exactly what it was left with.
    applyCommand(state, chooseResearch('mining'));
    expect(player.sciencePool).toBe(40);
    expect(bankedTowardTech(player, 'earthenware')).toBe(7);
    // And no beaker is in two places at once.
    expect(bankedTowardTech(player, 'mining') + bankedTowardTech(player, 'earthenware')).toBe(47);
  });

  it('sweeps the bucket the moment the node lands, and keeps the overflow', () => {
    const { state } = game();
    const player = playerById(state, 0)!;
    applyCommand(state, chooseResearch('mining'));
    const cost = techDef('mining').cost;
    player.sciencePool = cost + 5;
    bumpRevision(state);

    advanceResearch(state);
    expect(player.techsResearched).toContain('mining');
    // The overflow is not progress toward anything — it was never spent on the
    // node that landed — so it stays in the pool for whatever comes up next.
    expect(player.sciencePool).toBe(5);
    expect(bankedTowardTech(player, 'mining')).toBe(0);
    expect(player.techProgress).toBeUndefined();
  });

  it('carries an unaimed pool into the first thing it is aimed at', () => {
    const { state } = game();
    const player = playerById(state, 0)!;
    // A seat that has chosen nothing still banks (the model note in `tech.ts`),
    // and those beakers have no node's name on them yet.
    player.researching = null;
    delete player.researchQueue;
    player.sciencePool = 12;
    bumpRevision(state);
    applyCommand(state, chooseResearch('mining'));
    expect(player.sciencePool).toBe(12);
  });
});

// --- hammers ----------------------------------------------------------------

describe('hammers stay with the thing they were spent on', () => {
  it('parks the old front row’s basket and starts the new one at nought', () => {
    const { state } = game();
    const city = found(state, 0);
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    city.hammerBasket = 18;
    bumpRevision(state);

    expect(
      applyCommand(state, setProduction(city.id, [{ kind: 'unit', id: 'worker' }])),
    ).toEqual({ ok: true });
    expect(city.hammerBasket).toBe(0);
    expect(bankedTowardItem(city, { kind: 'unit', id: 'warrior' })).toBe(18);
    expect(bankedTowardItem(city, { kind: 'unit', id: 'worker' })).toBe(0);
  });

  it('finds the bucket where it was left when the town comes back', () => {
    const { state } = game();
    const city = found(state, 0);
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    city.hammerBasket = 18;
    bumpRevision(state);
    applyCommand(state, setProduction(city.id, [{ kind: 'unit', id: 'worker' }]));
    city.hammerBasket = 4;
    bumpRevision(state);

    applyCommand(state, setProduction(city.id, [{ kind: 'unit', id: 'warrior' }]));
    expect(city.hammerBasket).toBe(18);
    expect(bankedTowardItem(city, { kind: 'unit', id: 'worker' })).toBe(4);
  });

  it('keeps a row’s progress while it merely stands further back in the queue', () => {
    const { state } = game();
    const city = found(state, 0);
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    city.hammerBasket = 18;
    bumpRevision(state);

    // The warrior is still in the plan — it is just not what the town is paying
    // for this turn — and the rule is about what is being paid for.
    applyCommand(
      state,
      setProduction(city.id, [
        { kind: 'unit', id: 'worker' },
        { kind: 'unit', id: 'warrior' },
      ]),
    );
    expect(city.hammerBasket).toBe(0);
    expect(city.itemProgress?.[queueItemKey({ kind: 'unit', id: 'warrior' })]).toBe(18);
    // And the estimate on the row behind counts it, so the panel and the bank
    // cannot disagree about how far along a queued thing is.
    const quoted = turnsToBuild(state, city, { kind: 'unit', id: 'warrior' }, 1);
    const cold = turnsToBuild(state, city, { kind: 'unit', id: 'archer' }, 1);
    expect(quoted === null || cold === null || quoted <= cold).toBe(true);
  });

  it('sends the overflow of a completion after the queue, not after the thing', () => {
    const { state } = game();
    const city = found(state, 0);
    city.queue = [
      { kind: 'unit', id: 'warrior' },
      { kind: 'unit', id: 'worker' },
    ];
    // Enough for the warrior and five hammers over.
    const cost = turnsToBuild(state, city, { kind: 'unit', id: 'warrior' }, 0);
    expect(cost).not.toBeNull();
    city.hammerBasket = 10_000;
    bumpRevision(state);

    const done = settleProduction(state, city);
    expect(done?.name).toBe('Warrior');
    // The remainder was never spent toward the warrior, so it pays for the
    // worker rather than being parked under a warrior nobody is building.
    expect(city.hammerBasket).toBeGreaterThan(0);
    expect(bankedTowardItem(city, { kind: 'unit', id: 'warrior' })).toBe(0);
  });

  it('accumulates a project’s own bucket, because a project never spends one down', () => {
    const { state } = game();
    const city = found(state, 0);
    city.queue = [{ kind: 'project', id: 'tithes' }];
    city.hammerBasket = 9;
    bumpRevision(state);

    applyCommand(state, setProduction(city.id, [{ kind: 'unit', id: 'warrior' }]));
    expect(bankedTowardItem(city, { kind: 'project', id: 'tithes' })).toBe(9);

    // Back to the conversion, add more, put it down again: one accumulator.
    // The conversion is queued through the seam rather than the reducer, because
    // a project waits on a technology this bench's empire has not learnt and the
    // rule under test is about the *bucket*, not about the gate.
    const back = frontKey(city);
    city.queue = [{ kind: 'project', id: 'tithes' }];
    reaimProduction(city, back, true);
    bumpRevision(state);
    expect(city.hammerBasket).toBe(9);
    city.hammerBasket += 6;
    bumpRevision(state);
    applyCommand(state, setProduction(city.id, [{ kind: 'unit', id: 'warrior' }]));
    expect(bankedTowardItem(city, { kind: 'project', id: 'tithes' })).toBe(15);
  });

  it('leaves a captured town none of the old owner’s committed work', () => {
    const { state } = game();
    const city = found(state, 0);
    city.queue = [
      { kind: 'unit', id: 'warrior' },
      { kind: 'unit', id: 'worker' },
    ];
    city.hammerBasket = 18;
    bumpRevision(state);
    applyCommand(state, setProduction(city.id, [{ kind: 'unit', id: 'worker' }]));
    expect(city.itemProgress).toBeDefined();

    // `handOverCity` empties the queue and the basket; the buckets behind them
    // are the same plans said one step further back and go with them.
    const source = simSource('combat.ts');
    const seam = source.slice(source.indexOf('export function handOverCity'));
    expect(seam.slice(0, seam.indexOf('\n}\n'))).toContain('delete city.itemProgress');
  });
});

// --- the seams --------------------------------------------------------------

describe('the two seams are the only ways progress changes hands', () => {
  it('moves the aim through `aimResearchAt` and nowhere else', () => {
    const source = simSource('tech.ts');
    // `settleResearch` is the one excused write, and it says why on the line
    // above itself. Every other `researching =` in the file would be a way to
    // strand a bucket.
    const writes = source.split('player.researching = ').length - 1;
    expect(writes).toBe(2);
    expect(source).toContain('The one excused write of `researching`');
  });

  it('re-heads a queue through `reaimProduction` at every seam that moves one', () => {
    for (const file of ['commands.ts', 'cities.ts', 'purchase.ts']) {
      expect(simSource(file), file).toContain('reaimProduction(city, before');
    }
  });
});

// --- the properties ---------------------------------------------------------

describe('the properties every command owes', () => {
  it('leaves the state byte-identical when a switch is refused', () => {
    const g = game();
    const city = found(g.state, 0);
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    city.hammerBasket = 18;
    bumpRevision(g.state);
    const before = snapshotState(g.state);
    const result = dispatch(g, setProduction(city.id, [{ kind: 'unit', id: 'nosuchunit' }]));
    expect(result.ok).toBe(false);
    expect(snapshotState(g.state)).toBe(before);
  });

  it('replays a log of switches to the same bytes', () => {
    const g = game();
    const city = found(g.state, 0);
    city.hammerBasket = 0;
    bumpRevision(g.state);
    dispatch(g, setProduction(city.id, [{ kind: 'unit', id: 'warrior' }]));
    dispatch(g, chooseResearch('mining'));
    g.state.players[0]!.sciencePool = 25;
    dispatch(g, chooseResearch('earthenware'));
    dispatch(g, setProduction(city.id, [{ kind: 'unit', id: 'worker' }]));
    const once = snapshotState(g.state);

    const replay = game();
    const town = found(replay.state, 0);
    town.hammerBasket = 0;
    bumpRevision(replay.state);
    dispatch(replay, setProduction(town.id, [{ kind: 'unit', id: 'warrior' }]));
    dispatch(replay, chooseResearch('mining'));
    replay.state.players[0]!.sciencePool = 25;
    dispatch(replay, chooseResearch('earthenware'));
    dispatch(replay, setProduction(town.id, [{ kind: 'unit', id: 'worker' }]));
    expect(snapshotState(replay.state)).toBe(once);
  });
});
