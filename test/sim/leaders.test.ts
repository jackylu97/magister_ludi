/**
 * **The leader system in the simulation** — batch L2a, `docs/flags.md` (dddd),
 * spec of record `docs/leaders.md`.
 *
 * A leader is two things and this file pins both. The **bonus** is one line the
 * seat holds from the turn it sits down; the **deck** is four rows of three
 * cards, dealt when *this seat's* age turns, one taken and the other two gone.
 * Everything below is a claim about one of those two halves:
 *
 *   · the row is on the table with the board, and the next row follows the
 *     seat's **own** age rather than the world's;
 *   · the debt is a blocker, the pick is a command, and a refused command leaves
 *     the state byte-identical (hard rule 1);
 *   · a passive joins the law, a boon pays once, a unique opens a row that seat
 *     and nobody else may build;
 *   · a game with no figures in its roster is untouched by any of it;
 *   · the bots answer, and never stall;
 *   · every card's declared effects are read by the evaluator, and every card
 *     that declares nothing says why (the deck register);
 *   · the sheet and the doc agree — the four rows of three, and (batch L5) the
 *     towns the figure founds, name for name and in order;
 *   · the book has a shelf.
 */

import { describe, expect, it } from 'vitest';

import { nextBotCommand, nextBotDecision } from '../../src/ai/bot';
import { buildingDef } from '../../src/sim/buildingData';
import { foundCityAt } from '../../src/sim/cities';
import { getTileAt } from '../../src/sim/map';
import { type Command } from '../../src/sim/commands';
import { dispatch, snapshotState } from '../../src/sim/game';
import {
  LEADER_CARD_IDS,
  LEADER_DECK_AGES,
  LEADER_IDS,
  type LeaderCard,
  type LeaderId,
  leaderCard,
  leaderCardEffects,
  leaderDef,
} from '../../src/sim/leaderData';
import {
  chooseLeaderCardError,
  heldLeaderCards,
  leaderAgeOwed,
  leaderBlocker,
  leaderDeckCards,
  runLeaderDraft,
} from '../../src/sim/leaders';
import { OCCASIONS } from '../../src/sim/occasions';
import { type GameState, bumpRevision, playerById } from '../../src/sim/state';
import { liveEffects } from '../../src/sim/statecraft';
import { isUnlocked } from '../../src/sim/tech';
import { TECH_IDS, type TechAge, techDef } from '../../src/sim/techData';
import { unitDef } from '../../src/sim/unitData';
import { firstBlocker } from '../../src/ui/turnBlockers';
import { compendiumSections } from '../../src/ui/compendium';
import { createGame } from '../../src/sim/game';

// --- the bench --------------------------------------------------------------

const EVALUATOR_SOURCE = (
  import.meta.glob('../../src/sim/statecraft/evaluator.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>
)['../../src/sim/statecraft/evaluator.ts']!;

const LEADER_DATA_SOURCE = (
  import.meta.glob('../../src/sim/leaderData.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>
)['../../src/sim/leaderData.ts']!;

/**
 * A two-seat game whose seats play figures, **both capitals founded**.
 *
 * The founding is the bench and not the test: a leader's row is on the table
 * from the first turn but nobody may answer it until their realm has a town for
 * a boon to land in (`leaderBlocker`'s second clause), so a bench that skipped
 * it would be testing the wait rather than the draft. `raw` is the same game
 * before anybody founds anything, for the two tests that are about the wait.
 */
function raw(first?: LeaderId, second?: LeaderId, seed = 11) {
  return createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true, ...(first ? { leader: first } : {}) },
      { name: 'Bors', color: '#3a7fe8', ...(second ? { leader: second } : {}) },
    ],
  });
}

function game(first?: LeaderId, second?: LeaderId, seed = 11) {
  const g = raw(first, second, seed);
  for (const playerId of [0, 1]) {
    const settler = g.state.units.find(
      (unit) => unit.ownerId === playerId && unitDef(unit.type).foundsCity,
    )!;
    foundCityAt(g.state, playerId, getTileAt(g.state.map, settler.col, settler.row)!);
  }
  return g;
}

/** The lowest technology of an age, so a seat can be walked into one. */
function techOfAge(age: TechAge): string {
  return TECH_IDS.find((id) => techDef(id).age === age)!;
}

/**
 * Walks a seat into an age by fiat. The draft's input is `highestAge`.
 *
 * A bench poke, so it announces (`bumpRevision`) the way a command does — the
 * tree is one of the ten sources of the law, and a memo that outlived the push
 * would be right about a board that no longer exists.
 */
