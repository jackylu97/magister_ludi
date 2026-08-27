/**
 * What a finished wonder handed over, as the chronicle says it.
 *
 * `wonderGrantNotices` is the whole of the rule, pulled out pure for exactly
 * this (no jsdom in this suite, as with every other UI pass): the reducer
 * reports *what* arrived and never *which* building sent it or *whose* it was —
 * `CompletionGrantReport` carries a kind, a name and a flag, and nothing else —
 * so the interface has to pair the grants with the wonders beside them in the
 * same result. Three claims, and each one has a bug behind it that no
 * behavioural test would notice:
 *
 *   1. **Every grant is named under the marvel that paid it**, by walking the
 *      wonders in the sweep's own order and consuming each row's `onComplete`
 *      entries. Two wonders finishing in one resolution is the case that breaks
 *      a naive "the first wonder in the list".
 *   2. **`done: false` is a real outcome** and gets its own honest sentence. A
 *      Great Library that landed on a seat with no research chosen must not
 *      print "Mathematics is understood" and must not print nothing at all.
 *   3. **Only this seat's grants are announced**, filtered by the *wonder's*
 *      owner, because `CommandResult.wonders` is deliberately not seat-filtered
 *      (a marvel is news to everybody) and is the only thing in the result that
 *      knows whose sword this was.
 *
 * And the safety valve: if the two lists disagree about kinds, the walk stops
 * rather than guessing. A line under the wrong wonder's name is worse than no
 * line, and an unpaired grant has no owner either.
 */

import { describe, expect, it } from 'vitest';

import type { BuildingId } from '../../src/sim/buildingData';
import type { CompletionGrantReport, WonderCompletion } from '../../src/sim/cities';
import { wonderGrantNotices } from '../../src/ui/controls';

const SEAT = 0;

/** A completion report for one wonder, with no refunds and nothing else to say. */
function wonder(building: BuildingId, name: string, playerId = SEAT): WonderCompletion {
  return { building, name, cityId: 1, playerId, turn: 12, refunds: [] };
}

function texts(notices: readonly { text: string }[]): string[] {
  return notices.map((notice) => notice.text);
}

