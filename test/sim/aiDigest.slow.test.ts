/**
 * **The six-seat 120-turn digest, pinned** (`docs/plans/bot-evolution.md`
 * §3.5, ruling 7; the procedure of `docs/flags.md` (jjjjj) and (ttttt), where
 * it was the orchestrator's scratch: *"the 120-turn digests identical at two
 * seeds"* — here at the measured seed on the two boards the harness plays).
 *
 * What it pins: the bots decide **identically** — the whole state,
 * `snapshotState` hashed (`aiDigestHelpers.ts`'s FNV, the `explore.test.ts`
 * `RANGED_BOARDS` print), after a hundred and twenty turns of six personas on
 * the duel board and on the standard board. A refactor that means to change no
 * decision leaves both literals where they are; a change that moves one is a
 * finding, and the literal is **re-cut with the reason printed** in the commit
 * that moves it — never quietly. A schema bump moves both by construction (the
 * state's own bytes change) and is re-cut with the bump's changelog line as the
 * reason.
 *
 * The harness's sentinel (`scripts/evolve.ts`) reads the very same
 * `digestOfState`, so the suite's pin and the run's halt are one reading.
 *
 * Slow by kind: two full six-seat games, the standard board's alone near three
 * minutes on one core.
 */

import { describe, expect, it } from 'vitest';

import { digestOfState, playSeatedGame, sixSeatSpec } from './aiDigestHelpers';

/**
 * The literals. Cut 2026-09-15 at schema 117 (L1's lifetime deck tally,
 * `91326ba`, moved both from schema 116's `4a422d67:248888` /
 * `eaf58d1f:887156` — the state's own bytes changed); E1a's rows at today's
 * defaults (`60543d2`) then moved neither — a default that reproduces today's
 * play moves no digest, measured on both boards.
 *
 * Re-cut for M2 (`dd69463`, the War Hall and the Armoury, the Courthouse to
 * Iron Working): two buildable rows joined the tree and one moved, so the
 * bot's node valuer (`readNodeGifts`, which prices a technology by what it
 * unlocks) found Bronze Panoply, Mathematics and Iron Working richer and
 * Machinery and Divine Right poorer, and every seat's research order moved
 * from the first of those choices on — duel `ecfb7314:251149` →
 * `3e710249:248825`, standard `586ca4e0:892118` → `592eb05b:904802`. No rule
 * of play changed; a data row the bot can build is a reason the digest moves.
 *
 * Re-cut for B1 (schema 118, the draft pass): the culture meter's exponent
 * fell from 2.65 to 2.2, so every seat's third draft and after arrives
 * earlier and the deck it holds at turn 120 is a different deck — duel
 * `3e710249:248825` → `a31b1dc0:249598`, standard `592eb05b:904802` →
 * `2f8db9d8:905343`. The prints grew by the cards drafted. The reroll reset
 * moves nothing on its own: no bot rerolls.
 *
 * Re-cut for D1a (the decks rework, schema 119, branch `decks` —
 * `docs/plans/decks-rework.md`): every seat draws from a different pool now —
 * its own decks' — and in D1a that pool is **empty** for every seat: every
 * pre-rework Order and Doctrine row is `retired: true` and D1b's rows do not
 * exist yet, so every draft is an exhausted hand that charges nothing, counts
 * nothing and deals nothing. No seat drafts, so no seat reaches a government
 * rung, adopts, or seats a card; the six seats' collections are empty at turn
 * 120 and the prints **shrank** by the cards they used to hold — duel
 * `a31b1dc0:249598` → `e444d304:236660`, standard `2f8db9d8:905343` →
 * `42315015:855946` — while the state's own bytes changed (the schema digits,
 * four seat fields and `rewardHands`). D1b fills the decks and re-cuts these.
 *
 * **Re-cut for D1b (the cards, branch `decks`)**, and this is the re-cut D1a
 * promised in the paragraph above. Seven agents wrote three hundred and
 * ninety-nine rows into `data/decks/*.json`, a hundred and forty-three of them
 * live, so **the pool is no longer empty**: every seat draws from its leader's
 * two decks plus the commons and the either-type crosses, drafts again, reaches
 * the ladder's rungs, adopts, banks reward hands and seats cards for a hundred
 * and twenty turns. Every decision downstream of a held card moves with it —
 * which is the whole of what a digest is for. Duel `e444d304:236660` →
 * `1ccd794d:245595`, standard `42315015:855946` → `4180e4e6:893888`; the prints
 * **grew back** by the cards the six seats hold at turn 120, to a little under
 * where they stood before D1a emptied the shelf (`a31b1dc0:249598` /
 * `2f8db9d8:905343`), which is what a differently-stocked pool dealing a
 * differently-sized collection looks like.
 *
 * The bot's synergy reading moved in the same pass and is part of this print:
 * `scoreCard`'s bonus counted cards sharing a `line` and counts cards sharing a
 * **deck** now (`bot.ts`, the reason in its docblock) — the old reading was
 * dead for the whole live catalogue, since no D1b row carries a line, so the
 * two changes cannot be separated at this seed and are not claimed separately.
 * Measured twice, same bytes both runs.
 */
