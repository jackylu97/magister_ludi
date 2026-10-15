/**
 * **Unit ranks** (batch WC3, `docs/flags.md` (rrrrrr) part 3).
 *
 * A unit earns experience by fighting, and at fixed amounts of experience it
 * holds a rank: Veteran, then Elite. Each rank is worth a flat amount of combat
 * strength, as one labelled line on the combat ledger (`planCombat`,
 * `combat.ts`) on whichever side the unit fights. Ranks do nothing else for now:
 * no choices, no extra health, no extra movement (the user's ruling).
 *
 * The strength is flat rather than a share of the unit's own strength (the
 * user, 2026-10-14). The damage curve reads the difference between two
 * strengths, so a flat edge is worth the same in every age, where a share of
 * base strength would grow with each age's roster.
 *
 * Where each part of the rule lives:
 *
 *   · **the record** is `Unit.experience` (`state.ts`), absent until a unit's
 *     first award. `awardExperience` below is its only writer, and `applyCombat`
 *     (`combat.ts`) is its only caller; both are pinned by a source test
 *     (`test/sim/ranks.test.ts`).
 *   · **the rank** is read from the experience every time (`rankOf`) and never
 *     stored.
 *   · **the strength line** is `rankStrengthLines`, which `planCombat` reads for
 *     the attacker and for a defending unit, so the forecast and the fight agree.
 *
 * What a fight pays, decided by `experienceAfter`:
 *
 *   · `survive` (1) to each side that lives through it, or `kill` (2) instead
 *     to a side that destroyed the unit it fought. Attacking and defending are
 *     paid alike, and a ranged attacker that takes no counter-blow has still
 *     survived a fight.
 *   · **The barbarian cap.** A fight with the barbarians can raise experience up
 *     to the threshold of `barbarianCap` (Veteran) and no further, and a unit
 *     already at or past it gains nothing from one. So a camp that keeps
 *     respawning cannot be farmed for an Elite army. Fights with empires have no
 *     cap, so a Veteran made on barbarians goes on to Elite against an empire.
 *   · **Barbarian units earn nothing.** The wild has no veterans, so its raiders
 *     and camp guards do not grow stronger the longer they survive.
 *   · A town never earns experience. Which blows count as a fight at all (a
 *     blow at a fighting unit, or at a town whose walls still stand) is decided
 *     where the fight is resolved, in `applyCombat`.
 *
 * Experience stays with the unit. An automatic upgrade changes its type in place
 * (`applyUpgrade`, `tech.ts`), and a change of owner (`captureUnit`, `state.ts`)
 * changes only the owner, so neither touches it.
 *
 * A leaf over the rule book and `state.ts`, like `weariness.ts`: `combat.ts`,
 * the renderer and the interface all read it, and it imports none of them.
 */

import { type RankId, RULES } from './rulesData';
import { type GameState, isBarbarian } from './state';

export type { RankId } from './rulesData';

/** Every figure of the rule. See `RankRules`. */
const RANKS = RULES.combat.ranks;

/**
 * The ranks, lowest first. Appended to, never reordered: the renderer hashes a
 * rank's index into the piece fingerprint, and the art draws one mark per id.
 */
export const RANK_IDS: readonly RankId[] = ['veteran', 'elite'];

/**
 * What each rank is called on every surface: the forecast's strength line, the
 * unit panel, the garrison row's hover and the Compendium.
 */
const RANK_NAMES: Record<RankId, string> = {
  veteran: 'Veteran',
  elite: 'Elite',
};

/** The shape every reading here needs: a piece and whatever it has earned. */
export interface ExperiencedUnit {
  experience?: number;
}

/** A rank's name, as the player reads it. */
export function rankName(id: RankId): string {
  return RANK_NAMES[id];
}

/** The experience at which a unit holds this rank. */
export function rankThreshold(id: RankId): number {
  return RANKS.ladder[id].experience;
}

