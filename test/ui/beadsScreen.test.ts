/**
 * The Bead Race's interface: the card faces, the rods, and the two seams where
 * a bead reaches a player at all.
 *
 * No jsdom in this suite (`controls.test.ts`'s note), which is exactly why
 * `beadsScreen.ts` puts everything that can be *quietly wrong* above the DOM:
 * what a card face says, how a face-down pile is counted, how a claimant reads,
 * and — the one nobody would catch by looking — **where the golden slot falls on
 * a rod**. The rest is read off the sources through Vite's raw glob, the
 * instrument `seatRoster.test.ts` and `triumphModal.test.ts` use, because every
 * remaining failure is a filter or an ordering that throws nothing.
 *
 * **Re-aimed by batch Q1** (`docs/wager.md` §5): the deeds are retired and the
 * screen is the **ledger** rather than the table — the rods, the rows that still
 * pay a bead, and the Opus's own line. The pile, the deck and the race project's
 * two lines went with the cards they described.
 *
 * Four claims:
 *
 *   1. A card's face is the **row's** words — the deed is `def.text`, never a
 *      sentence composed here — and a withdrawn row still has one, because the
 *      rows are kept for the record.
 *   2. A claimant reads as a claimant, and an unclaimed card reads as open.
 *   3. **A rod is as long as the threshold and its last slot is golden**, drawn
 *      empty however many beads the seat has earned.
 *   4. The awards reach `announce` from the commit funnel, and the screen opens
 *      from its three doors rather than from the pointer.
 */

import { describe, expect, it } from 'vitest';

import {
  type BeadCardId,
  BEAD_ENDEAVOUR_IDS,
  BEAD_FEAT_IDS,
  BEAD_QUEST_IDS,
  BEAD_RECKONING_IDS,
  BEAD_RULES,
  anyBeadDef,
  beadIsDormant,
} from '../../src/sim/beadData';
import type { EarnedBead } from '../../src/sim/state';
import {
  BEAD_FAMILY_MARK,
  abacusRodSlots,
  beadCardFace,
  beadClaimLine,
  beadHoverText,
  deckEraWord,
  grantHeldLine,
  standingLine,
  opusStandingLine,
} from '../../src/ui/beadsScreen';
import { describeBeadBoon } from '../../src/sim/beads';
import { BEAD_GRANT_IDS } from '../../src/sim/beadData';
import { stripRefs } from '../../src/sim/statecraft';
import { victoryFace } from '../../src/ui/victoryModal';

const SOURCES = import.meta.glob(
  [
    '../../src/ui/beadsScreen.ts',
    '../../src/ui/abacusScreen.ts',
    '../../src/ui/controls.ts',
    '../../src/ui/topBar.ts',
    '../../src/ui/cityPanel.ts',
    '../../src/ui/compendium.ts',
    '../../src/main.ts',
    '../../index.html',
  ],
  { eager: true, query: '?raw', import: 'default' },
) as Record<string, string>;

function source(name: string): string {
  const key = Object.keys(SOURCES).find((path) => path.endsWith(name));
  const text = key === undefined ? undefined : SOURCES[key];
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error(`${name} came back empty`);
  }
  return text;
}

function bead(id: BeadCardId, turn: number): EarnedBead {
  const { kind, def } = anyBeadDef(id);
  return { id, kind, family: def.family, turn };
}

// --- the card faces ---------------------------------------------------------

