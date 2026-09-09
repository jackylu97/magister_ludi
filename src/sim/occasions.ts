/**
 * **The moments the world announces.** One union, in a leaf, for the two systems
 * that listen to them (batch H6).
 *
 * There were two lists before, and ten of their members were the same word typed
 * twice: `BeadOccasion` (`beadData.ts`) named thirteen moments and
 * `TriumphOccasion` (`triumphs.ts`) named ten, and every one of the ten was in
 * both. That was not two vocabularies — it was one, written down twice, and kept
 * in step only by the fact that `awardOccasion` happens to hand its argument
 * straight to `awardBeadOccasion`. A moment added to one list and not the other
 * would have compiled and announced nothing.
 *
 * So the union lives here, in a module that imports nothing, and the two systems
 * derive from it:
 *
 *   · **the beads** take it whole — every announced moment is a moment a deed
 *     may name, which is what a Bead Race is;
 *   · **the Triumphs** take the intersection with their own trigger vocabulary
 *     (`TriumphOccasion = Extract<Occasion, TriumphTriggerKind>`), because the
 *     Triumph table also names *standing counts* — "some city of ten citizens" —
 *     and nothing announces one of those. A seam names an `Occasion` and cannot
 *     announce `cityPopulation`, which is exactly the guarantee the hand-written
 *     `Extract` used to give and now gives without a list to keep.
 *
 * **What is deliberately not here.** Three other unions in the codebase carry
 * the word "occasion" and none of them is this one:
 *
 *   · `WindfallOccasion` (`statecraftData.ts`) is a moment a rider *is paid at*,
 *     out of the empire's own cards, and its members are the seams that hand a
 *     payout to `windfallPayout`. Several of them (a chop, a purchase, a
 *     completion) announce nothing to the world at all.
 *   · `TallyOccasion` is a moment that is only ever **written down** — its own
 *     docblock makes the cut, and it is a real one: a wonder finished by
 *     *somebody else* is nobody's announcement about this empire.
 *   · `OrderBeadOccasion` is four deeds nothing announced before H3 built them,
 *     each hooked at one seam and each asked of one empire. They could join this
 *     union the day a Triumph or a feat wants them; until then, folding them in
 *     would put four moments in front of two evaluators that have nothing to say
 *     about any of them.
 *
 * Reconciling the four was H6's brief. The reading it reached is that **one** of
 * the four pairs was a duplication and the other three are different questions
 * that happen to share a noun — so this union is the merge, and the three
 * docblocks above are the answer.
 */

/**
 * A moment a seam announces, about one empire, at the instant it happens.
 *
 * Order is `BEAD_OCCASIONS`' own, unchanged: the list was already written down
 * once and reshuffling it would move a register for no reason at all.
 */
export type Occasion =
  /** This empire's highest age rose. `settleResearch`. */
  | 'ageEntered'
  /** A wonder was completed by this empire. `realiseItem`. */
  | 'wonderCompleted'
  /** A city was founded. `foundCityAt`. */
  | 'cityFounded'
  /** A city was taken by force. `captureCity`. */
  | 'cityCaptured'
  /** A government was adopted. `adoptGovernment`. */
  | 'governmentAdopted'
  /** A pantheon belief was consecrated. `consecrateBelief`. */
  | 'beliefConsecrated'
  /** A ruin or a village was claimed. `claimDiscoveryAt`. */
  | 'discoveryClaimed'
  /** A barbarian camp was cleared. `arriveOnTile`. */
  | 'campCleared'
  /** A battle was won against a defender of greater strength. `applyCombat`. */
  | 'battleWonAgainstStronger'
  /** A city was founded on a landmass this empire did not start on. */
  | 'cityOnOtherContinent'
  /** A religion was founded. `foundReligion`. */
  | 'religionFounded'
  /** A rival's seat of government changed hands. `captureCity`. */
  | 'capitalCaptured'
  /** A great person was called. `settleGreatPersonChoice`. */
  | 'greatPersonRecruited'
  /**
   * A **naval** unit was realised by this empire — The First Keel.
   *
   * Announced from `realiseItem`, the one routine that means "the city now has
   * the thing", so a hull hammered out, bought outright or handed over by a
   * wonder all say the same word. "First" is not in the name and must not be:
   * the occasion is *a* keel, and the Triumph's own `once` scope is what makes
   * it the first — a moment that knew how to count itself would be a second
   * register beside `Player.triumphs`.
   */
  | 'navalUnitBuilt'
  /**
   * **The world's age closed** — the countdown reaching nought (batch G1,
   * `docs/wager.md` §1). `runWorldClock`.
   *
   * The one member of this union that is a fact about the *world* rather than
   * about one empire, and it is announced to every real seat at once for that
   * reason: an age ending happens to everybody, and a deed that names it is
   * asking "were you the empire that had done X when the age turned over". It
   * is the moment G2 judges a wager on, which is why it is a word in the
   * shared vocabulary rather than a private signal inside the wager's own
   * module — a bead, and one day a Triumph, may name it too.
   *
   * Announced from the sweep rather than from a verb, which is the other thing
   * that makes it unlike its thirteen neighbours: nobody *does* it.
   */
  | 'ageClosed';

/** Every occasion, in declaration order. The register the hooks are pinned by. */
export const OCCASIONS: readonly Occasion[] = [
  'ageEntered',
  'wonderCompleted',
  'cityFounded',
  'cityCaptured',
  'governmentAdopted',
  'beliefConsecrated',
  'discoveryClaimed',
  'campCleared',
  'battleWonAgainstStronger',
  'cityOnOtherContinent',
  'religionFounded',
  'capitalCaptured',
  'greatPersonRecruited',
  'navalUnitBuilt',
  'ageClosed',
];