function enterAge(state: GameState, playerId: number, age: TechAge): void {
  const player = playerById(state, playerId)!;
  player.techsResearched.push(techOfAge(age) as never);
  bumpRevision(state);
}

function pick(playerId: number, index: number): Command {
  return { type: 'chooseLeaderCard', playerId, index } as Command;
}

/** Every card of every deck, flattened. The register's own subject. */
function everyCard(): { leader: LeaderId; card: LeaderCard }[] {
  return LEADER_IDS.flatMap((leader) =>
    leaderDeckCards(leader).map((card) => ({ leader, card })),
  );
}

// --- the bonus --------------------------------------------------------------

describe('a leader’s own line', () => {
  it('is live from the first turn, before anything has been drafted', () => {
    const g = game('pachacuti');
    const seat = playerById(g.state, 0)!;
    expect(seat.leader).toBe('pachacuti');
    expect(heldLeaderCards(seat)).toEqual([]);

    const mine = liveEffects(g.state, 0).filter((entry) => entry.card === 'pachacuti');
    expect(mine.length).toBe(leaderDef('pachacuti').bonus.effects.length);
    expect(mine.length).toBeGreaterThan(0);
    // And it belongs to the seat that plays the figure, not to the table.
    expect(liveEffects(g.state, 1).some((entry) => entry.card === 'pachacuti')).toBe(false);
  });

  it('says the same thing for every figure the sheet carries', () => {
    for (const id of LEADER_IDS) {
      const g = game(id);
      const mine = liveEffects(g.state, 0).filter((entry) => entry.card === id);
      expect(mine.length, id).toBe(leaderDef(id).bonus.effects.length);
    }
  });
});

// --- the offer --------------------------------------------------------------

describe('the row a figure deals', () => {
  it('is on the table with the board, and it is Æra I’s', () => {
    const g = game('taizong', 'modu');
    for (const [seat, leader] of [
      [0, 'taizong'],
      [1, 'modu'],
    ] as const) {
      const offer = playerById(g.state, seat)!.leaderOffer!;
      expect(offer.age).toBe(1);
      expect(offer.turn).toBe(g.state.turn);
      expect(offer.cards).toEqual(leaderDef(leader).deck['1'].map((card) => card.id));
    }
  });

  it('follows the seat’s own age, never the world’s', () => {
    const g = game('taizong', 'modu');
    // Both seats answer the opening row so neither is holding one.
    expect(dispatch(g, pick(0, 0)).ok).toBe(true);
    expect(dispatch(g, pick(1, 0)).ok).toBe(true);
    expect(playerById(g.state, 0)!.leaderOffer).toBeUndefined();

    // One seat alone crosses into Æra II. The world has not moved.
    enterAge(g.state, 0, 2);
    runLeaderDraft(g.state);

    expect(playerById(g.state, 0)!.leaderOffer!.age).toBe(2);
    expect(playerById(g.state, 1)!.leaderOffer).toBeUndefined();
    expect(leaderAgeOwed(playerById(g.state, 1)!)).toBeNull();
  });

  it('deals the lowest age it owes, so a seat that skips ahead skips nothing', () => {
    const g = game('akhenaten');
    // Straight into Æra III with the opening row still unanswered.
    enterAge(g.state, 0, 3);
    runLeaderDraft(g.state);
    expect(playerById(g.state, 0)!.leaderOffer!.age).toBe(1);

    expect(dispatch(g, pick(0, 1)).ok).toBe(true);
    runLeaderDraft(g.state);
    expect(playerById(g.state, 0)!.leaderOffer!.age).toBe(2);
  });

  it('never deals a second row on top of an unanswered one', () => {
    const g = game('almamun');
    const before = snapshotState(g.state);
    enterAge(g.state, 0, 4);
    runLeaderDraft(g.state);
    runLeaderDraft(g.state);
    expect(playerById(g.state, 0)!.leaderOffer!.age).toBe(1);
    // The only thing that moved is the technology the bench pushed on.
    expect(before).not.toBe(snapshotState(g.state));
  });

  it('is announced, and the word is in the shared vocabulary', () => {
    expect(OCCASIONS).toContain('leaderOffered');
    const g = game('mithridates');
    expect(dispatch(g, pick(0, 0)).ok).toBe(true);
    enterAge(g.state, 0, 2);
    const report = runLeaderDraft(g.state);
    expect(report.opened).toEqual([{ playerId: 0, age: 2 }]);
  });
});