describe('a card face', () => {
  it('says the deed in the row’s own words, never a sentence of its own', () => {
    for (const id of [...BEAD_FEAT_IDS, ...BEAD_QUEST_IDS, ...BEAD_ENDEAVOUR_IDS]) {
      const face = beadCardFace(id);
      expect(face.deed, id).toBe(anyBeadDef(id).def.text);
      expect(face.name, id).toBe(anyBeadDef(id).def.name);
    }
  });

  it('still names the deck a withdrawn row was dealt in, in the player’s numerals', () => {
    // The rows are kept for the record and the record includes which age dealt
    // them, so the eyebrow is unchanged; what the Compendium does with the
    // withdrawal is its own page's business (`compendium.test.ts`).
    for (const id of BEAD_QUEST_IDS) {
      const face = beadCardFace(id);
      expect(face.eyebrow, id).toContain('Æra');
      expect(face.eyebrow, id).not.toContain('Æra I —');
    }
    expect(deckEraWord(2)).toBe('Æra II');
    expect(deckEraWord(3)).toBe('Æra III');
  });

  it('calls a feat a feat, and says it is always in play', () => {
    const face = beadCardFace(BEAD_FEAT_IDS[0]!);
    expect(face.eyebrow).toBe('feat · always in play');
  });

  it('carries every family in the table, each with an ink and a glyph', () => {
    for (const id of BEAD_RECKONING_IDS) {
      const mark = BEAD_FAMILY_MARK[beadCardFace(id).family];
      expect(mark, id).toBeDefined();
      expect(mark.ink.startsWith('--'), id).toBe(true);
      expect(mark.glyph.length, id).toBeGreaterThan(0);
    }
  });
});

describe('what a bead pays', () => {
  it('is the simulation’s own sentences, never a phrasing of its own', () => {
    // The one description of what a bead pays (`describeBeadBoon`), and the
    // *same* clauses `payBoon` prints when it settles — so a card can never
    // promise what the settlement does not deliver.
    for (const id of [...BEAD_QUEST_IDS, ...BEAD_ENDEAVOUR_IDS]) {
      const { def } = anyBeadDef(id);
      const boon = 'boon' in def && def.boon !== undefined ? def.boon : {};
      expect(beadCardFace(id).boon, id).toEqual(describeBeadBoon(boon));
    }
  });

  it('says nothing at all for a row that pays nothing', () => {
    // Every reckoning today: the bead is the whole of the reward.
    for (const id of BEAD_RECKONING_IDS) expect(beadCardFace(id).boon, id).toEqual([]);
  });

  it('gives every row something to print', () => {
    // A card blank in both halves would be one a player reads and learns
    // nothing from. The deed is always there; this is about the boon.
    for (const id of [...BEAD_QUEST_IDS, ...BEAD_ENDEAVOUR_IDS]) {
      if (anyBeadDef(id).def.dormant !== undefined) continue;
      // Re-aimed 2026-09-06 (schema 71): seven quests paid a die of the
      // Magister and nothing else, and the dice are gone. Those cards print a
      // struck-through `deferred` line instead of a boon — which is the face
      // saying, honestly, that it owes something it cannot yet pay.
      const face = beadCardFace(id);
      expect(face.boon.length + face.deferred.length, id).toBeGreaterThan(0);
    }
  });

  it('draws every clause through the one renderer, refs and all', () => {
    // A boon may name the thing it hands over ("a free [[unit:settler|…]]"), so
    // no surface may print one raw — CLAUDE.md's keyword rule.
    const screen = source('beadsScreen.ts');
    expect(screen).toContain('setDescriptorText(deed, face.deed, { linked: false })');
    expect(source('cityPanel.ts')).toContain('describeBeadBoon(def.boon ?? {})');
    expect(source('compendium.ts')).toContain('describeBeadBoon(boon ?? {})');
    // And the one plain sink: a native tooltip is a string the platform draws.
    expect(screen).toContain('stripRefs(clause.text)');
    const marked = [...BEAD_QUEST_IDS, ...BEAD_ENDEAVOUR_IDS].flatMap((id) =>
      beadCardFace(id).boon.map((clause) => clause.text),
    );
    for (const text of marked) expect(stripRefs(text)).not.toContain('[[');
  });
});

// --- the grants, which are the one table left -------------------------------

