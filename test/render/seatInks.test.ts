/**
 * **Two colours a figure, and the board wears both** — batch H7,
 * `docs/flags.md` (oooo); the palette is the table "## The colours" in
 * `docs/leaders.md` and the sync test below holds the two together.
 *
 * Everything here is a claim about the *pair* and where it may come from:
 *
 *   · the doc's rows and `data/leaders.json`'s `colors` are the same six rows,
 *     hexes and words alike;
 *   · six distinct primaries, and none of them within the palette's own
 *     distance of each other or of a plain seat's ink;
 *   · `seatInks` is the **one** place the fallback is decided, and a seat that
 *     names no second ink wears the board's own — so a roster with no figures
 *     in it is the board it always was;
 *   · a seat's pair rides into `GameConfig` and nowhere else — `newGame` copies
 *     it iff it is there, and a config without it snapshots byte-identically;
 *   · the diorama reads a literal hex at its word and every palette seat still
 *     resolves to the number it always resolved to;
 *   · the border is two strips, instanced once per board build;
 *   · the gallery has the stall.
 */

import { describe, expect, it } from 'vitest';

import {
  DERIVED_SECONDARY,
  MIN_INK_DISTANCE,
  inkDistance,
  seatInks,
} from '../../src/art/seatInks';
import { LEADER_IDS, leaderDef } from '../../src/sim/leaderData';
import { SEATS } from '../../src/ui/gameSetup';
import { NO_LEADER, leaderFaces, seatLeaders } from '../../src/ui/leaderSelect';
import { VIEW3D, playerPieceColor } from '../../src/render3d/lookData';
import { createGame, snapshotState } from '../../src/sim/game';
import { compendiumSections } from '../../src/ui/compendium';

// --- the bench ---------------------------------------------------------------

