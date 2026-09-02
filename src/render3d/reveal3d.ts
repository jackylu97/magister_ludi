/**
 * The reveal pass: taking off the board what this seat has no word for.
 *
 * Fog asks whether a seat has *charted* a hex. This asks the other half of the
 * same question — whether it can **name** what is standing on one — and it has
 * two subjects: the diorama props for tech-gated resources, and, since the vein
 * layer landed, the props the board baked over a **buried seam** nobody has
 * surveyed yet (`Tile.vein`).
 *
 * The second subject is the same mechanism answering a question about the
 * *board* rather than about the seat: the board is built once per game, so a
 * resource that appears mid-game has no prop unless one was baked for it, and a
 * survey striking ore is exactly that. The bake lays the ore down veiled; the
 * strike flips one boolean and the frame draws it, for every seat at once,
 * because a strike is public. No rebuild, no new seam, and no notification to
 * plumb through the reducer — see "What it costs" below, which is why this pass
 * is re-asked on the frame in the first place. A player who
 * has not researched Bronze Working sees a bare hill where the iron is, and the
 * turn the technology lands the ore appears, in the same breath as the lens
 * roundel, the hover card's label and the tile's yield. All four are derived
 * from one rule (`resourceIsVisibleTo`, reached here through
 * `visibleResourceAt`), which is what makes them impossible to disagree.
 *
 * This closes the tradeoff `visibleResourceAt` used to document as v1's: props
 * are baked into the board's instance buffers, so culling them at bake time
 * would fork the board per seat and re-bake ninety thousand instances every time
 * somebody finished a technology. The M8 rule holds here exactly as it holds for
 * fog — **per-instance writes, never a board rebuild** — and it is the same
 * mechanism, one bit further along: the board bakes every prop lit, hands over
 * which instances they are (`BuiltBoard.resourceCells`), and this switches the
 * unnameable ones off for the seat being drawn. See the three-bit state machine
 * in `instances.ts` for why a veil is its own bit and not a `suppress`: a town
 * clears a hex for everybody and for good, while this is per seat and lifts.
 *
 * What it costs
 * -------------
 * The walk is over the **gated** props only — the rows with a `requiresTech`,
 * which is two of the twenty today — so it is a few dozen entries on a standard
 * map rather than four thousand. Each is one boolean compare against what this
 * layer last painted, and a write happens only where the answer flipped. So the
 * steady state is free, a seat change costs one write per gated prop, and
 * finishing Bronze Working costs one write per iron hill. It is re-evaluated on
 * the frame like the fog is, for the fog's own reason: a *notification* would
 * have to be plumbed through every command, every turn phase and every seat
 * change without ever being forgotten, and the frame the renderer was already
 * going to draw is the honest place to ask.
 *
 * Ungated resources are filtered out at construction rather than checked every
 * pass. That is not only speed: it means a board with no gated resource on it
 * holds no state at all here, and the layer cannot become a thing that has an
 * opinion about wheat.
 */

import { resourceDef } from '../sim/resourceData';
import type { GameState } from '../sim/state';
import { isResourceVisible } from '../sim/tech';

import type { ResourcePropCell } from './board3d';
import { INSTANCE_WRITES, InstanceCollector } from './instances';

/** What one `apply` did. Operation counts, in `FogStats`' idiom. */
export interface RevealStats {
  /** Gated prop tiles whose answer actually changed. */
  cells: number;
  /** Instance matrix writes issued (veil and unveil). */
  matrixWrites: number;
}

/**
 * The per-seat prop veil over one built board.
 *
 * Tied to that board's lifetime exactly as `FogView` is, and for the same
 * reason: it holds handles into the board's buffers, and a rebuilt board has
 * disposed every one of them.
 */
export class RevealView {
  /** Only the props whose resource has a reveal tech. See the docblock. */
  private readonly gated: ResourcePropCell[];
  /**
   * Whether each gated entry is currently veiled, or `null` for "never
   * painted" — which is what makes the first `apply` write the board once
   * rather than agreeing with a state it has not actually drawn.
   */
  private painted: (boolean | null)[];
  private disposed = false;

  constructor(cells: readonly ResourcePropCell[]) {
    this.gated = cells.filter(
      (cell) => cell.vein === true || resourceDef(cell.resource).requiresTech !== undefined,
    );
    this.painted = this.gated.map(() => null);
  }

  /**
   * Repaints the gated props for one seat, touching only what changed.
   *
   * `seat` is `null` for the omniscient board — no fog, no seat, the galleries
   * and the frozen 2D pipelines — and then nothing is veiled, which is the same
   * "draw everything by not asking" default every other layer takes. A seat id
   * that names nobody is treated as knowing nothing, because `isResourceVisible`
   * is false for a player who does not exist, and a board drawn for a seat that
   * is not there should not be leaking the one thing this hides.
   */
  apply(state: GameState | null, seat: number | null): RevealStats {
    if (this.disposed || this.gated.length === 0) return { cells: 0, matrixWrites: 0 };

    const before = INSTANCE_WRITES.matrix;
    let changed = 0;

    for (let i = 0; i < this.gated.length; i++) {
      const entry = this.gated[i]!;
      // **A buried seam is veiled until somebody digs it up.** The board baked
      // the ore where `Tile.vein` said it was, so the props exist from the first
      // frame and stand invisible; the moment a survey turns the seam over
      // (`prospectAt` writes `Tile.resource` and deletes `Tile.vein`) this
      // answer flips and the ore appears — on **every** seat, because a strike
      // is public, and on the very next frame, because this pass is re-asked on
      // the frame exactly as the fog is.
      //
      // The check is against the *tile* rather than against a flag this layer
      // keeps, and that is deliberate: the state is the only thing that knows
      // whether the hill has been asked, and a second record here would be a
      // second answer that could disagree with it after a save is loaded.
      const struck =
        entry.vein !== true ||
        (state !== null && state.map.tiles[entry.cell]?.resource === entry.resource);
      const veiled =
        !struck ||
        (state !== null && seat !== null && !isResourceVisible(state, seat, entry.resource));
      if (veiled === this.painted[i]) continue;
      this.painted[i] = veiled;
      changed += 1;
      for (const handle of entry.handles) {
        if (veiled) InstanceCollector.veil(handle);
        else InstanceCollector.unveil(handle);
      }
    }

    return { cells: changed, matrixWrites: INSTANCE_WRITES.matrix - before };
  }

  /** Is this tile's prop currently veiled? For tests and the stats line. */
  isVeiled(cell: number): boolean {
    for (let i = 0; i < this.gated.length; i++) {
      if (this.gated[i]!.cell === cell) return this.painted[i] === true;
    }
    return false;
  }

  /** How many gated props this board carries. The size of the walk. */
  get gatedCount(): number {
    return this.gated.length;
  }

  /**
   * Forgets what it has painted, so the next `apply` writes the board again.
   *
   * Needed when the *state* under a seat changes identity — a loaded save, a
   * replayed log — because this layer's record is about a player's technologies
   * and nothing about the handles it holds would say those had been swapped.
   */
  reset(): void {
    this.painted = this.gated.map(() => null);
  }

  /**
   * Drops the layer. It owns no scene objects — the props belong to the board —
   * so this only stops it writing on handles the board is about to dispose.
   */
  dispose(): void {
    this.disposed = true;
    this.painted = [];
  }
}
