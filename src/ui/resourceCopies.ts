/**
 * What an empire holds of each strategic resource, and how much of it is free —
 * read once here for every surface that prints it.
 *
 * Batch R1 gave the simulation a copies model: a unit that needs a strategic
 * resource holds one copy while it lives, a queued row holds one too, and
 * `availableCopies` is what is left. Batch R4 is the other half of that work.
 * The proposal's section 7 names the failure it is guarding against:
 *
 *   *"It becomes bookkeeping. The model only earns its place if a player can
 *   see it at a glance and plan around it."*
 *
 * A player who only ever meets the rule as a refusal has been taught it the
 * worst way. So the count goes on the surfaces where the decision is actually
 * made — the holdings rail in the HUD, a build row in the city panel, a hex's
 * own readout, a bargain's list of goods — and this module is the one place
 * those four ask the question, so they cannot come back with four answers.
 *
 * Three things live here and nothing else does:
 *
 *   the reading   `copyCount` and `strategicHoldings` — plain objects over the
 *                 simulation's own `resourceCopies` / `committedCopies` /
 *                 `availableCopies`. No arithmetic of its own: `spare` is the
 *                 sim's floored figure, not `held − committed` recomputed here,
 *                 because an empire that lost a mine under a standing army runs
 *                 past its holdings on purpose (ruling 3) and only the sim's
 *                 floor knows that.
 *   the words     one form for the pair, and it is the sim's own: `held` and
 *                 `spare`, printed as `copiesFigure` and spoken as
 *                 `copiesWords`.
 *   the nodes     the marks with their figures, for the surfaces that print a
 *                 requirement. A mark is an element carrying a CSS mask
 *                 (`resourceMark.ts`) and cannot ride inside a template string,
 *                 which is why these are fragments rather than sentences.
 *
 * **A pair reads as a choice, never as a bill.** A row that accepts obsidian or
 * copper prints both, each with its own figure, joined by the same "or" the
 * simulation's refusal uses (`eitherResourceWords` in `tech.ts`). Printing one
 * combined figure would say the empire needs both, which is the misreading the
 * brief calls out by name.
 */

import { type GameState, playerById } from '../sim/state';
import { type ResourceId, RESOURCE_IDS, resourceDef } from '../sim/resourceData';
import { availableCopies, committedCopies, resourceCopies, tileCopies } from '../sim/cities';
import { isResourceVisible } from '../sim/tech';
import type { Tile } from '../sim/map';
import { copiesFigure, copiesWords } from './figures';
import { resourceMarkNode } from './resourceMark';
import { element } from './dom';

/** One resource's standing with one empire. */
export interface CopyCount {
  id: ResourceId;
  /** "Iron". The row's own name, so nothing downstream re-looks it up. */
  name: string;
  /** Copies controlled — ground, less what is lent away, plus what is lent in. */
  held: number;
  /** Copies already carrying a living unit or a queued row. */
  committed: number;
  /** Copies that could still be spent. Floored by the simulation, never here. */
  spare: number;
}

/** One resource's standing, asked of the simulation's three readings. */
export function copyCount(
  state: GameState,
  playerId: number,
  id: ResourceId,
): CopyCount {
  return {
    id,
    name: resourceDef(id).name,
    held: resourceCopies(state, playerId, id),
    committed: committedCopies(state, playerId, id),
    spare: availableCopies(state, playerId, id),
  };
}

/**
 * Every strategic resource worth printing for this empire, in the resource
 * table's own order.
 *
 * **A row that says nothing is left out.** A resource the empire neither holds
 * nor has spent anything on is a row of zeroes, and seven rows of zeroes is the
 * bookkeeping this whole batch exists to avoid — the refusal sentence is what
 * teaches a player about a resource they have never had. What is deliberately
 * *not* left out is a resource with copies committed and none held: that is an
 * empire that lost a mine under a standing army, and a rail that quietly dropped
 * the line would hide exactly the state a player most needs to see.
 *
 * A resource the empire cannot yet name is dropped whatever the numbers say
 * (`isResourceVisible`), for the reason every other surface drops it: you cannot
 * be told about a seam you have no word for. In practice the counts are already
 * zero for such a row — `openedResource` gates on the same question — so this is
 * belt and braces against a lent copy arriving before the technology does.
 */
