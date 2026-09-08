/**
 * **The wanting voice**: one class for every line that says "you have not got X".
 *
 * The user's ruling (2026-09-08, `docs/flags.md` item (eee)): *"have the 'taught
 * by ____' in small red italicized script, similar to how tile yields display.
 * Anywhere the game tells the player they're missing a prerequisite
 * tech/building/condition, please keep the same styling."* That is a claim about
 * a dozen surfaces at once, and it is exactly the sort of claim that rots: a
 * thirteenth surface prints a refusal in whatever ink its own section happened
 * to set, nothing breaks, and the interface has two voices for one sentence
 * again. So the register is read off the sources — `seatRoster.test.ts`'s and
 * `keywords.test.ts`'s instrument, and the right one here, because "which line
 * wears which class" is a fact about the code rather than about a run.
 *
 * Three claims, and each fails a different way:
 *
 *   1. **One rule, one vermilion.** Three surfaces used to paint their own
 *      (`.info-card-state.is-blocked`, `.unit-card-blocked`,
 *      `.sc-commit-problem`); they were folded, and a fold that leaves the old
 *      declaration behind is a fold that did nothing.
 *   2. **The rule outranks its hosts.** Nearly every host line sets its own ink
 *      later in the sheet, so the selector is written twice for the one point of
 *      specificity that buys — which reads like a typo and would be "tidied"
 *      away in a heartbeat. The day it was a single class, the rite's "Taught
 *      by" line shipped in the host's grey.
 *   3. **Every refusal line wears it, and nothing else does.** A line that
 *      reports a *state* which is not a lack — "Researched", "Being researched",
 *      "3 in the plan", "already running", the bead gate's met tick — stays in
 *      its own quiet ink. That distinction is the whole of the sweep's rule and
 *      it can only be pinned line by line.
 */

import { describe, expect, it } from 'vitest';

import { braceBody, uiSource } from './sourceHelpers';

/** The stylesheet with its prose taken out — this file's own explanations of a
 *  rule would otherwise keep matching instead of the rule. `cityScreen.test.ts`'s
 *  reader, for its reason. */