function source(path: string): string {
  const files = import.meta.glob('../../src/**/*.{ts,css}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
  const hit = Object.entries(files).find(([key]) => key.endsWith(`/src/${path}`));
  if (!hit) throw new Error(`no source for ${path}`);
  return hit[1];
}

const DOC = (
  import.meta.glob('../../docs/leaders.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>
)['../../docs/leaders.md']!;

/** The doc's colour table, row by row: name, and the two halves of each pair. */
function docColourRows(): { leader: string; pair: [string, string][] }[] {
  const section = DOC.slice(DOC.indexOf('## The colours'), DOC.indexOf('## The cities'));
  const rows = [...section.matchAll(/^\| (?!Leader|-)(.+?) \| (.+?) \| (.+?) \|.*$/gm)];
  return rows.map((row) => ({
    leader: row[1]!.trim(),
    pair: [cell(row[2]!), cell(row[3]!)],
  }));
}

/** One cell of the table: "maroon `#8b2635`" → ["maroon", "#8b2635"]. */
function cell(text: string): [string, string] {
  const match = /^(.*?)\s*`(#[0-9a-f]{6})`$/.exec(text.trim());
  if (!match) throw new Error(`the colours table has no name and hex in "${text}"`);
  return [match[1]!.trim(), match[2]!];
}

// --- the doc and the data ----------------------------------------------------

describe('the palette and the sheet', () => {
  it('carries the same six figures, the same hexes and the same words', () => {
    const rows = docColourRows();
    expect(rows).toHaveLength(LEADER_IDS.length);
    rows.forEach((row, at) => {
      const def = leaderDef(LEADER_IDS[at]!);
      expect(row.leader, `row ${at}`).toBe(def.name);
      expect(row.pair[0]![1], `${def.name} primary`).toBe(def.colors.primary);
      expect(row.pair[1]![1], `${def.name} secondary`).toBe(def.colors.secondary);
      expect(row.pair[0]![0], `${def.name} primary word`).toBe(def.colors.names[0]);
      expect(row.pair[1]![0], `${def.name} secondary word`).toBe(def.colors.names[1]);
    });
  });

  it('names the doc’s own distance in code and nowhere else', () => {
    // The number is the doc's, written once, and the doc says so out loud.
    expect(DOC).toMatch(/hue distance is forty/);
    expect(MIN_INK_DISTANCE).toBe(40);
  });
});

// --- two seats never share a primary -----------------------------------------

describe('the primaries', () => {
  /**
   * **Nobody wears anybody else's colour**, and the failure is the kind nobody
   * reports: two empires whose borders are the same green are not a bug a player
   * files, they just lose track of whose land they are standing in. So the pin
   * names the offending pair rather than merely failing.
   */
  it('are six distinct inks, none within the palette’s distance of another', () => {
    const inks: { name: string; hex: string }[] = [
      ...LEADER_IDS.map((id) => ({ name: leaderDef(id).name, hex: leaderDef(id).colors.primary })),
      ...SEATS.map((seat) => ({ name: `seat · ${seat.name}`, hex: seat.color })),
    ];
    expect(new Set(LEADER_IDS.map((id) => leaderDef(id).colors.primary)).size).toBe(
      LEADER_IDS.length,
    );
    for (let a = 0; a < inks.length; a++) {
      for (let b = a + 1; b < inks.length; b++) {
        const gap = inkDistance(inks[a]!.hex, inks[b]!.hex);
        expect(
          gap,
          `${inks[a]!.name} (${inks[a]!.hex}) and ${inks[b]!.name} (${inks[b]!.hex}) are ` +
            `${gap.toFixed(1)} apart, under ${MIN_INK_DISTANCE}`,
        ).toBeGreaterThanOrEqual(MIN_INK_DISTANCE);
      }
    }
  });

  it('measures a pair symmetrically, and calls a colour nothing from itself', () => {
    expect(inkDistance('#8b2635', '#8b2635')).toBe(0);
    expect(inkDistance('#8b2635', '#2e8b6e')).toBeCloseTo(inkDistance('#2e8b6e', '#8b2635'), 12);
  });
});

// --- the one fallback --------------------------------------------------------

describe('seatInks', () => {
  it('hands back what a seat names, and the board’s ink where it names none', () => {
    expect(seatInks({ color: '#8b2635', secondary: '#e0b21a' })).toEqual({
      primary: '#8b2635',
      secondary: '#e0b21a',
    });
    expect(seatInks({ color: '#c08a2b' }).secondary).toBe(DERIVED_SECONDARY);
    // A chair nobody is in has no primary at all, which sends the diorama to its
    // own fallback order rather than to a colour this module made up.
    expect(seatInks(undefined)).toEqual({ primary: '', secondary: DERIVED_SECONDARY });
  });

  it('falls back to the ink the board already draws its outlines in', () => {
    // `palette.ink`, and the renderer hands exactly that to `MaterialLibrary`
    // as the outline colour — which is why a plain seat's pieces keep the line
    // they have always had rather than growing a new one.
    expect(VIEW3D.palette.ink).toBe(Number.parseInt(DERIVED_SECONDARY.slice(1), 16));
    expect(source('render3d/renderer3d.ts')).toMatch(
      /new MaterialLibrary\(LOOK\.rampSteps, VIEW3D\.palette\.ink!\)/,
    );
  });

  /**
   * **The one door.** Every surface that has to decide what a seat with no
   * second ink wears asks this module; a `?? '#` or a `.secondary ||` anywhere
   * else is a second fallback, and two fallbacks drift.
   */
  it('is the only place the fallback is written', () => {
    const files = import.meta.glob('../../src/**/*.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    for (const [path, text] of Object.entries(files)) {
      if (path.endsWith('/seatInks.ts')) continue;
      expect(text.includes('secondary ??'), path).toBe(false);
      expect(text.includes('secondary ||'), path).toBe(false);
    }
  });
});

// --- a seat's pair is config -------------------------------------------------

describe('the pair in the config', () => {
  it('is written onto the seat a figure is cast in, and onto no other', () => {
    const roster = [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Bors', color: '#1f8a85' },
      { name: 'Cleo', color: '#c08a2b' },
    ];
    const seated = seatLeaders(roster, 'pachacuti', 7);
    expect(seated[0]!.color).toBe(leaderDef('pachacuti').colors.primary);
    expect(seated[0]!.secondary).toBe(leaderDef('pachacuti').colors.secondary);
    for (const spec of seated.slice(1)) {
      // Every rival plays a figure too (L4), so each carries that figure's pair.
      const leader = spec.leader!;
      expect(spec.color).toBe(leaderDef(leader).colors.primary);
      expect(spec.secondary).toBe(leaderDef(leader).colors.secondary);
    }
  });

  it('leaves a seat under nobody with the palette’s ink and no second key', () => {
    // One chair, so `rivalLeaders` has nobody to cast: the table is plain.
    const seated = seatLeaders([{ name: 'Ada', color: '#d4502e', isHuman: true }], NO_LEADER, 3);
    expect(seated[0]!.color).toBe('#d4502e');
    expect('secondary' in seated[0]!).toBe(false);
    expect('leader' in seated[0]!).toBe(false);
  });

  /**
   * **The replay pin.** `secondary` is config and never state, so a roster that
   * never heard of it has to snapshot byte-for-byte as it did before the pair
   * existed — the argument `charge`, `persona` and `leader` each make in turn on
   * `PlayerSpec`.
   */
  it('snapshots byte-identically for a roster that names none', () => {
    const plain = createGame({
      seed: 41,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#d4502e', isHuman: true },
        { name: 'Bors', color: '#1f8a85' },
      ],
    });
    const raw = snapshotState(plain.state);
    expect(raw.includes('"secondary"')).toBe(false);
    expect(plain.config.players.every((spec) => !('secondary' in spec))).toBe(true);

    // …and a roster that *does* name one carries it, once, on the seat.
    const painted = createGame({
      seed: 41,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#8b2635', secondary: '#e0b21a', isHuman: true },
        { name: 'Bors', color: '#1f8a85' },
      ],
    });
    expect(painted.state.players[0]!.secondary).toBe('#e0b21a');
    expect(painted.state.players[1]!.secondary).toBeUndefined();
    expect(snapshotState(painted.state)).not.toBe(raw);
  });
});