// --- the blocker and the command --------------------------------------------

describe('the debt and the answer', () => {
  it('blocks End Turn until the row is answered', () => {
    const g = game('pachacuti');
    expect(leaderBlocker(g.state, 0)).not.toBeNull();
    expect(firstBlocker(g.state, 0)).toEqual({ kind: 'leaderDraft' });

    expect(dispatch(g, pick(0, 0)).ok).toBe(true);
    expect(leaderBlocker(g.state, 0)).toBeNull();
    expect(firstBlocker(g.state, 0)).not.toEqual({ kind: 'leaderDraft' });
  });

  it('waits on the first city, and loses nothing while it waits', () => {
    const g = raw('akhenaten');
    // The row is on the table from the first turn…
    expect(playerById(g.state, 0)!.leaderOffer!.age).toBe(1);
    // …and cannot be answered until there is a realm for a boon to land in.
    expect(leaderBlocker(g.state, 0)).toBeNull();
    expect(firstBlocker(g.state, 0)).not.toEqual({ kind: 'leaderDraft' });
    expect(chooseLeaderCardError(g.state, 0, 1)).not.toBeNull();
    const before = snapshotState(g.state);
    expect(dispatch(g, pick(0, 1)).ok).toBe(false);
    expect(snapshotState(g.state)).toBe(before);

    const settler = g.state.units.find(
      (unit) => unit.ownerId === 0 && unitDef(unit.type).foundsCity,
    )!;
    foundCityAt(g.state, 0, getTileAt(g.state.map, settler.col, settler.row)!);
    expect(leaderBlocker(g.state, 0)).not.toBeNull();
    expect(dispatch(g, pick(0, 1)).ok).toBe(true);
  });

  it('leaves the state byte-identical when the index is refused', () => {
    const g = game('pachacuti');
    for (const index of [-1, 3, 99, 1.5]) {
      const before = snapshotState(g.state);
      const result = dispatch(g, pick(0, index));
      expect(result.ok, `index ${index}`).toBe(false);
      expect(snapshotState(g.state), `index ${index}`).toBe(before);
      expect(g.log.length).toBe(0);
    }
    // And so does a seat with nothing on its table.
    expect(dispatch(g, pick(0, 0)).ok).toBe(true);
    const spent = snapshotState(g.state);
    expect(dispatch(g, pick(0, 1)).ok).toBe(false);
    expect(snapshotState(g.state)).toBe(spent);
  });

  it('refuses a seat with no figure at all, and the wild', () => {
    const g = game(undefined, undefined);
    expect(chooseLeaderCardError(g.state, 0, 0)).not.toBeNull();
    expect(dispatch(g, pick(0, 0)).ok).toBe(false);
  });

  it('spends the row: the other two are gone', () => {
    const g = game('taizong');
    const offer = playerById(g.state, 0)!.leaderOffer!;
    expect(dispatch(g, pick(0, 2)).ok).toBe(true);
    const seat = playerById(g.state, 0)!;
    expect(seat.leaderPicks).toEqual({ 1: offer.cards[2] });
    expect(seat.leaderOffer).toBeUndefined();
    expect(heldLeaderCards(seat)).toEqual([offer.cards[2]]);
  });
});

// --- what a card does -------------------------------------------------------

