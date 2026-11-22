/**
 * The difficulty tier, as the interface shows it.
 *
 * The rules are `data/difficulty.json`, read through `DIFFICULTY_RULES`
 * (`src/sim/difficulty.ts`). A tier includes every rule of the tiers below it,
 * so a game at tier 3 has the rules of tiers 1, 2 and 3.
 *
 * This module has three parts:
 * - the readings (`tierRules`, `tierName`, `tierLine`), which every surface
 *   uses: the setup screen, the game menu, the Load sheet, the ending screen
 *   and the problem report;
 * - the memory (`readTier`, `writeTier`), one key in the same storage handle
 *   the tutorial and the pamphlet use;
 * - the chooser (`createTierChooser`), the control on the setup screen.
 *
 * Why the sentences are here: the data rows hold the numbers and a key, but no
 * line for the player. `RULE_WORDS` writes one sentence for each key and takes
 * every number from the row. A row with no sentence shows its key in plain
 * words, so a new tier in the data appears in the chooser with no edit here.
 * `test/ui/difficultyTier.test.ts` fails until the new row has a sentence.
 */

import { DIFFICULTY_RULES, MAX_DIFFICULTY_TIER, isDifficultyTier } from '../sim/difficulty';
import { STATECRAFT } from '../sim/statecraftData';
import type { GameConfig } from '../sim/state';

/** The highest tier the data holds. The chooser has one step for each tier from 0 to this. */
export const TOP_TIER = MAX_DIFFICULTY_TIER;

/** The tier a new game uses when the player has chosen nothing. */
export const DEFAULT_TIER = 0;

type RuleKey = keyof typeof DIFFICULTY_RULES;
type RuleRow<K extends RuleKey> = (typeof DIFFICULTY_RULES)[K];

/** One rule of the ladder, with its sentence. */
export interface TierRule {
  /** The tier that adds this rule. */
  tier: number;
  /** The row's key in `data/difficulty.json`. */
  key: string;
  text: string;
}

/** `75 / 20 / 5`: the three rarity weights in the order common, uncommon, rare. */
function odds(weights: { common: number; uncommon: number; rare: number }): string {
  return `${weights.common} / ${weights.uncommon} / ${weights.rare}`;
}

/**
 * One sentence for each rule. Each sentence says who the rule applies to, as
 * the rule's reader in `src/sim/difficulty.ts` decides it: "rivals" are the
 * computer seats and "you" are the human seats.
 */
const RULE_WORDS: { [K in RuleKey]: (row: RuleRow<K>) => string } = {
  // `difficultyStrength` gives the points to every seat that is not human, so
  // the barbarians get them too, for units and for towns.
  strength: (row) => `Rivals and barbarians gain +${row.points} combat strength.`,
  rivalGrowthAndProduction: (row) => `Rivals gain +${row.percent}% growth and production.`,
  // `foundAgeCloseCamps` founds new camps. The camps that stand send nothing.
  campWave: (row) =>
    `When an age closes, new barbarian camps appear with ${row.unitsPerCamp} units each.`,
  humanBuildCost: (row) => `Your buildings and units cost ${row.percent}% more.`,
  humanOrderRarity: (row) =>
    `Your Order offers hold fewer uncommon and rare cards: the odds are ${odds(row.weights)}, not ${odds(STATECRAFT.rarityOdds)}.`,
};

/** `rivalGrowthAndProduction` to "Rival growth and production", for a row with no sentence. */
function keyWords(key: string): string {
  const words = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Holds a tier inside the ladder. A value that is not a tier becomes the default. */
export function clampTier(value: unknown): number {
  const tier = typeof value === 'number' ? Math.round(value) : NaN;
  if (!Number.isFinite(tier)) return DEFAULT_TIER;
  return Math.max(0, Math.min(TOP_TIER, tier));
}

/** Every rule of the ladder, lowest tier first. */
function allRules(): TierRule[] {
  const rows = DIFFICULTY_RULES as Record<string, { tier: number }>;
  const words = RULE_WORDS as Record<string, ((row: never) => string) | undefined>;
  return Object.keys(rows)
    .map((key) => {
      const row = rows[key]!;
      const write = words[key];
      return { tier: row.tier, key, text: write ? write(row as never) : keyWords(key) };
    })
    .sort((a, b) => a.tier - b.tier);
}

/** The rules in force at a tier: every rule from tier 1 to this tier. Tier 0 has none. */
export function tierRules(tier: number): TierRule[] {
  const at = clampTier(tier);
  return allRules().filter((rule) => rule.tier <= at);
}

/** Whether the data row has a sentence of its own. The test reads this. */
export function ruleHasWords(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(RULE_WORDS, key);
}

/** "Normal" for tier 0, "Tier 3" for the others. */
export function tierName(tier: number): string {
  const at = clampTier(tier);
  return at === 0 ? 'Normal' : `Tier ${at}`;
}

/** "Tier 0 · Normal" or "Tier 3": the one line the menu, the ending and the report print. */
export function tierLine(tier: number): string {
  const at = clampTier(tier);
  return at === 0 ? 'Tier 0 · Normal' : `Tier ${at}`;
}

/** The sentence under the chooser that says how much is in force. */
export function tierCountLine(tier: number): string {
  const count = tierRules(tier).length;
  if (count === 0) return 'The standard rules. No extra rule is in force.';
  return count === 1 ? '1 rule in force' : `${count} rules in force`;
}

/**
 * The tier of a game, from its state or its config. A missing tier is tier 0:
 * a save from before the tiers has none.
 */
export function tierOf(source: { tier?: number }): number {
  return clampTier(source.tier ?? 0);
}

/**
 * The part of a new game's config that the chooser writes.
 *
 * Tier 0 writes no key. A missing tier and tier 0 use the same rules, so the
 * default game's config stays the same as it was before the tiers.
 */
export function tierConfig(tier: number): Pick<GameConfig, 'tier'> {
  const at = clampTier(tier);
  return at === 0 ? {} : { tier: at };
}

// --- the memory ---------------------------------------------------------------

/** The storage the memory needs. The save storage handle fits it. */
export interface TierStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** The one key this module owns. Versioned, so a change of shape starts fresh. */
export const TIER_KEY = 'magisterludi:tier:v1';

/** The tier this browser used last. Storage that fails, or a bad value, reads as the default. */
export function readTier(storage: TierStorage): number {
  try {
    const raw = storage.getItem(TIER_KEY);
    if (raw === null) return DEFAULT_TIER;
    const parsed: unknown = JSON.parse(raw);
    const tier =
      typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>).tier : undefined;
    return isDifficultyTier(tier) ? tier : DEFAULT_TIER;
  } catch {
    return DEFAULT_TIER;
  }
}

