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
  | 'ageClosed'
  /**
   * **A wager was kept** — one seat cleared one of the three bars the age dealt
   * (batch G2, `docs/wager.md` §3b). `runWagers`.
   *
   * The claim-on-met rule is what makes this a *moment* at all: a wager is
   * claimed the turn its bar is first met rather than at the age's close, so
   * there is an instant to announce and a player can watch the bead land. Its
   * neighbour `ageClosed` is a fact about the world; this one is about an empire
   * again, like the thirteen above it.
   *
   * The **beads the wager pays** are not this: they are ordinary repeatable
   * grant rows minted beside the announcement (`payWagerBeads`). This word is
   * here so a deed or a Triumph may one day name the moment, and so the Abacus
   * has something to flip on — which is the same argument that put `ageClosed`
   * in the shared vocabulary rather than in one module's private signal.
   */
  | 'wagerClaimed'
  /**
   * **A malice took a chair** — one seat's staked bar went unmet at an age's
   * close and the world seated a card in its council (batch G3,
   * `docs/wager.md` §4). `runWagers`, at the judgement.
   *
   * `wagerClaimed`'s opposite number, and it is in this shared vocabulary for
   * that word's reason exactly: the seating is a *moment*, it happens to one
   * empire, and the deed sheet and the Abacus both want something to flip on. A
   * deed or a Triumph may one day name it — "the age you took none" is an
   * ordinary thing for a deed to ask, and it can only be asked of a word the
   * world says out loud.
   *
   * What it deliberately is **not** is the punishment: the effect is the card in
   * the chair, read by `liveEffects`, and this is the announcement beside it.
   */
  | 'maliceSeated'
  /**
   * **A census named this empire first** — the world measured on one figure,
   * and this is the seat at the head of it (batch C1, `docs/wager.md` §10/§11).
   * `runCensus`.
   *
   * The census itself is a fact about the world, like `ageClosed` two members
   * up: it is taken of everybody at once and every seat is ranked in it. What
   * is announced *about an empire* is the head of that ranking, which is why
   * this word is announced to the leader alone and to nobody else — a moment
   * every seat heard would be a deed every seat could name, and "the world was
   * measured" is not something anybody did.
   *
   * It is here rather than inside the census's own module for `wagerClaimed`'s
   * reason exactly: the Triumph table names it (`censusLeader`, the repeatable
   * row worth `rules.census.renown`), a deed may one day name it too, and both
   * of those read this shared vocabulary rather than a private signal. A census
   * whose head row reads **nought** announces nothing at all — leading the world
   * at nothing is not a deed.
   */
  | 'censusTaken';

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
  'wagerClaimed',
  'maliceSeated',
  'censusTaken',
];
