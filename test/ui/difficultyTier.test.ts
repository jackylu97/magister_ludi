/**
 * The difficulty tier on the interface: the chooser's rule list, the config a
 * new game gets, the memory, and the surfaces that print a game's tier.
 *
 * The suite runs with no document, so it holds the readings and the wiring's
 * source. The chooser's drawing is a loop over `tierRules`.
 */

import { describe, expect, it } from 'vitest';

import { DIFFICULTY_RULES, MAX_DIFFICULTY_TIER } from '../../src/sim/difficulty';
import { createGame } from '../../src/sim/game';
import type { GameConfig } from '../../src/sim/state';
import {
  DEFAULT_TIER,
  NO_RULES_LINE,
  TIER_KEY,
  TOP_TIER,
  clampTier,
  playedOnLine,
  readTier,
  ruleHasWords,
  tierConfig,
  tierCountLine,
  tierLine,
  tierName,
  tierOf,
  tierRules,
  writeTier,
} from '../../src/ui/difficultyTier';
import { summaryStrip } from '../../src/ui/landingFlow';
import { opusCloseReading } from '../../src/ui/opusClose';
import { type ReportHead, reportSummary } from '../../src/ui/problemReport';
import { type SaveSlot, slotSummary } from '../../src/ui/saves';
import { victoryPage } from '../../src/ui/victoryScreen';
import { braceBody, uiSource } from './sourceHelpers';

const ROWS = DIFFICULTY_RULES as Record<string, { tier: number }>;

function config(tier?: number): GameConfig {
  return {
    ...(tier === undefined ? {} : { tier }),
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'Crimson', color: '#d4502e', isHuman: true },
      { name: 'Teal', color: '#208b85' },
    ],
  };
}

function memory(): { getItem(key: string): string | null; setItem(key: string, value: string): void } {
  const held = new Map<string, string>();
  return {
    getItem: (key) => held.get(key) ?? null,
    setItem: (key, value) => void held.set(key, value),
  };
}

describe('the rules a tier lists', () => {
  it('takes the top tier from the data', () => {
    expect(TOP_TIER).toBe(MAX_DIFFICULTY_TIER);
    expect(TOP_TIER).toBe(Math.max(...Object.values(ROWS).map((row) => row.tier)));
  });

  it('lists no rule at tier 0', () => {
    expect(tierRules(0)).toEqual([]);
    expect(tierCountLine(0)).toBe('The standard rules');
    expect(NO_RULES_LINE).toBe('No added rules.');
  });

  it('lists exactly the data rows from tier 1 to the chosen tier, lowest first', () => {
    for (let tier = 0; tier <= TOP_TIER; tier++) {
      const expected = Object.keys(ROWS)
        .filter((key) => ROWS[key]!.tier <= tier)
        .sort((a, b) => ROWS[a]!.tier - ROWS[b]!.tier);
      const listed = tierRules(tier);
      expect(listed.map((rule) => rule.key)).toEqual(expected);
      expect(listed.map((rule) => rule.tier)).toEqual(expected.map((key) => ROWS[key]!.tier));
      // Each tier adds one rule, and the tier's own rule is the last line.
      expect(listed).toHaveLength(tier);
      if (tier > 0) expect(listed[listed.length - 1]!.tier).toBe(tier);
    }
  });

  it('has a sentence for every data row, with the row\'s own numbers', () => {
    for (const key of Object.keys(ROWS)) expect(ruleHasWords(key), key).toBe(true);
    const text = (key: string): string => tierRules(TOP_TIER).find((rule) => rule.key === key)!.text;
    expect(text('strength')).toContain(`+${DIFFICULTY_RULES.strength.points} `);
    expect(text('rivalGrowthAndProduction')).toContain(`+${DIFFICULTY_RULES.rivalGrowthAndProduction.percent}%`);
    expect(text('campWave')).toContain(`${DIFFICULTY_RULES.campWave.unitsPerCamp} units`);
    expect(text('humanBuildCost')).toContain(`${DIFFICULTY_RULES.humanBuildCost.percent}%`);
    const weights = DIFFICULTY_RULES.humanOrderRarity.weights;
    expect(text('humanOrderRarity')).toContain(`${weights.common} / ${weights.uncommon} / ${weights.rare}`);
  });

  it('names tier 0 plainly and holds a tier inside the ladder', () => {
    expect(tierName(0)).toBe('Normal');
    expect(tierLine(0)).toBe('Tier 0 · Normal');
    expect(tierLine(3)).toBe('Tier 3');
    expect(clampTier(-2)).toBe(0);
    expect(clampTier(TOP_TIER + 4)).toBe(TOP_TIER);
    expect(clampTier('3')).toBe(DEFAULT_TIER);
  });
});

