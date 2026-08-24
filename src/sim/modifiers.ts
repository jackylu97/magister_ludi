/**
 * How a stack of percentages composes — Entry XVII's arithmetic, and the one
 * implementation of it.
 *
 * The doctrine in one line: `(base + flats) × (1 + Σ city%) × (1 + Σ global%)`,
 * floored **once** at the very end. Two stages, additive inside each and
 * multiplicative across the pair, and nothing anywhere else in the simulation is
 * allowed to multiply a yield by a percentage — a source joins a stage, and the
 * stage is folded here.
 *
 * Why two stages and not one pool
 * -------------------------------
 * A single pool (what shipped with M10) made a +10% global on top of a +10% city
 * bonus worth twenty points of base; the doctrine says twenty-one, because a
 * global modifier is meant to scale with how well-built the empire's cities
 * already are. That is the whole difference, and it is the reason a global
 * percent is spent sparingly (meters, and a handful of late run-defining
 * effects) while a city percent is the default shape for content.
 *
 * Why the stage is not "where the effect is held"
 * -----------------------------------------------
 * It is **where the effect applies** (Entry XVII.4). Coral's "+20% science in
 * each coastal city" is city-stage although the seam is one tile and the empire
 * owns it; a happiness tier's "+10% science" is global-stage although it lands
 * in every city the same way. The test is whether the modifier is a fact about
 * *this town* — its buildings, its seams, what it is building — or a fact about
 * the empire that the town happens to be inside of.
 *
 * The arithmetic, and why it is done in percentage points
 * -------------------------------------------------------
 * `applyStages` multiplies in whole points and divides once, rather than
 * building two floating factors and multiplying them into the base. Both readings
 * are the same arithmetic; only one of them is *exact* where it matters. The
 * numerator is integer-valued and far inside the range a double holds exactly, so
 * whenever the true result is a whole number the division returns it exactly —
 * `20 × 1.15` is `22.999999999999996` and floors to 22, while `20 × 115 / 100` is
 * 23 and floors to 23. Floor-once was always the rule; this is what makes it
 * true rather than nearly true, and it is why a marble city's build estimate no
 * longer loses a hammer to the last bit of a mantissa.
 */

/**
 * Which of the two multiplications a percentage joins.
 *
 * `'city'` — buildings, category bonuses, a luxury signature scoped to the towns
 * that hold it or to every coastal one. `'empire'` — meter tiers, empire-wide
 * luxury percentages, and the future globals (wonders, cards) the ledger parks.
 */
export type ModifierStage = 'city' | 'empire';

/** The stages in the order they apply, which is the order a surface prints. */
export const MODIFIER_STAGES: readonly ModifierStage[] = ['city', 'empire'];

/**
 * How each stage reads as a heading. Beside the union it names, so the panel and
 * any future surface cannot call the same multiplication two things.
 */
export const STAGE_LABEL: Record<ModifierStage, string> = {
  city: 'City bonuses',
  empire: 'Empire',
};

/**
 * The least a line has to say to be folded: which multiplication it joins, and
 * by how much. Structural rather than a class, so a meter's line, a luxury's and
 * a building's are all foldable without any of them importing this file's idea
 * of what they are.
 */
export interface StagedLine {
  stage: ModifierStage;
  /** Signed whole percent, as a figure a surface prints rather than a fraction. */
  percent: number;
}

/** The two sums, in whole percentage points. The fold of a staged list. */
export interface StageSums {
  city: number;
  empire: number;
}

/** Nothing is modifying this yield. The identity of `applyStages`. */
export const NO_STAGES: StageSums = { city: 0, empire: 0 };

/**
 * The two sums of a list, optionally of the subset a predicate admits.
 *
 * The predicate is a parameter rather than the caller's `.filter` because this
 * is called once per yield per city per turn, and a filtered copy of every
 * modifier list six times over is a lot of garbage for an arithmetic helper.
 */
export function foldStages<T extends StagedLine>(
  lines: readonly T[],
  keep?: (line: T) => boolean,
): StageSums {
  let city = 0;
  let empire = 0;
  for (const line of lines) {
    if (keep && !keep(line)) continue;
    if (line.stage === 'city') city += line.percent;
    else empire += line.percent;
  }
  return { city, empire };
}

/**
 * The same sums with more points on one stage — how a percentage that is not in
 * the list joins it anyway. The city's hammers toward *what it is building*
 * (`productionModifiers`) are the one such source: they belong to the pair
 * (city, item) rather than to the city, so they are computed beside the list and
 * added to its city stage here, never multiplied afterwards.
 */
export function withStage(sums: StageSums, stage: ModifierStage, percent: number): StageSums {
  if (percent === 0) return sums;
  return stage === 'city'
    ? { city: sums.city + percent, empire: sums.empire }
    : { city: sums.city, empire: sums.empire + percent };
}

/** True when neither stage is doing anything — the base passes through whole. */
export function stagesAreIdle(sums: StageSums): boolean {
  return sums.city === 0 && sums.empire === 0;
}

/**
 * What the two stages multiply a base by, as one number — for a surface that
 * wants to quote the multiplier rather than apply it. The simulation applies it
 * with `applyStages`, which is not this times the base: it is the exact form.
 */
export function stageFactor(sums: StageSums): number {
  return ((100 + sums.city) * (100 + sums.empire)) / 10_000;
}

/**
 * Entry XVII, applied: the city stage, then the global stage, floored once.
 *
 * The **only** place a yield meets a percentage. Callers hand it a base that has
 * every flat already folded in (rule 5: the total is the fold of the breakdown)
 * and get back the whole number the city banks — there is no intermediate result
 * anyone may round, print, or bank.
 */
export function applyStages(base: number, sums: StageSums): number {
  if (stagesAreIdle(sums)) return Math.floor(base);
  return Math.floor((base * (100 + sums.city) * (100 + sums.empire)) / 10_000);
}