/** The flat combat strength this rank adds, in total. */
export function rankStrength(id: RankId): number {
  return RANKS.ladder[id].strength;
}

/** The experience a unit has earned. Nothing for a unit that has never fought. */
export function experienceOf(unit: ExperiencedUnit): number {
  return unit.experience ?? 0;
}

/**
 * The rank this much experience holds: the highest rank whose threshold it
 * reaches, or `null` below the first.
 */
export function rankFor(experience: number): RankId | null {
  let held: RankId | null = null;
  for (const id of RANK_IDS) {
    if (experience >= rankThreshold(id)) held = id;
  }
  return held;
}

/** The rank a unit holds, read from its experience. Never stored. */
export function rankOf(unit: ExperiencedUnit): RankId | null {
  return rankFor(experienceOf(unit));
}

/**
 * The next rank this unit can reach, or `null` when it holds the highest one.
 * The unit panel reads it to show how far the unit is from its next rank.
 */
export function nextRankOf(unit: ExperiencedUnit): RankId | null {
  const experience = experienceOf(unit);
  for (const id of RANK_IDS) {
    if (experience < rankThreshold(id)) return id;
  }
  return null;
}

/**
 * **The strength line a unit's rank adds to a fight**: one line, labelled with
 * the rank's name, or nothing for a unit without a rank.
 *
 * One line rather than one per rank climbed, because the ruling is that each
 * rank is one flat strength line: an Elite unit prints "Elite +6", never
 * "Veteran +3" beside "Elite +3". The shape is `CombatStrengthLine`'s, written
 * out here because `combat.ts` imports this module and not the other way round.
 */
export function rankStrengthLines(unit: ExperiencedUnit): { source: string; amount: number }[] {
  const rank = rankOf(unit);
  if (rank === null) return [];
  const amount = rankStrength(rank);
  if (amount === 0) return [];
  return [{ source: rankName(rank), amount }];
}

/** What a unit did in one fight, as far as experience is concerned. */
export type ExperienceEvent = 'survived' | 'kill';

/**
 * **The experience a unit holds after one more fight**: the pure arithmetic of
 * the award, with the barbarian cap applied.
 *
 * `vsWild` is true when the other side of the fight was the barbarians. Such a
 * fight raises experience up to the cap rank's threshold and no further, and
 * leaves a unit already at or past that threshold exactly where it was, so a
 * barbarian fight can never take experience down either.
 */
export function experienceAfter(current: number, event: ExperienceEvent, vsWild: boolean): number {
  const gained = event === 'kill' ? RANKS.kill : RANKS.survive;
  const next = current + gained;
  if (!vsWild) return next;
  const cap = rankThreshold(RANKS.barbarianCap);
  if (current >= cap) return current;
  return Math.min(next, cap);
}

/**
 * **Pays one unit its experience for one fight.** The only writer of
 * `Unit.experience`.
 *
 * `opponentOwnerId` is the empire on the other side of the fight: the defending
 * unit's or town's owner for the attacker, the attacker's owner for a defending
 * unit. It decides the barbarian cap. A unit of the barbarians' own earns
 * nothing.
 *
 * The key is written only when the experience actually rises, so a unit held at
 * the barbarian cap from its very first fight (a cap of nothing) stays without
 * one, and a unit that has never fought always serialises without one.
 *
 * Nothing on the economy clock reads experience (`slate.ts`): a unit's strength
 * is folded fresh by `planCombat` every time it is asked. So, unlike
 * `recordWarLoss`, this needs no announcement beyond the command's own.
 */
export function awardExperience(
  state: GameState,
  unit: ExperiencedUnit & { ownerId: number },
  event: ExperienceEvent,
  opponentOwnerId: number,
): void {
  if (isBarbarian(state, unit.ownerId)) return;
  const current = experienceOf(unit);
  const next = experienceAfter(current, event, isBarbarian(state, opponentOwnerId));
  if (next <= current) return;
  unit.experience = next;
}
