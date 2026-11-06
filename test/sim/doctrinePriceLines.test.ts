/**
 * **The register of batch DT8's three price lines** (`docs/plans/doctrines-build-triage.md`,
 * S8). Each price has one reader, so every surface that quotes it reads what the
 * reducer charges. This file reads the source and pins those readers, so a second
 * reading of any of the three fails core. What each row pays is checked beside its
 * deck's other Doctrines, in `test/sim/decks/`.
 */

import { describe, expect, it } from 'vitest';

const SOURCES = import.meta.glob('../../src/**/*.ts', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

/** Every line of code in `src/`, comments left out, with the top-level function it sits in. */
function codeLines(): { where: string; code: string }[] {
  const lines: { where: string; code: string }[] = [];
  const top = /^(?:export\s+)?(?:async\s+)?function\s+(\w+)|^(?:export\s+)?(?:const|let)\s+(\w+)/;
  for (const [path, text] of Object.entries(SOURCES).sort(([a], [b]) => (a < b ? -1 : 1))) {
    const file = path.replace('../../src/', '');
    let current = '(top)';
    for (const line of text.split('\n')) {
      const named = top.exec(line);
      if (named) current = named[1] ?? named[2] ?? current;
      const trimmed = line.trim();
      if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*')) continue;
      lines.push({ where: `${file} › ${current}`, code: line.replace(/\/\/.*$/, '') });
    }
  }
  return lines;
}

/** Where a function is called, its own declaration left out. */
function callers(name: string): string[] {
  const call = new RegExp(`\\b${name}\\(`);
  const found: string[] = [];
  for (const { where, code } of codeLines()) {
    if (!call.test(code)) continue;
    if (new RegExp(`function\\s+${name}\\(`).test(code)) continue;
    found.push(where);
  }
  return found.sort();
}

/**
 * The simulation code that names a rule, leaving out the union that declares it and
 * the words that print it. A rule's reader is the only thing left.
 */
function ruleReaders(rule: string): string[] {
  const named = `'${rule}'`;
  return codeLines()
    .filter(({ where, code }) => {
      if (!where.startsWith('sim/') || !code.includes(named)) return false;
      return !where.startsWith('sim/statecraftData.ts') && !where.startsWith('sim/statecraft/describers.ts');
    })
    .map((line) => line.where)
    .sort();
}

/** The text of a source file between two markers. */
function between(path: string, from: string, to: string): string {
  const text = SOURCES[`../../src/${path}`]!;
  const start = text.indexOf(from);
  const end = text.indexOf(to, start);
  expect(start, from).toBeGreaterThanOrEqual(0);
  expect(end, to).toBeGreaterThan(start);
  return text.slice(start, end);
}

describe('each price line has one reader', () => {
  it('reads the gold rate of a contribution in one place, for the two callers that share it', () => {
    expect(ruleReaders('goldContribution')).toEqual(['sim/statecraft/evaluator.ts › cardGoldContributionLines']);
    expect(callers('cardGoldContributionLines')).toEqual(['sim/purchase.ts › contributionRate']);
    expect(callers('contributionRate')).toEqual([
      'sim/purchase.ts › contributeError',
      'sim/purchase.ts › explainContribution',
    ]);
  });

  it('reads the technology price in one place', () => {
    expect(ruleReaders('techPrice')).toEqual(['sim/statecraft/evaluator.ts › cardTechPriceLines']);
    expect(callers('cardTechPriceLines')).toEqual(['sim/tech.ts › explainTechCost']);
    // The price and the bots ask the one reach, so they name the same technologies.
    expect(callers('techPriceRowReaches')).toEqual([
      'ai/value.ts › techPriceWorth',
      'sim/statecraft/evaluator.ts › cardTechPriceLines',
    ]);
  });

  it('reads the rite price in one place, which is also the one caller of the data’s ladder', () => {
    expect(ruleReaders('riteCost')).toEqual(['sim/religion.ts › riteCostAhead']);
    expect(callers('riteCost')).toEqual(['sim/religion.ts › riteCostAhead']);
  });
});

describe('every surface reads the price that is charged', () => {
  it('prints a contribution from the offer, and works out no rate of its own', () => {
    const row = between('ui/cityPanel.ts', 'function contributeRow(', 'function renderQueue(');
    expect(row).toContain('explainContribution(state, seat, city.id, currency)');
    expect(row).toContain('offer.spend');
    expect(row).toContain('offer.hammers');
    expect(row).not.toContain('PerHammer');
    const bot = between('ai/bot.ts', 'function contributionCommand(', 'function frontRowEndsTheGame(');
    expect(bot).toContain('explainContribution(state, player.id, city.id, currency)');
    expect(bot).not.toContain('PerHammer');
  });

  it('charges a contribution from the same offer the button prints', () => {
    const charge = between('sim/purchase.ts', 'export function contributeAt(', 'city.hammerBasket += offer.hammers;');
    expect(charge).toContain('explainContribution(state, player.id, city.id, currency)');
    expect(charge).toContain('spendFaith(state, player, offer.spend)');
    expect(charge).toContain('spendGold(state, player, offer.spend)');
  });

  it('lets no screen or bot reach the rite ladder past the price', () => {
    for (const { where, code } of codeLines()) {
      if (where.startsWith('sim/')) continue;
      expect(code, where).not.toMatch(/\bcostPerRiteStarted\b|\brite\.costBase\b/);
    }
    const tab = SOURCES['../../src/ui/ritesTab.ts']!;
    expect(tab).toContain('const cost = riteCostFor(state, seat);');
    expect(tab).toContain('const can = ritesAffordable(state, seat, bank);');
    expect(tab).toContain('const nextCost = riteCostAhead(state, seat, 1);');
  });

  it('lets no reader in the simulation price a technology past the fold', () => {
    for (const { where, code } of codeLines()) {
      if (!where.startsWith('sim/') || where.startsWith('sim/tech.ts › explainTechCost')) continue;
      expect(code, where).not.toMatch(/techDef\([^)]*\)\.cost\b/);
    }
  });
});