describe('the ledger’s one table', () => {
  it('lists what a live grant has paid this seat, and nothing for one it has not', () => {
    expect(grantHeldLine(0)).toBe('');
    expect(grantHeldLine(-1)).toBe('');
    expect(grantHeldLine(1)).toBe('held');
    // A **repeatable** row — the four a wager pays — may pay one seat several
    // times, and "twice" is a fact about a rod.
    expect(grantHeldLine(3)).toBe('held 3 times');
  });

  it('is the live grants and nothing else, filtered by the one predicate', () => {
    const screen = source('beadsScreen.ts');
    expect(screen).toContain('for (const id of BEAD_GRANT_IDS)');
    expect(screen).toContain('if (beadIsDormant(id)) continue;');
    // And what the filter takes out is the four the retired bead Orders minted.
    expect(BEAD_GRANT_IDS.filter((id) => beadIsDormant(id))).toEqual([
      'theLastLearning',
      'theWreathRefused',
      'theSownSalt',
      'theWordGoneOut',
    ]);
  });

  it('draws no deed table at all any more', () => {
    // The retirement, read at the source: the per-age tables, the feats and the
    // measures are gone with the rows behind them.
    const screen = source('beadsScreen.ts');
    expect(screen).not.toContain('function drawAge(');
    expect(screen).not.toContain('function drawFeats(');
    expect(screen).not.toContain('function drawReckonings(');
    expect(screen).toContain('function drawGrants(');
    // And nothing on it reads a hand or a deck, because the state has neither.
    expect(screen).not.toContain('state.beads.hands');
    expect(screen).not.toContain('state.beads.decks');
  });
});

describe('the claimant', () => {
  it('names who took it and when', () => {
    expect(beadClaimLine({ playerName: 'Crimson', turn: 84 })).toBe(
      'Taken by Crimson on turn 84',
    );
  });

  it('reads as open when nobody has', () => {
    expect(beadClaimLine(null)).toContain('Open');
    expect(beadCardFace(BEAD_QUEST_IDS[0]!).claim).toContain('Open');
  });
});

// --- the rods ---------------------------------------------------------------

describe('a rod', () => {
  const earned = [bead(BEAD_FEAT_IDS[0]!, 12), bead(BEAD_QUEST_IDS[0]!, 30)];

  it('is as long as the threshold, whatever the seat has earned', () => {
    expect(abacusRodSlots([], 20)).toHaveLength(20);
    expect(abacusRodSlots(earned, 20)).toHaveLength(20);
    // The default is the rules row, never a constant written here.
    expect(abacusRodSlots([])).toHaveLength(BEAD_RULES.threshold);
  });

  it('puts the golden slot last, and leaves it empty', () => {
    const slots = abacusRodSlots(earned, 6);
    expect(slots[5]!.kind).toBe('golden');
    expect(slots[5]!.family).toBeUndefined();
    // Even on a rod that has earned every ordinary bead: only the Magnum Opus
    // mints the golden one, so nothing may ever be drawn in that slot.
    const full = abacusRodSlots(
      Array.from({ length: 6 }, (_, i) => bead(BEAD_FEAT_IDS[0]!, i)),
      6,
    );
    expect(full[5]!.kind).toBe('golden');
  });

  it('fills from the left in the order the beads were earned', () => {
    const slots = abacusRodSlots(earned, 6);
    expect(slots[0]).toEqual({ kind: 'bead', family: earned[0]!.family });
    expect(slots[1]).toEqual({ kind: 'bead', family: earned[1]!.family });
    expect(slots[2]!.kind).toBe('empty');
  });

  it('reads a seat’s standing as a claim against the number that wins', () => {
    expect(standingLine('Crimson', 7, 20)).toBe('Crimson 7 of 20');
  });

  it('tells the pointer which card a bead came off, its family and its turn', () => {
    const text = beadHoverText(earned[0]!);
    expect(text).toContain(anyBeadDef(earned[0]!.id).def.name);
    expect(text).toContain(BEAD_FAMILY_MARK[earned[0]!.family].word.toLowerCase());
    expect(text).toContain('12');
  });
});

// --- the Abacus reads the record, and nothing else --------------------------

describe('the Abacus’s rods', () => {
  const abacus = source('abacusScreen.ts');
  const main = source('main.ts');

  it('reads Player.beads, through the roster the interface counts', () => {
    // `realPlayers`, never `state.players` (CLAUDE.md's register): a rod for
    // the wild was a score line for the weather.
    expect(main).toContain('realPlayers(game.state).map((player)');
    expect(main).toContain('beads: player.beads,');
  });

  it('draws the golden slot through the one arithmetic', () => {
    expect(abacus).toContain('abacusRodSlots(row.beads, threshold)');
    expect(abacus).toContain("BEAD_RULES.threshold");
    expect(abacus).toContain("'bead-slot is-golden'");
  });

  it('translates the rules’ families into the look file’s in one place', () => {
    // `data/view3d.json` calls them conquest/culture/philosophy/commerce and
    // `data/beads.json` calls them domination/culture/science/economic. One map,
    // at the one seam that needs both.
    expect(abacus).toContain('const STAGE_FAMILY');
    expect(abacus.split('STAGE_FAMILY').length - 1).toBeLessThanOrEqual(3);
  });

  it('has a register element under the stage for it to write into', () => {
    expect(source('index.html')).toContain('id="abacus-register"');
  });
});

