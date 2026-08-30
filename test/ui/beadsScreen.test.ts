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
 * Five claims:
 *
 *   1. A card's face is the **row's** words — the deed is `def.text`, never a
 *      sentence composed here — and its eyebrow names the deck in the numerals
 *      the player knows rather than the temporary deck key.
 *   2. A face-down pile is counted, and says nothing at all when it is empty.
 *   3. A claimant reads as a claimant, and an unclaimed card reads as open.
 *   4. **A rod is as long as the threshold and its last slot is golden**, drawn
 *      empty however many beads the seat has earned.
 *   5. The awards reach `announce` from the commit funnel, and the screen opens
 *      from a door rather than from the pointer.
 */

import { describe, expect, it } from 'vitest';

import {
  type BeadCardId,
  BEAD_DECK_AGES,
  BEAD_ENDEAVOUR_IDS,
  BEAD_FEAT_IDS,
  BEAD_QUEST_IDS,
  BEAD_RECKONING_IDS,
  BEAD_RULES,
  anyBeadDef,
} from '../../src/sim/beadData';
import type { EarnedBead } from '../../src/sim/state';
import {
  BEAD_FAMILY_MARK,
  abacusRodSlots,
  beadBoonWords,
  beadCardFace,
  beadClaimLine,
  beadHoverText,
  deckEraWord,
  deckLine,
  faceDownLine,
  standingLine,
} from '../../src/ui/beadsScreen';
import { victoryFace } from '../../src/ui/victoryModal';

const SOURCES = import.meta.glob(
  [
    '../../src/ui/beadsScreen.ts',
    '../../src/ui/abacusScreen.ts',
    '../../src/ui/controls.ts',
    '../../src/ui/topBar.ts',
    '../../src/ui/cityPanel.ts',
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

  it('names the deck in the numerals the player knows, not the deck key', () => {
    for (const id of BEAD_QUEST_IDS) {
      const face = beadCardFace(id);
      // The keys are the built ages (2, 3) and the doc's numerals are one
      // higher; a face that printed the key would teach a number about to
      // change. See `deckEraWord`.
      expect(face.eyebrow, id).toContain('Æra');
      expect(face.eyebrow, id).not.toContain('Æra I —');
    }
    expect(deckEraWord(2)).toBe('Æra III');
    expect(deckEraWord(3)).toBe('Æra IV');
  });

  it('calls a feat a feat, and says it is always in play', () => {
    const face = beadCardFace(BEAD_FEAT_IDS[0]!);
    expect(face.eyebrow).toBe('feat · always in play');
    // A feat is not something you qualify for, so there is no tick on it.
    expect(face.met).toBeNull();
  });

  it('gates a race project with the reducer’s own sentence, and only a race', () => {
    const id = BEAD_ENDEAVOUR_IDS[0]!;
    expect(beadCardFace(id, { refusal: null }).met).toBe(true);
    const refused = beadCardFace(id, { refusal: 'The Census wants a city of 15 citizens' });
    expect(refused.met).toBe(false);
    expect(refused.refusal).toBe('The Census wants a city of 15 citizens');
    // A quest handed the same refusal still has no tick: it is not a gate.
    expect(beadCardFace(BEAD_QUEST_IDS[0]!, { refusal: 'anything' }).met).toBeNull();
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
  it('says nothing at all for a row that pays nothing', () => {
    expect(beadBoonWords(undefined)).toEqual([]);
    expect(beadBoonWords({})).toEqual([]);
  });

  it('names a die, a windfall, a grant and a cap, in that order', () => {
    const lines = beadBoonWords({
      dice: 2,
      windfall: { yield: 'gold', amount: 150, where: 'capital' },
      grant: { settler: true },
      effects: [{ kind: 'happiness', amount: 2 }],
    });
    expect(lines).toHaveLength(4);
    expect(lines[0]).toContain('dice');
    expect(lines[1]).toContain('gold');
    expect(lines[2]).toContain('settler');
    expect(lines[3]).toContain('lasting');
  });

  it('says where a windfall lands when it is not the capital', () => {
    expect(beadBoonWords({ windfall: { yield: 'population', amount: 1, where: 'every' } })[0]).toContain(
      'in every city',
    );
  });

  it('gives every live card in the table something to print', () => {
    // A card whose face was blank in both halves would be a card a player reads
    // and learns nothing from. The row's text is always there; this is about
    // the boon, which only the dealt kinds carry.
    for (const id of [...BEAD_QUEST_IDS, ...BEAD_ENDEAVOUR_IDS]) {
      const { def } = anyBeadDef(id);
      if (def.dormant !== undefined) continue;
      expect(beadCardFace(id).boon.length, id).toBeGreaterThan(0);
    }
  });
});

// --- the pile and the deck --------------------------------------------------

describe('the pile', () => {
  it('counts the backs and names the age they are waiting for', () => {
    expect(faceDownLine(3, 2)).toBe('3 cards face down until Æra III opens');
    expect(faceDownLine(1, 3)).toBe('1 card face down until Æra IV opens');
  });

  it('says nothing when nothing is face down', () => {
    expect(faceDownLine(0, 2)).toBe('');
    expect(faceDownLine(-1, 2)).toBe('');
  });

  it('says what is still in the deck, and when the deck is spent', () => {
    // A hand is open slots that refill, so "on the table" and "still to come"
    // are two different numbers and a player planning an age needs both.
    expect(deckLine(9)).toBe('9 still in the deck');
    expect(deckLine(0)).toContain('spent');
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

  it('calls a reckoning by name rather than announcing it as a bead', () => {
    expect(controls).toContain("award.kind === 'reckoning'");
    expect(controls).toContain('◈ Reckoning: ${award.name} — ${who}');
  });

  it('announces an age opening with what is on the table', () => {
    expect(controls).toContain('opens — ${dealt} ${what} on the table');
    expect(controls).toContain('deckEraWord(state.beads.worldAge)');
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
    // funnel's own path (Entry XLVII) — never on a hover.
    const screen = source('beadsScreen.ts');
    expect(screen).toContain('refresh: () => {');
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

  it('prints its family and the one rule that makes it a race', () => {
    expect(panel).toContain('First to finish takes the bead — nobody else gets it');
    expect(panel).toContain('BEAD_FAMILY_MARK[bead.family].word.toLowerCase()');
  });

  it('greys with the reducer’s own sentence, like every other row', () => {
    expect(panel).toContain("buildError(getGame().state, city.ownerId, 'project', id, city)");
  });

  it('keeps the repeating project’s mark off it', () => {
    // `↻` means "this never leaves the queue" and belongs to the two
    // conversions alone; a race finishes.
    expect(panel).toContain('`${def.name} ↻`');
    expect(panel).toContain('bead === undefined');
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

describe('the deck keys', () => {
  it('are the built ages, and the screen never prints one', () => {
    expect([...BEAD_DECK_AGES]).toEqual([2, 3]);
    const screen = source('beadsScreen.ts');
    // One helper, one comment, one place to delete when the tree re-bands.
    expect(screen.match(/eraWord\(age \+ 1\)/g)).toHaveLength(1);
  });
});