export function strategicHoldings(state: GameState, playerId: number): CopyCount[] {
  if (playerById(state, playerId) === undefined) return [];
  const rows: CopyCount[] = [];
  for (const id of RESOURCE_IDS) {
    if (resourceDef(id).kind !== 'strategic') continue;
    if (!isResourceVisible(state, playerId, id)) continue;
    const count = copyCount(state, playerId, id);
    if (count.held === 0 && count.committed === 0) continue;
    rows.push(count);
  }
  return rows;
}

/**
 * How many copies **one hex** of a resource is worth, or `null` for a seam whose
 * row has no quantity to roll.
 *
 * **How many** is not decided here — that is `tileCopies`, the simulation's one
 * reading, and this calls it. Until batch R6 this function restated it, because
 * R4 was fenced out of `src/sim/`; `tileCopies` is exported now and the copy is
 * gone (`docs/flags.md` (oooooo)).
 *
 * What is left here is a question about *printing*, which is this file's to
 * answer: only a strategic row carries a `copiesPerSource` range, so only a
 * strategic seam has a number a player could settle toward. A bonus or luxury
 * seam is worth one of its kind by definition and a figure beside it would be
 * noise. Asking the row rather than the presence of `Tile.resourceCopies` is
 * what keeps a hand-poked board from printing a quantity for a seam that has
 * none.
 */
export function tileCopyCount(tile: Tile): number | null {
  const id = tile.resource;
  if (id === undefined) return null;
  if (resourceDef(id).copiesPerSource === undefined) return null;
  return tileCopies(tile);
}

/**
 * The figure a surface prints beside a resource's name, as an element.
 *
 * Its own element rather than text folded into a sentence, because every number
 * in this interface is set tabular mono (`docs/design-specimen.html`) and rule 7
 * keeps figures out of written prose. `is-none` is the hook the stylesheet
 * paints vermilion: a resource with nothing to spare is the one state that has
 * to survive a glance with no gesture at all.
 */
export function copiesFigureNode(count: CopyCount): HTMLElement {
  const span = element('span', 'res-copies', copiesFigure(count.spare, count.held));
  if (count.spare === 0) span.classList.add('is-none');
  span.setAttribute('aria-label', `${count.name} — ${copiesWords(count.spare, count.held)}`);
  return span;
}

/**
 * A row's resource requirement with the empire's own counts on it — "⛏ Iron 2/3",
 * or "⛏ Obsidian 0/0 or ⛏ Copper 0/8" where the row accepts either.
 *
 * Each resource carries its own figure, and they are joined by "or". That is the
 * honest reading of a pair: one of these will do, and here is what each of them
 * has left. A single combined figure would read as a bill for both.
 */
export function requirementNodes(
  state: GameState,
  playerId: number,
  ids: readonly ResourceId[],
): DocumentFragment {
  const fragment = document.createDocumentFragment();
  ids.forEach((id, index) => {
    if (index > 0) {
      fragment.append(document.createTextNode(index === ids.length - 1 ? ' or ' : ', '));
    }
    const count = copyCount(state, playerId, id);
    fragment.append(resourceMarkNode(id));
    fragment.append(document.createTextNode(` ${count.name} `));
    fragment.append(copiesFigureNode(count));
  });
  return fragment;
}

/**
 * The same requirement as words, for the spoken label beside the drawn one.
 *
 * "Iron, 2 spare of 3" — "or" between the halves of a pair, exactly as the
 * printed form joins them, so the two describe one rule. Words only: a screen
 * reader reading a resource's mark announces its Unicode name before the word it
 * decorates, which is the one surface an icon makes worse.
 */
export function requirementWords(
  state: GameState,
  playerId: number,
  ids: readonly ResourceId[],
): string {
  const parts = ids.map((id) => {
    const count = copyCount(state, playerId, id);
    return `${count.name}, ${copiesWords(count.spare, count.held)}`;
  });
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} or ${parts[parts.length - 1]!}`;
}
