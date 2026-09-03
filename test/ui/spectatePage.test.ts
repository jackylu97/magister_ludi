/**
 * The spectate page, at the properties that are not visible from a screenshot.
 *
 * There is no jsdom in this suite (see `controls.test.ts`), so this reads the
 * sources — which is the right shape anyway, because every rule below is about
 * *which function the page asked* rather than about what it drew:
 *
 *   · **It drives nothing itself.** Every command goes through
 *     `createBotStepper`, which `test/sim/aiDecision.slow.test.ts` pins
 *     byte-identical to `driveBots`. A page with a loop of its own — a
 *     `dispatch`, a `nextBotCommand`, a hand-rolled seat sweep — would be a page
 *     showing a game the product does not play, and every conclusion drawn from
 *     it about the bot would be worthless.
 *   · **It holds no opinion.** It never reads the weight vector, never scores,
 *     never sorts by anything but a number the bot produced. The candidate table
 *     is evidence, and evidence a page has re-derived is not evidence.
 *   · **It is a root page like the others.** Named in `vite.config.ts` inputs
 *     (or `npm run build` silently stops producing it), and every element its
 *     entry module looks up actually exists in the HTML — the one class of
 *     breakage that turns the whole page into a blank canvas and a thrown error.
 */

import { describe, expect, it } from 'vitest';

const PAGE = import.meta.glob('../../src/spectate/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const HTML = import.meta.glob('../../spectate.html', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const VITE_CONFIG = import.meta.glob('../../vite.config.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const STYLE = import.meta.glob('../../src/spectate/style.css', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const main = Object.values(PAGE).join('\n');
const html = Object.values(HTML).join('\n');
const viteConfig = Object.values(VITE_CONFIG).join('\n');
const style = Object.values(STYLE).join('\n');

/** Comments stripped, so a rule about code is never satisfied by prose about it. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('the spectate page is a root page', () => {
  it('exists, is named in the build inputs, and mounts its own entry module', () => {
    expect(html.length).toBeGreaterThan(0);
    expect(viteConfig).toContain("spectate: 'spectate.html'");
    expect(html).toContain('src="/src/spectate/main.ts"');
  });

  it('looks up only elements the page actually has', () => {
    const wanted = [...code(main).matchAll(/need<[^>]*>\('([^']+)'\)/g)].map((match) => match[1]!);
    expect(wanted.length).toBeGreaterThan(8);
    const missing = wanted.filter((id) => !html.includes(`id="${id}"`));
    expect(missing).toEqual([]);
  });

  it('owns its own stylesheet rather than editing the game’s', () => {
    expect(main).toContain("import './style.css'");
    // The specimen's one hard rule for a page of figures: every countable thing
    // is tabular mono. A column of scores that jitters as digits change width
    // cannot be read down, and reading it down is the whole point.
    expect(style).toContain('tabular-nums');
    expect(style).toContain('--face-mono');
  });
});

describe('the page never plays the game itself', () => {
  it('drives every command through the stepper and nothing else', () => {
    const text = code(main);
    expect(text).toContain('createBotStepper');
    // Four ways a page could quietly grow a second loop, and all four are the
    // same bug: a game on screen that the product would not have played.
    for (const banned of ['driveBots', 'nextBotCommand', 'nextBotDecision', 'driveSeat']) {
      expect(text).not.toContain(banned);
    }
    expect(text).not.toMatch(/\bdispatch\s*\(/);
  });

  it('forms no opinion of its own about a candidate', () => {
    const text = code(main);
    // The tuning surface and the appraisal both belong to the bot. A page that
    // imported either would be a page that could print a number the seat never
    // used to decide anything.
    for (const banned of ["from '../ai/value'", "from '../ai/aiConfig'", "from '../ai/bot'"]) {
      expect(text).not.toContain(banned);
    }
    // A **persona** is the exception that proves the rule, and it is not one: a
    // name is a roster entry, not a weight. The names come through the stepper
    // (which the page already speaks to about bots), and no number behind them
    // is ever reachable from here — nothing on this page reads `weights`,
    // `score`, `solvency` or any other block of the sheet.
    for (const knob of ['weights', 'solvency', 'aiConfigFor', 'yieldWeight']) {
      expect(text).not.toContain(knob);
    }
    // The one sort it does is a declared reading order, and it comes from the
    // vocabulary module rather than being written here.
    expect(text).toContain('rankedCandidates');
    expect(text).not.toMatch(/\.sort\(/);
  });

  it('draws the board with no seat, so nothing is fogged from a spectator', () => {
    // The bot is omniscient by construction (`bot.ts`' creed), so a fogged board
    // beside its reasoning would be a picture of a game nobody is playing.
    expect(code(main)).toContain('setFogSeat(null)');
  });
});

describe('the feed prints the decision rather than a paraphrase of it', () => {
  it('shows every candidate, its score, its terms and the rules’ own refusal', () => {
    const text = code(main);
    expect(text).toContain('candidate.score');
    expect(text).toContain('candidate.terms');
    expect(text).toContain('candidate.rejected');
    expect(text).toContain('decision.summary');
    // The operator is printed rather than inferred from the sign: `− 12` and
    // `÷ 6` are two different things happening to the accumulator.
    expect(text).toMatch(/case 'div'/);
  });

  it('offers the two speeds the brief asked for and no third', () => {
    expect(html).toContain('id="next-action"');
    expect(html).toContain('id="play-turn"');
    expect(code(main)).toContain('turnResolved');
  });

  it('seats a persona, and writes balanced as no key at all', () => {
    // The tuning surface the user actually turns: a way of playing, chosen on
    // the setup strip and carried into the game's config so a seed and a persona
    // reproduce the same spectacle.
    expect(html).toContain('id="persona"');
    const text = code(main);
    expect(text).toContain('PERSONA_IDS');
    expect(text).toContain('personaLabel');
    // Balanced leaves no key behind, which is what keeps a default game's config
    // byte-identical to one from before personas existed.
    expect(text).toContain('DEFAULT_PERSONA');
  });
});

/**
 * **A new decision kind costs this page nothing** (P3: `war` and `deal`).
 *
 * The feed prints `decision.kind` as a word and the candidate table as the
 * decision's own rows, so the two kinds the war pass added — a declaration or a
 * peace, and a bargain offered or answered — render the day they exist with
 * nothing here to update. That is worth pinning rather than assuming: a page
 * that grew a `switch` on the kind would be a page that silently omitted the
 * next one, and the whole value of this feed is that it cannot omit anything.
 */
describe('the feed knows no kinds', () => {
  it('prints the kind rather than branching on it', () => {
    const text = code(main);
    expect(text).toContain('decision.kind');
    // No per-kind branch anywhere: not the six the brain shipped with, and not
    // the two the war pass added.
    for (const kind of ['build', 'research', 'draft', 'unitOrder', 'purchase', 'war', 'deal']) {
      expect(text).not.toContain(`'${kind}'`);
    }
  });
});