describe('a card taken', () => {
  it('puts a passive into the law and keeps it there', () => {
    const g = game('pachacuti');
    const card = leaderDef('pachacuti').deck['1'][0];
    expect(card.kind).toBe('passive');
    expect(liveEffects(g.state, 0).some((entry) => entry.card === card.id)).toBe(false);

    expect(dispatch(g, pick(0, 0)).ok).toBe(true);
    const mine = liveEffects(g.state, 0).filter((entry) => entry.card === card.id);
    expect(mine.length).toBe(leaderCardEffects(card).length);
    expect(mine.length).toBeGreaterThan(0);
  });

  it('pays a boon once, and there is no second helping', () => {
    // Al-Ma'mun's Æra III boon is a lump of renown, which is a bank a test can
    // read straight off the seat.
    const g = game('almamun');
    for (const age of [1, 2] as const) {
      void age;
      expect(dispatch(g, pick(0, 0)).ok).toBe(true);
      enterAge(g.state, 0, (age + 1) as TechAge);
      runLeaderDraft(g.state);
    }
    const offer = playerById(g.state, 0)!.leaderOffer!;
    expect(offer.age).toBe(3);
    const boon = leaderCard(offer.cards[1]);
    expect(boon.kind).toBe('boon');
    expect(boon.boon?.windfall?.yield).toBe('renown');

    const before = playerById(g.state, 0)!.renownEarned;
    expect(dispatch(g, pick(0, 1)).ok).toBe(true);
    const after = playerById(g.state, 0)!.renownEarned;
    expect(after).toBeGreaterThan(before);

    // The row is spent, so nothing can pay it a second time.
    expect(dispatch(g, pick(0, 1)).ok).toBe(false);
    expect(playerById(g.state, 0)!.renownEarned).toBe(after);
  });

  it('reports what a boon handed over the way a wonder’s completion does', () => {
    // Akhenaten's Æra I boon grants a prophet — a `CompletionGrant`, so it comes
    // back out on `CommandResult.grants`.
    const g = game('akhenaten');
    const offer = playerById(g.state, 0)!.leaderOffer!;
    expect(leaderCard(offer.cards[1]).boon?.grants?.[0]?.grant).toBe('unit');
    const result = dispatch(g, pick(0, 1));
    expect(result.ok).toBe(true);
    expect(result.ok && result.grants?.[0]?.grant).toBe('unit');
    expect(result.ok && result.grants?.[0]?.done).toBe(true);
  });

  it('opens a unique for the seat that took it, and for nobody else', () => {
    const g = game('pachacuti', 'pachacuti');
    const card = leaderDef('pachacuti').deck['1'][2];
    expect(card.kind).toBe('unique');
    const building = card.unlocks!.building!;
    expect(buildingDef(building).unlockedByLeader).toBe(true);

    // Nobody may build it before the card is taken — the marker's whole job.
    expect(isUnlocked(g.state, 0, 'building', building)).toBe(false);
    expect(isUnlocked(g.state, 1, 'building', building)).toBe(false);

    expect(dispatch(g, pick(0, 2)).ok).toBe(true);
    expect(isUnlocked(g.state, 0, 'building', building)).toBe(true);
    // The other seat plays the same figure and did not take the card.
    expect(isUnlocked(g.state, 1, 'building', building)).toBe(false);
  });

  it('opens a unique soldier on exactly the same terms', () => {
    const g = game('modu', 'modu');
    const card = leaderDef('modu').deck['1'][2];
    const unit = card.unlocks!.unit!;
    expect(unitDef(unit).unlockedByLeader).toBe(true);
    expect(isUnlocked(g.state, 0, 'unit', unit)).toBe(false);
    expect(dispatch(g, pick(0, 2)).ok).toBe(true);
    expect(isUnlocked(g.state, 0, 'unit', unit)).toBe(true);
    expect(isUnlocked(g.state, 1, 'unit', unit)).toBe(false);
  });
});

// --- a game with no figures in it -------------------------------------------

describe('a leaderless roster', () => {
  it('carries no key, owes no debt, and the phase does nothing to it', () => {
    const g = game(undefined, undefined);
    const raw = snapshotState(g.state);
    expect(raw.includes('"leader"')).toBe(false);
    expect(raw.includes('"leaderOffer"')).toBe(false);
    expect(raw.includes('"leaderPicks"')).toBe(false);

    expect(leaderBlocker(g.state, 0)).toBeNull();
    expect(firstBlocker(g.state, 0)).not.toEqual({ kind: 'leaderDraft' });

    const report = runLeaderDraft(g.state);
    expect(report.opened).toEqual([]);
    expect(snapshotState(g.state)).toBe(raw);
  });

  it('folds not one line of a leader into its law', () => {
    const g = game(undefined, undefined);
    for (const entry of liveEffects(g.state, 0)) {
      expect(LEADER_IDS.includes(entry.card as LeaderId)).toBe(false);
      expect(LEADER_CARD_IDS.includes(entry.card as never)).toBe(false);
    }
  });
});

// --- the bots ---------------------------------------------------------------