// --- the diorama's door ------------------------------------------------------

describe('playerPieceColor', () => {
  it('takes a literal hex at its word, so a figure’s ink reaches the board', () => {
    expect(playerPieceColor('#8b2635', 0)).toBe(0x8b2635);
    expect(playerPieceColor('#E0B21A', 5)).toBe(0xe0b21a);
    // Ranked below the named table, which is what keeps the two historic panel
    // colours mapped onto their muted diorama twins.
    expect(playerPieceColor('#d4502e', 4)).toBe(VIEW3D.palette.crimson);
    // …and above nothing at all, which still falls to the seat's own order.
    const order = VIEW3D.players.fallbackOrder;
    expect(playerPieceColor('', 3)).toBe(order[3]);
  });

  /**
   * **Nothing that shipped before the clause moved.** Every one of the twelve
   * palette seats either sits in `byColor` or *is* the palette hex its fallback
   * slot names, so the literal clause resolves each of them to exactly the
   * number the fallback order was already handing out.
   */
  it('leaves every palette seat on the number it always had', () => {
    const order = VIEW3D.players.fallbackOrder;
    SEATS.forEach((seat, index) => {
      const named = VIEW3D.players.byColor[seat.color.toLowerCase()];
      const expected = named ?? order[index % order.length];
      expect(playerPieceColor(seat.color, index), `${seat.name} (${seat.color})`).toBe(expected);
    });
  });
});

// --- the border's two strips -------------------------------------------------

