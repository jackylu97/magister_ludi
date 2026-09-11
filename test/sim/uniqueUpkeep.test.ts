/**
 * **What a unit the tree does not name costs to keep** — the user's ruling of
 * 2026-09-11, `docs/flags.md` (qqqq) point 3.
 *
 * The finding L3b left behind: `unitUpkeep` prices an army by the age of the
 * node that unlocks it ("the price is the age", `upkeep.ts`' own docblock), and
 * **no technology names a leader's unique** — all ten are dealt by a card. Every
 * figure's own soldier was therefore free to keep for ever, a discount nobody
 * designed and one a player could not see. The ruling: a unit no technology
 * names is priced by the age of *the row that opens it*.
 *
 * Three claims, and the shape of the file is the three:
 *
 *   · **the uniques are priced, and priced as their age** — every
 *     `unlockedByLeader` row costs something, and costs exactly what its deck
 *     row's age costs, which is the only reading that makes the pins the ruling
 *     named ("the Fubing costs what a same-age spearman costs") true by
 *     construction rather than by coincidence;
 *   · **nothing else moved** — a plain tech-named row is priced today exactly as
 *     it was, off the tree, and the three exemptions still exempt;
 *   · **the fallback is a fallback** — `ageThatOpens` answers off the deck where
 *     a card opens the row and off the row's own column where nothing does, and
 *     `unitUpkeep` asks it only after the tree has said nothing.
 *
 * The tables are walked rather than listed: a leader's eleventh unique joins
 * these pins by being added to `data/leaders.json`, which is the whole of what
 * "nothing compares a type against a name" buys.
 *
 * **Core, not slow**: it reads the tables and calls two pure functions. No
 * board, no seed, no turn.
 */

import { describe, expect, it } from 'vitest';

import {
  LEADER_CARD_IDS,
  ageThatOpens,
  leaderCard,
  leaderCardHome,
} from '../../src/sim/leaderData';
import { RULES } from '../../src/sim/rulesData';
import { TECH_AGES, UNIT_UNLOCK_TECH, techAgeBands, techDef } from '../../src/sim/techData';
import { unitUpkeep, unitUpkeepOf } from '../../src/sim/upkeep';
import {
  UNIT_TYPE_IDS,
  type UnitTypeId,
  isCivilian,
  isExplorer,
  trades,
  unitDef,
} from '../../src/sim/unitData';

/** What one age of seniority is worth on the payroll, from the file that tunes it. */
const PER_AGE = RULES.upkeep.goldPerUnitAge;

/**
 * Every unit a figure's deck opens, paired with the age of the row that opens
 * it — read off `data/leaders.json` rather than written down here, so the pins
 * below are claims about the rule and not a second copy of the table.
 */
const OPENED_BY_A_DECK: { type: UnitTypeId; age: number; card: string }[] = LEADER_CARD_IDS.flatMap(
  (id) => {
    const opened = leaderCard(id).unlocks?.unit;
    if (opened === undefined) return [];
    return [{ type: opened, age: Number(leaderCardHome(id).age), card: id }];
  },
);

describe('a unique is priced by the age of the row that opens it', () => {
  it('walks every leader-dealt unit and finds none of them free', () => {
    // The ten the finding counted. A walk that found nothing would be a walk
    // reading the wrong shape.
    expect(OPENED_BY_A_DECK.length).toBeGreaterThanOrEqual(10);
    for (const { type, age, card } of OPENED_BY_A_DECK) {
      // The tree really does say nothing — which is the whole premise.
      expect(UNIT_UNLOCK_TECH.get(type), `${type} is named by a technology after all`).toBe(
        undefined,
      );
      expect(unitUpkeep(type), `${unitDef(type).name} (${card}) is kept for nothing`).toBe(
        age * PER_AGE,
      );
      expect(unitUpkeep(type)).toBeGreaterThan(0);
    }
  });

  it('also covers every row carrying the marker, however it was opened', () => {
    // `unlockedByLeader` is the roster's own marker; the walk above is the
    // decks'. They must agree, and neither may leave a soldier free.
    const marked = UNIT_TYPE_IDS.filter((type) => unitDef(type).unlockedByLeader === true);
    expect(marked.length).toBeGreaterThanOrEqual(10);
    for (const type of marked) {
      expect(unitUpkeep(type), `${unitDef(type).name} is kept for nothing`).toBeGreaterThan(0);
    }
    expect([...marked].sort()).toEqual([...OPENED_BY_A_DECK.map((row) => row.type)].sort());
  });

  it('costs what a soldier of the same age costs — the Fubing and the Khopesh', () => {
    // The ruling's own two pins. The comparison rows are named by the *tree*, so
    // each is "what an empire pays for an ordinary soldier of that age" read the
    // ordinary way, and the claim is that the unique is not special.
    expect(techDef(UNIT_UNLOCK_TECH.get('spearman')!).age).toBe(1);
    expect(unitUpkeep('fubing')).toBe(unitUpkeep('spearman'));

    expect(techDef(UNIT_UNLOCK_TECH.get('swordsman')!).age).toBe(2);
    expect(unitUpkeep('khopesh')).toBe(unitUpkeep('swordsman'));

    // And the two are not the same figure, or the pair would prove nothing.
    expect(unitUpkeep('khopesh')).toBeGreaterThan(unitUpkeep('fubing'));
  });
});