describe('the bots', () => {
  it('answer the row rather than stalling on it', () => {
    const g = game('mithridates', 'mithridates');
    const command = nextBotCommand(g.state, 1);
    expect(command?.type).toBe('chooseLeaderCard');
    expect(dispatch(g, command!).ok).toBe(true);
    expect(leaderBlocker(g.state, 1)).toBeNull();
  });

  it('appraise all three, and the score is the fold of its own terms', () => {
    const g = game('almamun', 'almamun');
    const decision = nextBotDecision(g.state, 1)!;
    expect(decision.kind).toBe('draft');
    expect(decision.candidates).toHaveLength(3);
    expect(decision.candidates.filter((c) => c.chosen)).toHaveLength(1);
    for (const candidate of decision.candidates) {
      let total = 0;
      for (const term of candidate.terms) {
        if (term.op === 'sub') total -= term.value;
        else if (term.op === 'mul') total *= term.value;
        else if (term.op === 'div') total /= term.value;
        else total += term.value;
      }
      expect(total, candidate.label).toBe(candidate.score);
    }
  });

  it('walk every figure’s whole deck without ever proposing a refused card', () => {
    for (const leader of LEADER_IDS) {
      const g = game(leader, leader);
      for (const age of LEADER_DECK_AGES) {
        runLeaderDraft(g.state);
        const command = nextBotCommand(g.state, 1);
        expect(command?.type, `${leader} Æra ${age}`).toBe('chooseLeaderCard');
        expect(dispatch(g, command!).ok, `${leader} Æra ${age}`).toBe(true);
        const next = Number(age) + 1;
        if (next <= 4) enterAge(g.state, 1, next as TechAge);
      }
      expect(heldLeaderCards(playerById(g.state, 1)!)).toHaveLength(4);
    }
  });
});

// --- the deck register ------------------------------------------------------

describe('the deck register', () => {
  it('holds three cards an age for six figures, one of each column', () => {
    expect(LEADER_IDS).toHaveLength(6);
    expect(LEADER_CARD_IDS).toHaveLength(6 * 4 * 3);
    for (const leader of LEADER_IDS) {
      for (const age of LEADER_DECK_AGES) {
        const row = leaderDef(leader).deck[age];
        expect(row.map((card) => card.kind), `${leader} ${age}`).toEqual([
          'passive',
          'boon',
          'unique',
        ]);
      }
    }
  });

  it('names every card in `LeaderCardId`, and names nothing else', () => {
    const union = LEADER_DATA_SOURCE.slice(
      LEADER_DATA_SOURCE.indexOf('export type LeaderCardId ='),
      LEADER_DATA_SOURCE.indexOf("| 'mithridatesHold';") + "| 'mithridatesHold';".length,
    );
    const written = [...union.matchAll(/\| '(\w+)'/g)].map((m) => m[1]!);
    expect(written).toEqual([...LEADER_CARD_IDS]);
  });

  it('declares no effect shape the evaluator does not read', () => {
    const kinds = new Set<string>();
    const walk = (effects: readonly { kind: string }[]): void => {
      for (const effect of effects) {
        kinds.add(effect.kind);
        const nested = (effect as { then?: { kind: string }[] }).then;
        if (nested) walk(nested);
      }
    };
    for (const leader of LEADER_IDS) walk(leaderDef(leader).bonus.effects);
    for (const { card } of everyCard()) walk(leaderCardEffects(card));
    expect(kinds.size).toBeGreaterThan(0);
    for (const kind of [...kinds].sort()) {
      expect(EVALUATOR_SOURCE.includes(`'${kind}'`), kind).toBe(true);
    }
  });

  it('gives every card something to do, or says in plain words why not', () => {
    for (const { leader, card } of everyCard()) {
      const at = `${leader} · ${card.id}`;
      const acts =
        leaderCardEffects(card).length > 0 ||
        card.boon?.windfall !== undefined ||
        (card.boon?.grants ?? []).length > 0;
      if (!acts) expect((card.deferred ?? []).length, at).toBeGreaterThan(0);
      expect(card.text.length, at).toBeGreaterThan(0);
      expect(card.flavor.length, at).toBeGreaterThan(0);
      // Player prose carries no identifiers and no brackets (hard rule 7).
      for (const line of card.deferred ?? []) {
        expect(line.includes('[['), at).toBe(false);
        expect(line.includes('`'), at).toBe(false);
      }
    }
  });

  it('marks every row a unique opens, and opens no row twice', () => {
    const opened = new Set<string>();
    for (const { leader, card } of everyCard()) {
      const at = `${leader} · ${card.id}`;
      if (card.kind === 'unique') {
        expect(card.unlocks, at).toBeDefined();
      }
      const unit = card.unlocks?.unit;
      if (unit !== undefined) {
        expect(unitDef(unit).unlockedByLeader, at).toBe(true);
        expect(opened.has(unit), at).toBe(false);
        opened.add(unit);
      }
      const building = card.unlocks?.building;
      if (building !== undefined) {
        expect(buildingDef(building).unlockedByLeader, at).toBe(true);
        expect(opened.has(building), at).toBe(false);
        opened.add(building);
      }
    }
    expect(opened.size).toBe(24);
  });
});