function css(): string {
  return uiSource('style.css').replace(/\/\*[\s\S]*?\*\//g, '');
}

/** The declarations of one rule, by its exact selector list. */
function rule(selector: string): string {
  const text = css();
  const at = text.indexOf(`\n${selector} {`);
  if (at < 0) throw new Error(`style.css has no rule for "${selector}"`);
  const open = text.indexOf('{', at);
  return text.slice(open + 1, text.indexOf('}', open));
}

/* ---------------------------------------------------------------------------
   Resolving the cascade, which is the only way to ask the real question.

   "Is this line vermilion" is not a fact about a class list or about a rule; it
   is a fact about which of several matching rules *wins*, and every one of the
   ways this sweep can fail is a way of losing that contest quietly — a host that
   sets its own ink later in the sheet, a descendant rule that outranks the
   class, a doubled selector someone tidies back to one. No behavioural test can
   see it (this suite has no DOM, `vite.config.ts` — `environment: 'node'`), so
   the sheet is read and the contest is settled here.

   Deliberately small: the selector shapes this stylesheet uses on these lines
   and no others — an id, chains of classes, `:disabled`, `:not(…)`, descendant
   combinators. A selector with a child or sibling combinator matches nothing
   here, which is safe in the direction that matters: it can only make a rule
   *lose*, and every claim below is that a rule wins.
   --------------------------------------------------------------------------- */

/** One element in the chain under test: the classes on it, and whether it is a
 *  disabled control. */
interface Node {
  classes: Set<string>;
  id?: string;
  disabled?: boolean;
}

interface Rule {
  selector: string;
  body: string;
  order: number;
}

function sheetRules(): Rule[] {
  const out: Rule[] = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  const text = css();
  let match: RegExpExecArray | null;
  let order = 0;
  while ((match = pattern.exec(text)) !== null) {
    for (const selector of match[1]!.split(',').map((s) => s.trim()).filter(Boolean)) {
      out.push({ selector, body: match[2]!, order: order++ });
    }
  }
  return out;
}

function compoundMatches(compound: string, node: Node): boolean {
  const parts = compound.match(/#[\w-]+|\.[\w-]+|:not\([^)]*\)|:[\w-]+(?:\([^)]*\))?|[a-zA-Z][\w-]*/g);
  if (parts === null) return false;
  for (const part of parts) {
    if (part.startsWith('#')) {
      if (node.id !== part.slice(1)) return false;
    } else if (part.startsWith('.')) {
      if (!node.classes.has(part.slice(1))) return false;
    } else if (part.startsWith(':not(')) {
      if (compoundMatches(part.slice(5, -1), node)) return false;
    } else if (part === ':disabled') {
      if (node.disabled !== true) return false;
    } else if (part.startsWith(':')) {
      return false;
    } else {
      return false;
    }
  }
  return true;
}

/** Does `selector` match the last node of `chain`, given its ancestors? */
function selectorMatches(selector: string, chain: Node[]): boolean {
  if (/[>+~]/.test(selector)) return false;
  const compounds = selector.split(/\s+/).filter(Boolean);
  let at = chain.length - 1;
  if (!compoundMatches(compounds[compounds.length - 1]!, chain[at]!)) return false;
  at -= 1;
  for (let index = compounds.length - 2; index >= 0; index -= 1) {
    let found = false;
    while (at >= 0) {
      const node = chain[at]!;
      at -= 1;
      if (compoundMatches(compounds[index]!, node)) {
        found = true;
        break;
      }
    }
    if (!found) return false;
  }
  return true;
}

function specificity(selector: string): number {
  const ids = (selector.match(/#[\w-]+/g) ?? []).length;
  const classes =
    (selector.match(/\.[\w-]+/g) ?? []).length + (selector.match(/:(?!not)[\w-]+/g) ?? []).length;
  return ids * 1000 + classes;
}

/** What the sheet finally says about one property for one element. */
function computed(chain: Node[], property: string): { value: string; selector: string } | null {
  let best: { value: string; selector: string; rank: number; order: number } | null = null;
  for (const item of sheetRules()) {
    if (!selectorMatches(item.selector, chain)) continue;
    const found = new RegExp(`(?:^|[;{\\n])\\s*${property}\\s*:\\s*([^;]+)`).exec(item.body);
    if (found === null) continue;
    const rank = specificity(item.selector);
    if (best === null || rank > best.rank || (rank === best.rank && item.order >= best.order)) {
      best = { value: found[1]!.trim(), selector: item.selector, rank, order: item.order };
    }
  }
  return best === null ? null : { value: best.value, selector: best.selector };
}

const on = (...classes: string[]): Node => ({ classes: new Set(classes) });
const off = (...classes: string[]): Node => ({ classes: new Set(classes), disabled: true });

/**
 * Every module under `src/ui/` that prints a wanting line, and the surface it
 * prints it on. Named rather than globbed: the point of the register is that a
 * surface is *listed*, so a new one is a deliberate line here rather than an
 * accident nobody notices.
 */
const SURFACES: { file: string; says: string; carries: string }[] = [
  // The city screen — the rite's "Taught by", the two hover-card notes that are
  // prerequisites, the queue's building and project previews, and the two
  // buildable rows whose price column has become a sentence.
  { file: 'cityPanel.ts', says: 'the rite a tech has not taught', carries: "'city-rite-says wanting'" },
  { file: 'cityPanel.ts', says: "a building's refusal", carries: "element('p', 'info-card-state wanting', problem)" },
  { file: 'cityPanel.ts', says: "a unit row's missing resource", carries: "price.classList.add('is-reason', 'wanting')" },
  { file: 'cityPanel.ts', says: "a building row's refusal", carries: "costSpan.classList.add('is-reason', 'wanting')" },
  // The star chart's node card, at the foot, under the two state lines that are
  // not lacks.
  { file: 'techTree.ts', says: "a node's refusal", carries: "element('p', 'info-card-state wanting', problem)" },
  // The bead card: the unmet gate, and the reducer's refusal under it.
  { file: 'beadsScreen.ts', says: 'a race this empire does not qualify for', carries: "gate.classList.toggle('wanting', !face.met)" },
  { file: 'beadsScreen.ts', says: "the race's refusal", carries: "element('p', 'info-card-state wanting', face.refusal)" },
  // The unit sheet's "Why not", and the blocked foot of a richer row's card.
  { file: 'unitPanel.ts', says: 'a refused verb', carries: "element('p', 'unit-card-blocked wanting', text)" },
  { file: 'unitPanel.ts', says: "a proclamation's refusal", carries: "element('p', 'unit-card-blocked wanting', row.blocked)" },
  // The trade sheet's greyed partner.
  { file: 'tradeScreen.ts', says: 'a route that cannot start', carries: "element('span', 'trade-candidate-why wanting', candidate.error)" },
  // The Statecraft sheet's arrangement.
  { file: 'statecraftScreen.ts', says: 'an arrangement that will not seal', carries: "element('p', 'sc-commit-problem wanting', problem)" },
  // The Reliquary's rail of calls.
  { file: 'reliquaryScreen.ts', says: 'a call the bank cannot pay for', carries: "call.disabled ? 'rel-call-note wanting' : 'rel-call-note'" },
];

describe('the wanting voice', () => {
  it('is one rule, and it says only colour and italic', () => {
    // Size, margin and face belong to the host line — the ruling asks for the
    // tile cell's *voice*, not for every refusal in the game to become 10px.
    const wanting = rule('.wanting.wanting,\n.tile-requires.is-wanting');
    expect(wanting).toContain('color: var(--vermilion)');
    expect(wanting).toContain('font-style: italic');
    expect(wanting).not.toMatch(/font-size|margin|font-family/);
  });

  it('is written twice on purpose, so it outranks the host line it sits on', () => {
    // The hosts, every one of which sets colour on the element itself and sits
    // later in the sheet than the rule above. A single `.wanting` loses to all
    // of them, which is not a theory: it is what happened to the city screen's
    // "Taught by" line the day it landed.
    const sheet = css();
    for (const host of [
      '.city-rite-says',
      '.info-card-state',
      '.bead-card-gate',
      '.rel-call-note',
      '.city-buildable-cost',
      '.trade-candidate-why',
    ]) {
      expect(rule(host)).toMatch(/color:/);
      expect(sheet.indexOf(`\n${host} {`)).toBeGreaterThan(sheet.indexOf('\n.wanting.wanting'));
    }
  });

  it('excuses the class where a host still outranks it', () => {
    // One descendant rule beats even the doubled class, and it is the one that
    // matters most: the row carrying "needs improved ⛏ Iron" is disabled.
    expect(css()).toContain('.city-buildable:disabled .city-buildable-cost:not(.wanting)');
  });

  it('folded the three vermilions that were doing its job', () => {
    // Each keeps its class for the layout it owns and takes its ink from
    // `.wanting`; the old declaration is gone, and `is-blocked` with it.
    expect(css()).not.toContain('.info-card-state.is-blocked');
    expect(rule('.unit-card-blocked')).not.toContain('--vermilion');
    expect(rule('.sc-commit-problem')).not.toContain('--vermilion');
    // The one restatement, and it is a legibility rule rather than a second
    // voice: vermilion does not carry on the night card's dark ground.
    expect(rule('.info-card.is-night .info-card-state.wanting')).toContain('color:');
  });

  it('is worn by every refusal line on every surface that prints one', () => {
    for (const surface of SURFACES) {
      expect(uiSource(surface.file), `${surface.file}: ${surface.says}`).toContain(
        surface.carries,
      );
    }
  });

  it('has retired the class it replaced, everywhere', () => {
    // `is-blocked` on an `info-card-state` was the old spelling of this voice on
    // three surfaces. The trade sheet keeps a class of the same name for a
    // different job — greying a whole refused row — which is why this looks for
    // the pair rather than for the word.
    for (const file of ['cityPanel.ts', 'techTree.ts', 'beadsScreen.ts', 'unitPanel.ts']) {
      expect(uiSource(file)).not.toContain("'info-card-state is-blocked'");
    }
  });

  it('leaves a line that reports a state rather than a lack alone', () => {
    // The star chart is where all three live in one `if`/`else`, so it is the
    // one place the distinction can be read straight off the source.
    const card = uiSource('techTree.ts');
    expect(card).toContain("element('p', 'info-card-state', 'Researched')");
    expect(card).toContain("element('p', 'info-card-state', `Being researched");
    expect(card).toContain("element('p', 'info-card-state is-planned'");
    // The bead card's met tick keeps its teal for the same reason.
    expect(uiSource('beadsScreen.ts')).toContain("gate.classList.toggle('is-met', face.met)");
    // And the trade sheet's "already running" is a state, not a refusal.
    expect(uiSource('tradeScreen.ts')).toContain(
      "element('span', 'trade-candidate-why', 'already running')",
    );
  });

  it('wins the cascade on every surface that prints one', () => {
    // One row per line the sweep touched, resolved against the whole sheet. Each
    // is a line that was checked by hand when the batch landed; this is the same
    // check, kept.
    const wanting: [string, Node[]][] = [
      ['the tile cell a technology has not opened', [on('tile-requires', 'is-wanting')]],
      ['the rite\'s "Taught by"', [on('city-rite-row'), on('city-rite-says', 'wanting')]],
      ['the queue card\'s refusal', [on('info-card'), on('info-card-state', 'wanting')]],
      ['the night card\'s refusal', [on('info-card', 'is-night'), on('info-card-state', 'wanting')]],
      [
        'the buildable row\'s "needs improved ⛏ Iron"',
        [off('city-buildable'), on('city-buildable-cost', 'is-reason', 'wanting')],
      ],
      ['the unit sheet\'s "Why not"', [on('unit-card'), on('unit-card-blocked', 'wanting')]],
      ['the bead gate, unmet', [on('bead-card'), on('bead-card-gate', 'wanting')]],
      [
        'the trade row that cannot start',
        [on('trade-candidate', 'is-blocked'), on('trade-candidate-why', 'wanting')],
      ],
      ['the arrangement that will not seal', [on('sc-commit-problem', 'wanting')]],
      ['the call the bank cannot pay for', [on('rel-call-note', 'wanting')]],
      ['the hover card\'s unmet note', [on('info-card-notes'), on('wanting')]],
    ];
    for (const [what, chain] of wanting) {
      const colour = computed(chain, 'color');
      // The night card is the one restatement, and it is a legibility rule: on
      // dark parchment the vermilion does not carry.
      const vermilion = chain[0]!.classes.has('is-night') ? '#f0a48f' : 'var(--vermilion)';
      expect(colour?.value, `${what}: ink`).toBe(vermilion);
      expect(computed(chain, 'font-style')?.value, `${what}: italic`).toBe('italic');
    }
  });

  it('leaves the lines that are not lacks in their own ink', () => {
    // The other half of the rule, and the half a sweep gets wrong: a state is
    // not a lack, and a surface that painted all of these vermilion would be
    // shouting at a player who has done nothing wrong.
    const quiet: [string, Node[], string][] = [
      ['a rite this seat can perform', [on('city-rite-says')], 'var(--ink-soft)'],
      ['"Researched"', [on('info-card'), on('info-card-state')], 'var(--ink-soft)'],
      ['"3 in the plan"', [on('info-card'), on('info-card-state', 'is-planned')], 'var(--gilt)'],
      ['the bead gate, met', [on('bead-card'), on('bead-card-gate', 'is-met')], 'var(--teal)'],
      ['"already running"', [on('trade-candidate'), on('trade-candidate-why')], 'var(--ink-faint)'],
      ['what a call does', [on('rel-call-note')], 'var(--ink-soft)'],
      [
        'an ordinary price on a greyed row',
        [off('city-buildable'), on('city-buildable-cost')],
        'inherit',
      ],
    ];
    for (const [what, chain, ink] of quiet) {
      expect(computed(chain, 'color')?.value, what).toBe(ink);
    }
  });

  it("asks the town, not the row, whether a note is a lack", () => {
    // A hover card describes the row; whether the row's prerequisite is *missing*
    // is a fact about the town the card is open over. The tile cell's rule
    // exactly (`.tile-requires` soft, `.is-wanting` vermilion), which is what the
    // ruling asked these lines to look like in the first place.
    const helper = braceBody(uiSource('cityPanel.ts'), 'function note(text: string');
    expect(helper).toContain("wanting ? 'wanting' : undefined");
    const panel = uiSource('cityPanel.ts');
    expect(panel).toContain('city.population < def.minCityPop');
    expect(panel).toContain("item.classList.add('wanting')");
  });
});
