/**
 * The spend ceremony — the card rises, the legacy counts, the deed appears.
 *
 * `docs/doctrine-ideas.md`, "The great person's three beats", re-ruled
 * 2026-09-03 as the **inversion**: the legacy is the animated content and the
 * act or work is the footnote under it. Everything this file guards is a thing
 * that renders perfectly while being wrong — a ceremony raised on a refused
 * command, a deed's figure composed beside the simulation instead of taken from
 * it, a card that counts the deed as though it were a rate, four beats that no
 * longer agree with the four durations in the stylesheet.
 *
 * No jsdom in this suite, so the beats are the exported constant and the wiring
 * is read at the source. What is driven for real is what the ceremony *says*.
 */

import { describe, expect, it } from 'vitest';

import { CEREMONY_TIMING, deedLine } from '../../src/ui/greatPersonCeremony';
import { greatPersonFace, legacyIsSilent } from '../../src/ui/greatPersonFace';
import { type GameState, newGame } from '../../src/sim/state';

const SOURCE = {
  ...(import.meta.glob('../../src/ui/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
  ...(import.meta.glob('../../src/main.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
  ...(import.meta.glob('../../index.html', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
};

const STYLE = Object.values(
  import.meta.glob('../../src/style.css', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>,
)[0] ?? '';

function raw(file: string): string {
  const key = Object.keys(SOURCE).find((path) => path.endsWith(`/${file}`));
  expect(`${file} readable`).toBe(key === undefined ? `${file} missing` : `${file} readable`);
  return SOURCE[key!]!;
}

function source(file: string): string {
  return raw(file)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function twoSeats(): GameState {
  return newGame({
    seed: 5,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
}

const CEREMONY = source('greatPersonCeremony.ts');
const CONTROLS = source('controls.ts');

// --- when it fires ----------------------------------------------------------

describe('the ceremony fires on an accepted command and on nothing else', () => {
  it('is raised after the result is checked, past the refusal’s own return', () => {
    const at = CONTROLS.indexOf("function spendGreatPerson(verb: 'act' | 'work')");
    expect(at).toBeGreaterThan(-1);
    const body = CONTROLS.slice(at, CONTROLS.indexOf('function chopBlocker(', at));
    // The refusal returns first — so everything below it, this callback
    // included, is reached only by an accepted command.
    const refused = body.indexOf('if (!result.ok) {');
    const raised = body.indexOf('onGreatPersonSpent?.(');
    expect(refused).toBeGreaterThan(-1);
    expect(raised).toBeGreaterThan(refused);
    expect(body.slice(refused, raised)).toContain('return;');
    // And it is the only place in the interface that raises one.
    const all = Object.entries(SOURCE).filter(
      ([path, text]) => path.includes('/src/') && text.includes('onGreatPersonSpent?.('),
    );
    expect(all.map(([path]) => path.split('/').pop())).toEqual(['controls.ts']);
  });

  it('carries the person by id and the deed by the preview the sim composed', () => {
    expect(CONTROLS).toContain('onGreatPersonSpent?.({ id: spent, verb, deed: said })');
    // `said` is the preview, read **before** the command — which is the same
    // argument the announcement one line above makes: the piece is gone by the
    // time the result comes back, and `greatPeople.ts` composes an act's figure
    // once before anything is banked (Entry XVIII.5), so the preview and the
    // payout are one number.
    expect(CONTROLS).toContain("const said = verb === 'act' ? view.act.preview : view.work.preview;");
    // Nothing in the ceremony recomputes a payout.
    expect(CEREMONY).not.toContain('actGainOf');
    expect(CEREMONY).not.toContain('RULES');
  });

  it('is wired into main against the ceremony and nothing else', () => {
    const main = source('main.ts');
    expect(main).toContain('onGreatPersonSpent: (spend) => {');
    expect(main).toContain('ceremony?.play(spend);');
    expect(main).toContain('ceremony = createGreatPersonCeremony({');
    expect(raw('index.html')).toContain('id="ceremony-overlay"');
  });
});

// --- what it says -----------------------------------------------------------

describe('the deed line', () => {
  it('says which verb was taken, and quotes the simulation’s own figure', () => {
    expect(deedLine({ id: 'imhotep', verb: 'act', deed: '+184🔬 toward Writing' })).toBe(
      'the act paid +184🔬 toward Writing',
    );
    expect(deedLine({ id: 'imhotep', verb: 'work', deed: 'Academy here · +3🔬' })).toBe(
      'the work stands · Academy here · +3🔬',
    );
  });
});

describe('the inversion', () => {
  it('counts the legacy and never the deed', () => {
    // The stamp is built from `face.stamp`, which is the legacy's ghost-diff.
    // A deed is a one-time grant and counting to it would be a per-turn lie —
    // `cardStamp.ts`'s own argument for the occasion face.
    expect(CEREMONY).toContain('cancelStamp = playCardStamp(stamp, face.stamp)');
    expect(CEREMONY).not.toContain('playCardStamp(stamp, spend');
    // And the deed simply appears.
    expect(CEREMONY).toContain('said.hidden = false;');
  });

  it('puts the legacy in the headline, through the descriptor renderer', () => {
    expect(CEREMONY).toContain('setDescriptorText(line, clause.text, { linked })');
    expect(CEREMONY).toContain('keywordsAllowedIn(card)');
    expect(CEREMONY).not.toMatch(/textContent = clause\.text/);
  });

  it('promotes the deed for a person whose legacy this build does not keep', () => {
    expect(CEREMONY).toContain('const promoted = legacyIsSilent(face.legacy);');
    expect(CEREMONY).toContain("promoted ? 'offer-clause gp-ceremony-promoted' : 'gp-ceremony-deed'");
    // And it arrives where the number would have been weighed rather than at the
    // deed's late beat — otherwise the card stands wordless for two seconds.
    expect(CEREMONY).toContain(
      'saidAtMs: promoted ? CEREMONY_TIMING.stampMs : CEREMONY_TIMING.deedMs,',
    );
    // The two roster rows this is actually for.
    const state = twoSeats();
    for (const id of ['heroOfAlexandria', 'yiSunSin'] as const) {
      expect(legacyIsSilent(greatPersonFace(state, 0, id).legacy), id).toBe(true);
    }
    // …and a person whose legacy is real is not promoted.
    expect(legacyIsSilent(greatPersonFace(state, 0, 'imhotep').legacy)).toBe(false);
  });

  it('draws the offer card’s own tarot face', () => {
    expect(CEREMONY).toContain("element('div', 'offer-options gp-ceremony-host')");
    expect(CEREMONY).toContain("host.dataset.face = 'tarot'");
    expect(CEREMONY).toContain("element('article', 'offer-option gp-ceremony-card')");
  });
});

// --- the beats --------------------------------------------------------------

describe('the four beats', () => {
  it('runs in the mock’s order and lands inside four and a half seconds', () => {
    const t = CEREMONY_TIMING;
    expect(t.stampMs).toBeLessThan(t.deedMs);
    expect(t.deedMs).toBeLessThan(t.descendMs);
    expect(t.descendMs).toBeLessThan(t.closeMs);
    // The overlay must not come down while the descent is still playing.
    expect(t.descendMs + t.descendDurationMs).toBeLessThanOrEqual(t.closeMs);
    expect(t.closeMs).toBeLessThanOrEqual(4500);
  });

  it('schedules every beat off that one constant', () => {
    for (const beat of [
      'after(CEREMONY_TIMING.stampMs',
      'after(saidAtMs',
      'after(CEREMONY_TIMING.descendMs',
      'after(CEREMONY_TIMING.closeMs, close)',
      'after(CEREMONY_TIMING.reducedHoldMs, close)',
    ]) {
      expect(CEREMONY, beat).toContain(beat);
    }
    // No hand-rolled millisecond anywhere in the schedule.
    expect(CEREMONY).not.toMatch(/setTimeout\([^,]+,\s*\d+\)/);
  });

  it('agrees with the stylesheet on how long each movement takes', () => {
    // The module owns *when*, the stylesheet owns *how long* — two halves of one
    // clock, and a card that descended for 900ms on a 600ms schedule would be a
    // card cut off mid-flight.
    expect(STYLE).toContain(`animation: gp-rise ${CEREMONY_TIMING.riseMs}ms`);
    expect(STYLE).toContain(`animation: gp-descend ${CEREMONY_TIMING.descendDurationMs}ms`);
    expect(STYLE).toContain('@keyframes gp-rise');
    expect(STYLE).toContain('@keyframes gp-descend');
    // The descent is aimed, not guessed: two properties measured at the moment
    // it starts, because where the renown chip is depends on the window.
    expect(STYLE).toContain('var(--gp-descend-x, 0px)');
    expect(CEREMONY).toContain("card.style.setProperty('--gp-descend-x'");
  });

  it('lets a click anywhere cut it short', () => {
    expect(CEREMONY).toContain('const onClick = (): void => close();');
    expect(CEREMONY).toContain("overlay.addEventListener('click', onClick)");
    expect(CEREMONY).toContain("overlay.removeEventListener('click', onClick)");
  });
});

describe('reduced motion', () => {
  it('arrives already landed and holds, rather than playing faster', () => {
    expect(CEREMONY).toContain("'(prefers-reduced-motion: reduce)'");
    const arm = CEREMONY.slice(
      CEREMONY.indexOf('if (!wantsMotion()) {'),
      CEREMONY.indexOf("card.dataset.phase = 'rising';"),
    );
    expect(arm).toContain("card.dataset.phase = 'landed';");
    expect(arm).toContain('landCardStamp(stamp, face.stamp);');
    expect(arm).toContain('said.hidden = false;');
    expect(arm).toContain('after(CEREMONY_TIMING.reducedHoldMs, close);');
    expect(arm).not.toContain('playCardStamp');
  });

  it('switches every keyframe off in the stylesheet, not down', () => {
    const at = STYLE.indexOf('@media (prefers-reduced-motion: reduce)', STYLE.indexOf('@keyframes gp-descend'));
    expect(at).toBeGreaterThan(-1);
    const media = STYLE.slice(at);
    for (const selector of [
      '.gp-ceremony-overlay',
      '.gp-ceremony-card',
      ".gp-ceremony-card[data-phase='descending']",
      '.gp-ceremony-deed',
      '.rel-card.is-flipping',
    ]) {
      expect(media, selector).toContain(selector);
    }
    expect(media).toContain('animation: none');
  });
});

// --- the lifecycle ----------------------------------------------------------

describe('the ceremony’s lifecycle', () => {
  it('cancels its timers and the stamp’s count on the way down', () => {
    expect(CEREMONY).toContain('for (const id of timers) window.clearTimeout(id);');
    expect(CEREMONY).toContain('cancelStamp();');
    expect(CEREMONY).toMatch(/function close\(\): void \{[\s\S]{0,200}clearTimers\(\);/);
  });

  it('is registered with the per-game screens and shut by the two sweeps', () => {
    const main = source('main.ts');
    expect(main).toContain('gameDisposers.push(() => ceremony?.dispose());');
    expect(main).toContain('ceremony?.close();');
    expect(main).toContain('(ceremony?.isOpen ?? false)');
  });
});