// --- the two seams a bead reaches a player through --------------------------

describe('the announcements', () => {
  const controls = source('controls.ts');

  it('reaches announce from the commit funnel, not from a call site', () => {
    // `reportBeads` covers both paths with no second call site — a bead earned
    // inside a command and a bead earned in a resolution — exactly as
    // `reportTriumphs` does. See its docblock.
    const funnel = controls.slice(controls.indexOf('function commit(command: Command)'));
    const body = funnel.slice(0, funnel.indexOf('return result;'));
    expect(body).toContain('reportBeads(result);');
    const report = controls.slice(controls.indexOf('function reportBeads('));
    expect(report.slice(0, report.indexOf('\n  }'))).toContain('announce(');
  });

  it('says your own bead with its family and what it paid', () => {
    expect(controls).toContain('◉ A bead: ${award.name} (${family})${paid}');
    // The settlement's own lines, never re-derived.
    expect(controls).toContain('award.boon.join(');
  });

  it('says another seat’s by name, because a bead is the world’s news', () => {
    expect(controls).toContain('${who} took a bead: ${award.name}');
  });

  it('keeps the reckoning’s own line, for a save that earned one', () => {
    // Retired in G2 and unreachable since, but a loaded game may hold one on a
    // rod — and a bead that announced itself by the wrong word would be the
    // retirement leaking into the news.
    expect(controls).toContain("award.kind === 'reckoning'");
    expect(controls).toContain('◈ Reckoning: ${award.name} — ${who}');
  });

  it('announces an age opening off the report, never off a diff', () => {
    // `CommandResult.beadAgeOpened`, ridden out of `TurnReport`. A
    // before-and-after of `state.beads.worldAge` would be a second
    // implementation of "did it move". The line no longer counts the cards that
    // turned face up with it (batch Q1): there is no table, and the sheet the
    // moment raises is the wager's.
    expect(controls).toContain('result.beadAgeOpened === undefined');
    expect(controls).toContain('◈ ${deckEraWord(age)} opens`);');
    expect(controls).not.toContain('${what} on the table');
    expect(controls).not.toContain('const ageBefore =');
  });
});

describe('the doors to the screen', () => {
  const controls = source('controls.ts');
  const main = source('main.ts');

  it('opens from a key, and it is not the settler’s', () => {
    expect(controls).toContain("if (event.key === 'v' || event.key === 'V')");
    expect(controls).toContain('onToggleBeads?.();');
    // `B` still founds a city, and must go on doing so.
    const found = controls.slice(controls.indexOf("if (event.key === 'b' || event.key === 'B')"));
    expect(found.slice(0, 200)).toContain('foundCity();');
  });

  it('opens from the top bar’s chip and from a rod, never from the pointer', () => {
    expect(source('topBar.ts')).toContain('onOpenBeads()');
    expect(source('abacusScreen.ts')).toContain('onOpenBeads()');
    expect(main).toContain('onToggleBeads: () => beads?.toggle(),');
    // The screen is rendered on open and on `refresh`, which is the commit
    // funnel's own path (Entry XLVII) — never on a hover. Since batch H5 both
    // are the shell's: `draw` is what an open paints and what `refresh` repaints
    // while the sheet is up (`modalShell.ts`).
    const screen = source('beadsScreen.ts');
    expect(screen).toContain('draw: render,');
    expect(screen).toContain('refresh: shell.refresh,');
    expect(screen).not.toContain('pointermove');
  });

  it('joins the registers every other overlay is in', () => {
    expect(main).toContain('(beads?.isOpen ?? false) ||');
    expect(main).toContain('beads?.close();');
  });
});

// --- the build list ---------------------------------------------------------