/** Remembers the tier. If the storage refuses, the next visit opens on the default. */
export function writeTier(storage: TierStorage, tier: number): void {
  try {
    storage.setItem(TIER_KEY, JSON.stringify({ tier: clampTier(tier) }));
  } catch {
    // A private window or a full store. Nothing else depends on this key.
  }
}

// --- the drawing ----------------------------------------------------------------

/**
 * Writes a rule's sentence into an element, with each figure in the counted
 * face (`.tier-figure`: tabular mono), as the design language asks.
 */
export function setRuleText(target: HTMLElement, text: string): void {
  target.replaceChildren();
  for (const part of text.split(/(\+?\d+%?(?: \/ \d+)*)/)) {
    if (part === '') continue;
    if (/^\+?\d/.test(part)) {
      const figure = document.createElement('span');
      figure.className = 'tier-figure';
      figure.textContent = part;
      target.append(figure);
    } else {
      target.append(document.createTextNode(part));
    }
  }
}

/**
 * Fills a list element with the rules in force at a tier, one line each. The
 * rule the tier itself adds carries `is-newest` and the word "new".
 */
export function drawTierRules(list: HTMLElement, tier: number): void {
  const at = clampTier(tier);
  list.replaceChildren();
  for (const rule of tierRules(at)) {
    const row = document.createElement('li');
    row.className = rule.tier === at ? 'tier-rule is-newest' : 'tier-rule';
    const step = document.createElement('span');
    step.className = 'tier-rule-step';
    step.textContent = String(rule.tier);
    step.setAttribute('aria-label', `Tier ${rule.tier}`);
    const words = document.createElement('span');
    words.className = 'tier-rule-words';
    setRuleText(words, rule.text);
    row.append(step, words);
    if (rule.tier === at) {
      const mark = document.createElement('span');
      mark.className = 'tier-rule-new';
      mark.textContent = 'new';
      row.append(mark);
    }
    list.append(row);
  }
}

/** The chooser on the setup screen. */
export interface TierChooser {
  /** The chosen tier. What `currentConfig` reads. */
  readonly tier: number;
  set(tier: number): void;
}

interface TierChooserOptions {
  /** The radio group that takes one step for each tier. It has its label in the markup. */
  steps: HTMLElement;
  /** The line beside the steps: the tier's name and how many rules are in force. */
  name: HTMLElement;
  /** The list of rules. It has a fixed height in the stylesheet and scrolls inside itself. */
  rules: HTMLElement;
  storage: TierStorage;
  onChange?: (tier: number) => void;
}

/**
 * Builds the chooser: a radio group with one step for each tier, and the list
 * of rules in force beneath it.
 *
 * The arrow keys move the choice while a step has focus, and Home and End go
 * to the two ends. One step is in the tab order at a time (the chosen one), as
 * a radio group works. The chooser opens on the tier this browser used last
 * and remembers each change.
 */
export function createTierChooser(options: TierChooserOptions): TierChooser {
  const { steps, name, rules, storage } = options;
  let chosen = readTier(storage);

  const buttons: HTMLButtonElement[] = [];
  for (let tier = 0; tier <= TOP_TIER; tier++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tier-step';
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-label', tierLine(tier));
    button.textContent = String(tier);
    button.addEventListener('click', () => set(tier));
    buttons.push(button);
    steps.append(button);
  }

  function draw(): void {
    buttons.forEach((button, tier) => {
      const on = tier === chosen;
      button.setAttribute('aria-checked', on ? 'true' : 'false');
      button.tabIndex = on ? 0 : -1;
      // A step at or below the choice is filled: its rule is in force.
      button.classList.toggle('is-in-force', tier <= chosen && tier > 0);
    });
    name.replaceChildren();
    const title = document.createElement('span');
    title.className = 'tier-name-title';
    title.textContent = tierName(chosen);
    const count = document.createElement('span');
    count.className = 'tier-name-count';
    setRuleText(count, tierCountLine(chosen));
    name.append(title, count);
    drawTierRules(rules, chosen);
    // The newest rule is the last line. Keep it in view if the list is longer than its frame.
    rules.scrollTop = rules.scrollHeight;
  }

  function set(tier: number): void {
    const next = clampTier(tier);
    if (next === chosen) return;
    chosen = next;
    writeTier(storage, chosen);
    draw();
    options.onChange?.(chosen);
  }

  steps.addEventListener('keydown', (event) => {
    let next: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = chosen + 1;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = chosen - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TOP_TIER;
    if (next === null) return;
    // The page under the landing scrolls on these keys.
    event.preventDefault();
    set(next);
    buttons[chosen]?.focus();
  });

  draw();

  return {
    get tier(): number {
      return chosen;
    },
    set,
  };
}