// --- the sheet the decks were written from -----------------------------------

describe('the sheet and the data', () => {
  /**
   * `docs/leaders.md`'s six tables are the **design** and `data/leaders.json` is
   * their ratified rendering — the doc says "workers gain +1 charge (the
   * corvée)" and the row says "Workers gain one more charge", because a card's
   * text is written in the game's own voice and a worksheet is not. So the sync
   * is on the **shape** rather than on the words: six figures, each with a
   * leader-bonus line and four rows of three, in both places. A leader added to
   * one and not the other fails core; the words are the built note's business.
   */
  it('carries the same six figures and the same four rows of three', () => {
    const doc = (
      import.meta.glob('../../docs/leaders.md', {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>
    )['../../docs/leaders.md']!;
    const decks = doc.slice(doc.indexOf('## The starting six'), doc.indexOf('**Built** (batch L2a'));
    expect(decks.length).toBeGreaterThan(0);

    // One "leader bonus:" line a figure, and one table row an age.
    expect([...decks.matchAll(/^leader bonus:/gm)]).toHaveLength(LEADER_IDS.length);
    const rows = [...decks.matchAll(/^\| (I|II|III|IV) \|(.+)\|$/gm)];
    expect(rows).toHaveLength(LEADER_IDS.length * LEADER_DECK_AGES.length);
    for (const row of rows) {
      // Three columns between the age and the end of the line.
      expect(row[2]!.split('|').filter((cell) => cell.trim().length > 0)).toHaveLength(3);
    }
  });

  /**
   * **The towns** (batch L5, `docs/flags.md` (pppp)). Here the sync *is* on the
   * words: a city's name is the whole of the design, so the doc's row and the
   * sheet's `cities` must agree name for name and in order — diacritics and
   * apostrophes included. A name retuned in one place and not the other fails
   * core, which is the point: the table is the user's to edit.
   */
  it('names the same towns, in the same order, as the doc’s table', () => {
    const doc = (
      import.meta.glob('../../docs/leaders.md', {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>
    )['../../docs/leaders.md']!;
    const start = doc.indexOf('## The cities');
    expect(start).toBeGreaterThan(0);
    const section = doc.slice(start, doc.indexOf('\n## ', start));

    // One row a figure, keyed by the name the doc prints — the cells are
    // separated by ` · `, which is the table's own separator.
    const rows = new Map<string, string[]>();
    for (const row of section.matchAll(/^\| (.+?) \| (.+?) \|$/gm)) {
      const leader = row[1]!.trim();
      if (leader === 'Leader' || /^-+$/.test(leader)) continue;
      rows.set(
        leader,
        row[2]!.split(' · ').map((name) => name.trim()),
      );
    }
    expect([...rows.keys()].sort()).toEqual(LEADER_IDS.map((id) => leaderDef(id).name).sort());
    for (const id of LEADER_IDS) {
      const def = leaderDef(id);
      expect(rows.get(def.name), id).toEqual([...def.cities]);
    }
  });
});

// --- the book ---------------------------------------------------------------

describe('the Compendium', () => {
  it('shelves the six figures, each with its own line and its whole deck', () => {
    const shelf = compendiumSections().find((section) => section.id === 'leader')!;
    expect(shelf.name).toBe('Leaders');
    // The lead page, plus one page a figure.
    expect(shelf.entries).toHaveLength(LEADER_IDS.length + 1);
    for (const id of LEADER_IDS) {
      const page = shelf.entries.find((entry) => entry.id === `leader:${id}`)!;
      expect(page, id).toBeDefined();
      expect(page.name).toBe(leaderDef(id).name);
      // Every card of the deck is named on the page.
      const printed = page.clauses.map((clause) => clause.text).join('\n');
      for (const card of leaderDeckCards(id)) {
        expect(printed.includes(card.name), `${id} · ${card.id}`).toBe(true);
      }
      for (const clause of page.clauses) {
        expect(clause.text.trim().length, id).toBeGreaterThan(0);
      }
    }
  });
});