describe('nothing the tree already named has moved', () => {
  it('prices every tech-named row off its node, exactly as before', () => {
    for (const type of UNIT_TYPE_IDS) {
      const tech = UNIT_UNLOCK_TECH.get(type);
      if (tech === undefined) continue;
      const def = unitDef(type);
      // The three exemptions are the docblock's and are asked first, so this
      // walk is about the soldiers. Asked through the roster's own predicates,
      // never off the raw fields — a scout is an explorer by what it *does*.
      if (isCivilian(def) || isExplorer(def) || trades(def)) continue;
      expect(unitUpkeep(type), `${def.name}`).toBe(techDef(tech).age * PER_AGE);
    }
    // The plain rows the ruling named, spelled out so the walk above cannot
    // pass by finding nothing to walk.
    expect(unitUpkeep('warrior')).toBe(1 * PER_AGE);
    expect(unitUpkeep('swordsman')).toBe(2 * PER_AGE);
    expect(unitUpkeep('legionary')).toBe(3 * PER_AGE);
    expect(unitUpkeep('knight')).toBe(4 * PER_AGE);
  });

  it('keeps the three exemptions exempt', () => {
    // A settler and a worker are people, a scout is sent out to look, and a
    // caravan is the thing that pays — `upkeep.ts`' three sentences. None of
    // them gains a bill because a second source of ages arrived.
    expect(unitUpkeep('settler')).toBe(0);
    expect(unitUpkeep('worker')).toBe(0);
    expect(unitUpkeep('scout')).toBe(0);
    expect(unitUpkeep('trader')).toBe(0);
    // The great person is a civilian and needs no clause of its own, which is
    // the claim the ruling could have broken: it carries a `column` and the new
    // fallback reads columns.
    expect(unitUpkeep('greatPerson')).toBe(0);
    expect(unitUpkeep('prophet')).toBe(0);
  });

  it('still charges nothing for a piece the empire never paid for', () => {
    // `Unit.freeUpkeep`, the one exemption on the *piece*. A free fubing is now
    // a free piece of a row that costs something, which is exactly the case the
    // split between the two readings exists for.
    const piece = { type: 'fubing' as UnitTypeId, freeUpkeep: true };
    expect(unitUpkeepOf(piece as never)).toBe(0);
    expect(unitUpkeepOf({ type: 'fubing' } as never)).toBe(unitUpkeep('fubing'));
  });
});

describe('ageThatOpens — the deck first, the row’s own column after', () => {
  it('answers a unique off its deck row', () => {
    for (const { type, age } of OPENED_BY_A_DECK) expect(ageThatOpens(type)).toBe(age);
  });

  it('falls to the column’s band where no card dates the row', () => {
    // The Knights Templar are opened by a belief, and a belief carries no age —
    // so the row's own `column` answers, through the chart's bands.
    expect(UNIT_UNLOCK_TECH.get('knightsTemplar')).toBe(undefined);
    const column = unitDef('knightsTemplar').column!;
    const band = techAgeBands().find((run) => column >= run.from && column <= run.to);
    expect(band).toBeDefined();
    expect(ageThatOpens('knightsTemplar')).toBe(band!.age);
    expect(unitUpkeep('knightsTemplar')).toBe(band!.age * PER_AGE);
  });

  it('never answers with an age the chart does not have', () => {
    for (const type of UNIT_TYPE_IDS) {
      const age = ageThatOpens(type);
      if (age === undefined) continue;
      expect(TECH_AGES).toContain(age);
    }
  });

  it('is asked only after the tree, so a node still wins', () => {
    // A row the tree names carries a column too, and the two readings could
    // disagree. `unitUpkeep` asks the node first and this is that order, stated:
    // the knight is priced by Militant Orders, whatever column its row carries.
    const tech = UNIT_UNLOCK_TECH.get('knight')!;
    expect(unitUpkeep('knight')).toBe(techDef(tech).age * PER_AGE);
  });
});