describe('the chosen tier reaches the config', () => {
  it('writes the tier, and no key at tier 0', () => {
    expect(tierConfig(0)).toEqual({});
    expect(tierConfig(4)).toEqual({ tier: 4 });
    expect(tierConfig(TOP_TIER + 1)).toEqual({ tier: TOP_TIER });
  });

  it('is in the state of a game made from that config', () => {
    const game = createGame({ ...config(), ...tierConfig(3) });
    expect(game.state.tier).toBe(3);
    expect(tierOf(game.state)).toBe(3);
    expect(tierOf(createGame(config()).state)).toBe(0);
  });

  it('is spread into the new game\'s config from the chooser', () => {
    const body = braceBody(uiSource('main.ts'), 'function currentConfig(): GameConfig {');
    expect(body).toContain('...tierConfig(tierChooser?.tier ?? 0)');
  });

  it('is remembered in the storage the chooser is given', () => {
    const storage = memory();
    expect(readTier(storage)).toBe(DEFAULT_TIER);
    writeTier(storage, 4);
    expect(readTier(storage)).toBe(4);
    storage.setItem(TIER_KEY, '{"tier":99}');
    expect(readTier(storage)).toBe(DEFAULT_TIER);
    storage.setItem(TIER_KEY, 'not json');
    expect(readTier(storage)).toBe(DEFAULT_TIER);
    // One storage scheme: the chooser gets the save storage handle.
    expect(uiSource('main.ts')).toMatch(/createTierChooser\(\{[^}]*storage: saveStorage,/s);
  });

  it('joins the summary line above tier 0', () => {
    const reading = { size: 'standard', seats: 6, seed: 1, hotSeat: false };
    expect(summaryStrip({ ...reading, tier: 0 })).toBe(summaryStrip(reading));
    expect(summaryStrip({ ...reading, tier: 2 })).toBe('standard · 6 seats · seed 1 · tier 2');
  });
});

describe('the surfaces that print a game\'s tier', () => {
  it('the ending screen reads the state\'s tier', () => {
    expect(victoryPage(createGame(config(5)).state, 0).tier).toBe('Tier 5');
    expect(victoryPage(createGame(config()).state, 0).tier).toBe('Tier 0 · Normal');
    expect(uiSource('victoryScreen.ts')).toContain("element('span', 'standings-tier-value', page.tier)");
  });

  it('the game menu reads the state\'s tier and lists its rules', () => {
    const body = braceBody(uiSource('main.ts'), 'function updateMapInfo(): void {');
    expect(body).toContain('const tier = tierOf(game.state);');
    expect(body).toContain('infoTier.textContent = tierLine(tier);');
    expect(body).toContain("drawTierRules(infoTierRules, tier, 'short');");
    expect(tierOf({})).toBe(0);
    expect(tierOf({ tier: 2 })).toBe(2);
  });

  it('the menu\'s short form carries the row\'s numbers, and the full sentence stays', () => {
    for (const rule of tierRules(TOP_TIER)) {
      expect(rule.short.length, rule.key).toBeLessThan(rule.text.length);
      expect(rule.short.length, rule.key).toBeLessThanOrEqual(34);
    }
    const short = (key: string): string => tierRules(TOP_TIER).find((rule) => rule.key === key)!.short;
    expect(short('strength')).toContain(`+${DIFFICULTY_RULES.strength.points} `);
    expect(short('rivalGrowthAndProduction')).toContain(`+${DIFFICULTY_RULES.rivalGrowthAndProduction.percent}%`);
    expect(short('campWave')).toContain(String(DIFFICULTY_RULES.campWave.unitsPerCamp));
    expect(short('humanBuildCost')).toContain(`${DIFFICULTY_RULES.humanBuildCost.percent}%`);
    // The drawing puts the full sentence inside the row it opens.
    const draw = braceBody(uiSource('difficultyTier.ts'), 'export function drawTierRules(');
    expect(draw).toContain('setRuleText(short, rule.short);');
    expect(draw).toContain('setRuleText(full, rule.text);');
    expect(draw).toContain('none.textContent = NO_RULES_LINE;');
  });

  it('the Opus close reads the state\'s tier, and says nothing at tier 0', () => {
    expect(playedOnLine(0)).toBeNull();
    expect(playedOnLine(4)).toBe('played on Tier 4');
    expect(opusCloseReading(createGame(config(4)).state, [], 0).tier).toBe('played on Tier 4');
    expect(opusCloseReading(createGame(config()).state, [], 0).tier).toBeNull();
    expect(uiSource('opusClose.ts')).toContain(
      "if (read.tier !== null) words.append(element('p', 'opus-ending-tier', read.tier));",
    );
  });

  it('the Load sheet\'s row shows a tier above 0', () => {
    const slot: SaveSlot = {
      id: 'quick',
      kind: 'quick',
      name: 'A world',
      turn: 12,
      savedAt: 0,
      seed: 42,
      sizeName: 'duel',
      seats: 2,
    };
    expect(slotSummary(slot)).toBe('Turn 12 · duel · 2 seats · seed 42');
    expect(slotSummary({ ...slot, tier: 3 })).toBe('Turn 12 · duel · 2 seats · seed 42 · tier 3');
  });

  it('the problem report\'s summary names the tier', () => {
    const head = {
      note: '',
      build: { commit: 'abc', schemaVersion: 1 },
      game: { turn: 4, seat: 0, seatName: 'Crimson', leader: null, decks: [], seed: 1, size: 'duel', seats: 2, tier: 4 },
      view: { lens: 'off', open: [], recent: [] },
    } as unknown as ReportHead;
    expect(reportSummary(head, 'report.json')).toContain('Difficulty: Tier 4');
    expect(uiSource('problemReport.ts')).toContain('tier: tierOf(state),');
  });
});