describe('the border', () => {
  it('is a line and a stitch, and the stitch lies inside the line', () => {
    const line = primary();
    const stitch = stitchOf();
    expect(stitch).not.toBeNull();
    expect(stitch!.width).toBeGreaterThan(0);
    expect(stitch!.width).toBeLessThan(line.width);
    // Inset by the *whole* of the line, so a contested edge still meets its
    // neighbour with primary against primary and the trim never reaches the seam.
    expect(stitch!.inset).toBeCloseTo(line.width, 12);
    expect(line.inset).toBe(0);
  });

  it('reads its width from the sheet and names no figure in code', () => {
    expect(VIEW3D.territory.stitchWidth).toBeGreaterThan(0);
    const text = source('render3d/cities3d.ts');
    const body = text.slice(
      text.indexOf('export function stitchBand'),
      text.indexOf('export function borderBandMatrix'),
    );
    expect(body).toMatch(/TERRITORY\.stitchWidth/);
    expect(body).not.toMatch(/=\s*0\.\d/);
  });

  /**
   * **Instanced once per board build**, which is the whole of what the extra
   * strip costs: the layer collects it in the same sweep it collects the line,
   * so a country's edge is two entries in two buckets and nothing per frame.
   */
  it('collects both strips in the one sweep the layer already walks', () => {
    const text = source('render3d/cities3d.ts');
    const at = text.indexOf('export class TerritoryLayer');
    const build = text.slice(at, text.indexOf('get drawCalls', at));
    // One `flush`, one walk over the owned tiles, and the strips inside it.
    expect([...build.matchAll(/collector\.flush\(/g)]).toHaveLength(1);
    expect([...build.matchAll(/for \(let index = 0/g)]).toHaveLength(1);
    expect(build).toMatch(/stitchBand\(\)/);
    expect(build).toMatch(/primaryBand\(\)/);
    // Asked once for the whole sweep rather than per tile.
    expect(build.indexOf('const stitch = stitchBand()')).toBeLessThan(
      build.indexOf('for (let index = 0'),
    );
  });
});

// --- the canton's two inks ---------------------------------------------------

describe('the canton', () => {
  /**
   * **The device is never in the field's own ink** — the heraldry rule, kept one
   * ink over (CLAUDE.md's Heraldry trap, and `docs/flags.md` (oooo)). A pin on
   * the source because the two halves are a *pair of properties* and a surface
   * that wrote one and forgot the other would print a mark nobody can see.
   */
  it('paints its field in the primary and its device in the secondary', () => {
    for (const path of ['ui/leaderSelect.ts', 'ui/leaderSheet.ts', 'ui/cityBanners.ts']) {
      const text = source(path);
      expect(text, path).toMatch(/--canton-field/);
      expect(text, path).toMatch(/--canton-device/);
      expect(text, path).toMatch(/inks\.secondary|colors\.secondary/);
    }
    // And the stylesheet reads them in those two roles and no other.
    const css = source('style.css');
    const rule = css.slice(css.indexOf('.leader-canton {'), css.indexOf('.leader-face-text {'));
    expect(rule).toMatch(/background:\s*var\(--canton-field\)/);
    expect(rule).toMatch(/background:\s*var\(--canton-device\)/);
  });

  it('rims the city plate in the owner’s primary', () => {
    const css = source('style.css');
    const rule = css.slice(css.indexOf('.city-banner {'), css.indexOf('.city-banner-canton'));
    expect(rule).toMatch(/border:[^;]*var\(--banner-color/);
  });
});

// --- the roster surfaces -----------------------------------------------------

describe('every roster surface prints the pair', () => {
  it('hands the picker each figure’s two inks and its two words', () => {
    const faces = leaderFaces();
    expect(faces).toHaveLength(LEADER_IDS.length);
    faces.forEach((face, at) => {
      const def = leaderDef(LEADER_IDS[at]!);
      expect(face.colors).toEqual({
        primary: def.colors.primary,
        secondary: def.colors.secondary,
      });
      expect(face.colorWords).toEqual(def.colors.names);
    });
  });

  it('names a figure’s colours on its shelf in the book, in words', () => {
    const shelf = compendiumSections().find((section) => section.id === 'leader')!;
    for (const id of LEADER_IDS) {
      const page = shelf.entries.find((entry) => entry.id === `leader:${id}`)!;
      const printed = page.clauses.map((clause) => clause.text).join('\n');
      const [first, second] = leaderDef(id).colors.names;
      expect(printed, id).toContain(`Its colours are ${first} and ${second}.`);
      // A hex is an identifier and never reaches a reader (hard rule 7).
      expect(printed, id).not.toMatch(/#[0-9a-f]{6}/i);
    }
  });

  it('reads the pair through the one door on the spectator and the arena', () => {
    for (const path of ['spectate/main.ts', 'arenaPage/main.ts']) {
      expect(source(path), path).toMatch(/seatInks\(/);
    }
  });
});

// --- the gallery -------------------------------------------------------------

describe('the flair gallery', () => {
  it('registers the stall, and repaints nothing it exists to inspect', () => {
    const gallery = source('flairGallery/flourishes.ts');
    expect(gallery).toMatch(/\bseatInksStall\(into\);/);
    const at = gallery.indexOf('function seatInksStall');
    expect(at).toBeGreaterThan(0);
    const body = gallery.slice(at, gallery.indexOf('\n}\n', at));
    // The figures come off the sheet, the shapes are the shipping ones, and the
    // three sliders are the three dials the ruling asks for.
    expect(body).toMatch(/leaderFaces\(\)/);
    expect(body).toMatch(/'leader-canton'/);
    expect(body).toMatch(/VIEW3D\.pieces\.badgeScale/);
    expect(body).toMatch(/VIEW3D\.pieces\.badgeRing/);
    expect(body).toMatch(/VIEW3D\.territory\.stitchWidth/);
    expect([...body.matchAll(/\bslider\(/g)]).toHaveLength(3);
    // No palette of its own: a hex written here would be the page inventing a
    // colour for a figure rather than showing the one it has.
    expect(body).not.toMatch(/#[0-9a-f]{6}/i);
  });
});

// The two strip readings, imported late so the describes above read first.
import { primaryBand as primary, stitchBand as stitchOf } from '../../src/render3d/cities3d';