describe('wonderGrantNotices', () => {
  it('names the wonder and the thing, one line per grant', () => {
    const grants: CompletionGrantReport[] = [
      { grant: 'unit', name: 'Spearman', done: true, unitId: 7 },
    ];
    const notices = wonderGrantNotices(
      [wonder('statueOfZeus', 'The Statue of Zeus')],
      grants,
      SEAT,
    );
    expect(texts(notices)).toEqual(['✶ The Statue of Zeus · a Spearman answers the call']);
    // The pan: a piece the player did not place is a piece they would otherwise
    // have to go looking for.
    expect(notices[0].unitId).toBe(7);
  });

  it('gives a vowel its article', () => {
    const notices = wonderGrantNotices(
      [wonder('stonehenge', 'Stonehenge')],
      [{ grant: 'unit', name: 'Augur', done: true, unitId: 3 }],
      SEAT,
    );
    expect(texts(notices)).toEqual(['✶ Stonehenge · an Augur answers the call']);
  });

  it('says what a technology grant finished', () => {
    const notices = wonderGrantNotices(
      [wonder('greatLibrary', 'The Great Library')],
      [{ grant: 'tech', name: 'Mathematics', done: true }],
      SEAT,
    );
    expect(texts(notices)).toEqual(['✶ The Great Library · Mathematics is understood']);
  });

  it('opens the Doctrine, and says so', () => {
    const notices = wonderGrantNotices(
      [wonder('theatreOfDionysus', 'The Theatre of Dionysus')],
      [{ grant: 'doctrineDraft', name: 'a Doctrine draft', done: true }],
      SEAT,
    );
    expect(texts(notices)).toEqual(['✶ The Theatre of Dionysus · a Doctrine draft opens']);
    // The flag the caller raises the offer card on — the whole reason this
    // notice is a shape rather than a string.
    expect(notices[0].opensDoctrine).toBe(true);
  });

  it('tells the truth when a grant could not be taken', () => {
    // Each of the three failures the reducer can report, in the words a player
    // can act on. The unit arm deliberately does not name the piece: the report
    // cannot say whether there was no melee row or nowhere to stand.
    expect(
      texts(
        wonderGrantNotices(
          [wonder('greatLibrary', 'The Great Library')],
          [{ grant: 'tech', name: 'a technology', done: false }],
          SEAT,
        ),
      ),
    ).toEqual(['✶ The Great Library · nothing was being researched']);

    const owed = wonderGrantNotices(
      [wonder('theatreOfDionysus', 'The Theatre of Dionysus')],
      [{ grant: 'doctrineDraft', name: 'a Doctrine draft', done: false }],
      SEAT,
    );
    // Neither "already owed" nor "no pool at this tier": `done: false` covers
    // both and the report does not say which, so the line says only what is
    // certainly true.
    expect(texts(owed)).toEqual(['✶ The Theatre of Dionysus · no Doctrine could be dealt']);
    // Nothing to open: the seat is already holding the offer it owes.
    expect(owed[0].opensDoctrine).toBeUndefined();

    expect(
      texts(
        wonderGrantNotices(
          [wonder('statueOfZeus', 'The Statue of Zeus')],
          [{ grant: 'unit', name: 'a unit', done: false }],
          SEAT,
        ),
      ),
    ).toEqual(['✶ The Statue of Zeus · nothing answered the call']);
  });

  it('lands each grant on the wonder that paid it, across one resolution', () => {
    // The sweep's order: `advanceProduction` pushes a completion's wonder and
    // then that completion's grants, city by city. Two marvels in one turn is
    // the case a "first wonder in the list" reading gets wrong.
    const notices = wonderGrantNotices(
      [
        wonder('greatLibrary', 'The Great Library'),
        wonder('theatreOfDionysus', 'The Theatre of Dionysus'),
      ],
      [
        { grant: 'tech', name: 'Mathematics', done: true },
        { grant: 'doctrineDraft', name: 'a Doctrine draft', done: true },
      ],
      SEAT,
    );
    expect(texts(notices)).toEqual([
      '✶ The Great Library · Mathematics is understood',
      '✶ The Theatre of Dionysus · a Doctrine draft opens',
    ]);
  });

  it('is silent about another empire’s wonder, and still pairs past it', () => {
    // The rival's Library consumes its own grant so that the seat's own Theatre
    // is still read off the right entry — the filter must not skip the *walk*.
    const notices = wonderGrantNotices(
      [
        wonder('greatLibrary', 'The Great Library', 1),
        wonder('theatreOfDionysus', 'The Theatre of Dionysus', SEAT),
      ],
      [
        { grant: 'tech', name: 'Astronomy', done: true },
        { grant: 'doctrineDraft', name: 'a Doctrine draft', done: true },
      ],
      SEAT,
    );
    expect(texts(notices)).toEqual(['✶ The Theatre of Dionysus · a Doctrine draft opens']);
  });

  it('stops rather than guessing when the two lists disagree', () => {
    // A grant whose kind is not the one the row promised means the pairing has
    // been lost, and a line under the wrong marvel's name is worse than none.
    expect(
      wonderGrantNotices(
        [wonder('greatLibrary', 'The Great Library')],
        [{ grant: 'unit', name: 'Spearman', done: true, unitId: 4 }],
        SEAT,
      ),
    ).toEqual([]);
    // A grant with no wonder beside it at all has no owner either.
    expect(wonderGrantNotices([], [{ grant: 'tech', name: 'Bronze Working', done: true }], SEAT))
      .toEqual([]);
    // And the overwhelmingly common result: nothing granted, nothing said.
    expect(wonderGrantNotices(undefined, undefined, SEAT)).toEqual([]);
    expect(wonderGrantNotices([wonder('theOracle', 'The Oracle')], [], SEAT)).toEqual([]);
  });
});