/**
 * **Re-cut for D2a (the predicates, branch `decks`)**. Five new members on
 * unions the evaluator already walked — a threshold on a shelf of buildings, a
 * worked improvement, a worked great person's work, a marvel standing in the
 * town, the negations those wanted, and the ring of six on a hex condition —
 * un-deferred **thirty-two rows**, taking the live catalogue from a hundred and
 * forty-three to a hundred and seventy-five. Twenty-three of them are
 * Magisterial's, which was the thinnest deck in the audit, so a Magisterial seat
 * now draws from roughly twice the shelf it drew from yesterday and every seat's
 * hands, picks, chairs and downstream decisions move with it. Duel
 * `1ccd794d:245595` → `af754d10:245540`, standard `4180e4e6:893888` →
 * `1b9b9b99:900701`.
 *
 * The prints move in **opposite directions**, which is what a differently-stocked
 * pool looks like rather than a bug: the standard board's six seats hold more
 * cards at turn 120 and print longer, and the duel's two hold a shade fewer —
 * the same number of drafts spent on a wider shelf is not the same collection.
 * Nothing about the *engine* changed in this batch; the bot appraises the new
 * rows through exactly the walk it already had. Measured twice, same bytes both
 * runs.
 */
/**
 * **Re-cut for D2b (counts and reach, branch `decks`)**, the second and last of
 * the two vocabulary batches. Seven shapes, every one a field on an effect that
 * already stood: `count`/`per`/`max` on the production bonus and the route
 * rider, a ceiling on a share of a town's own fold and on a per-town writ, a
 * scope on the renown trickle and on the purchase rider, the empire-building
 * selector (a scope, a count and a narrowing on the bonus), a per-town writ
 * price (`meterRule` `cityCost`), four distinct-kind counts and a per-neighbour
 * multiplier on a hex line. They un-deferred **twenty-seven rows**, taking the
 * live catalogue from a hundred and seventy-five to two hundred and two — twelve
 * of them Magisterial's and five Scientific's, which were the two thinnest decks
 * left after D2a. Duel `af754d10:245540` → `beeae6b2:240493`, standard
 * `1b9b9b99:900701` → `ad176577:886331`.
 *
 * **Both prints fell**, where D2a's moved in opposite directions, and the reason
 * is the same fact read once more: the same number of drafts spent on a wider
 * shelf is not the same collection, and a seat that takes a different card at
 * turn 30 takes different everything afterwards. Two of the shapes also reach
 * the *board* rather than only the hand — a town the writ prices one point
 * cheaper is a town a bot may found, and hammers counted off a congregation
 * move a queue — so the drift starts earlier here than it did in D2a.
 *
 * Nothing about the **engine** changed: the bot appraises every new field
 * through the walk it already had, save the one arm `meterRule`'s register
 * required (`scoreMeterRule`'s `cityCost`, which prices the new rule exactly as
 * the three beside it price theirs). Measured twice, same bytes both runs.
 */
const DIGESTS: Record<string, string> = {
  duel: 'beeae6b2:240493',
  standard: 'ad176577:886331',
};

/**
 * Long enough for the standard board on a loaded machine (171 s alone at the
 * plan's measurement; five times that beside a whole slow suite). The timeout
 * is the machine's, not the test's.
 */
const PATIENCE = 900_000;

describe('the six-seat digest', () => {
  for (const sizeName of ['duel', 'standard']) {
    it(
      `plays a hundred and twenty turns on the ${sizeName} board to the state it always reaches`,
      () => {
        const played = playSeatedGame(sixSeatSpec(sizeName));
        // A bot that refuses its own commands or stalls is a bug before it is a
        // digest; say which before the hash disagrees.
        expect({ sizeName, warnings: played.warnings, stalled: played.stalled }).toEqual({
          sizeName,
          warnings: 0,
          stalled: false,
        });
        expect({ sizeName, digest: digestOfState(played.game.state) }).toEqual({
          sizeName,
          digest: DIGESTS[sizeName],
        });
      },
      PATIENCE,
    );
  }
});