describe('a race project in the build list', () => {
  const panel = source('cityPanel.ts');

  /**
   * **Re-aimed by batch Q1.** The races are retired and no row of that class
   * reaches a build list any more — `PROJECT_IDS` does not carry one. What is
   * pinned is the panel's half of the rule, kept whole: the mark that says a
   * row never leaves the queue belongs to the two conversions alone, and the
   * greying is still the reducer's own sentence.
   */
  it('greys with the reducer’s own sentence, like every other row', () => {
    expect(panel).toContain("buildError(getGame().state, city.ownerId, 'project', id, city)");
  });

  it('keeps the repeating project’s mark off a row that finishes', () => {
    expect(panel).toContain('`${def.name} ↻`');
    expect(panel).toContain('bead === undefined');
  });

  it('asks the screen nothing about a prerequisite any more', () => {
    const screen = source('beadsScreen.ts');
    expect(screen).not.toContain('endeavourPrerequisiteMet(state');
    expect(screen).not.toContain('endeavourError(state');
    // The screen imports one thing from the simulation's bead module now: the
    // describer, for the rows it still prints.
    expect(screen).toContain("import { describeBeadBoon } from '../sim/beads';");
  });
});

// --- the win ----------------------------------------------------------------

describe('the victory sheet', () => {
  it('names the winner the same way on every screen', () => {
    const mine = victoryFace({ winner: 'Crimson', mine: true, beads: 20, threshold: 20 });
    const theirs = victoryFace({ winner: 'Crimson', mine: false, beads: 20, threshold: 20 });
    expect(mine.headline).toBe('Crimson has won the Bead Race');
    expect(theirs.headline).toBe(mine.headline);
    // Only the line underneath is about the reader.
    expect(mine.text).not.toBe(theirs.text);
    expect(mine.figure).toBe('20 of 20 beads');
  });

  it('is raised for every seat, at the hand-over', () => {
    const main = source('main.ts');
    expect(main).toContain('victory?.show({');
    expect(main).toContain('mine: playerId === controls.localPlayerId(),');
    const controls = source('controls.ts');
    expect(controls).toContain('if (decided !== null) onVictory?.(decided);');
  });
});

// --- the deck ages ----------------------------------------------------------

describe('the era word', () => {
  it('reads the age straight, with no shim in front of it', () => {
    // The +1 shim died with the re-banding (2026-08-31, as its docblock
    // promised); this pin keeps it dead — the helper reads the key straight.
    const screen = source('beadsScreen.ts');
    expect(screen).not.toContain('age + 1');
    expect(screen.match(/eraWord\(age\)/g)).toHaveLength(1);
  });
});

// --- the finish line --------------------------------------------------------

describe('the Magnum Opus line', () => {
  it('says which of the two states the world is in, in plain words', () => {
    expect(opusStandingLine(false)).toContain('not yet open');
    expect(opusStandingLine(true)).toContain('closes the age');
    // Two sentences, not one with a negation stuck on the front: a player who
    // has never seen the finish line and one racing for it need different lines.
    expect(opusStandingLine(true)).not.toBe(opusStandingLine(false));
  });

  it('is drawn beside the rods, off the derived reading and nothing else', () => {
    const screen = source('beadsScreen.ts');
    expect(screen).toContain('opusStandingLine(opusOpen(state))');
  });

  it('is announced from the one commit funnel, off the reducer’s own diff', () => {
    const controls = source('controls.ts');
    // Beside `reportAgeOpened`, in the same funnel, for the same reason: a diff
    // kept up in the interface is a second clock.
    expect(controls).toContain('reportOpusOpened(result);');
    expect(controls).toContain('result.opusOpened !== true');
    // And never a before-and-after of the derived reading.
    expect(controls).not.toContain('lastOpusOpen');
  });

  it('gives a reward card a face with the source on it', () => {
    for (const id of BEAD_GRANT_IDS) {
      const face = beadCardFace(id);
      expect(face.kind).toBe('grant');
      expect(face.eyebrow).toContain('reward');
      expect(face.deed.length).toBeGreaterThan(0);
      // A reward is never dealt, so it never carries an age in its eyebrow.
      expect(face.eyebrow).not.toContain('Æra');
    }
  });
});
