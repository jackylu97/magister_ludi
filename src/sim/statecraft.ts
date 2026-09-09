/**
 * Statecraft: what culture is *for* (design ledger, Entry XV and XV.b).
 *
 * Two halves live here and they are deliberately one file, because they are one
 * idea read at two scales.
 *
 * **The ladder.** Culture fills an escalating meter; each fill is a draft, and
 * *tier is the draft count* — one number, one ladder. A draft offers 3 new cards
 * and a pass (`skipOrderOffer`, which buys a rarer hand next time); a government
 * is offered at tiers 3, 7 and 15 as a fixed triple
 * whose adoption is bankable; adopting swaps the slot spread, amnesties every
 * seal, and opens a Doctrine draft. All of it is `state.rng` at the moment an
 * offer opens, an ordinary command to spend it, and both halves in the log —
 * which is `discoveries.ts`'s shape (Entry XV's first consumer) inherited rather
 * than re-invented.
 *
 * **The evaluator.** Governments, Doctrines and slotted Orders are *effect
 * sources* exactly as a luxury's signature is, and this module is the **only**
 * place in the game that reads a `CardEffect`. `resourceEffects.ts` made that
 * claim for one table; this makes it for three, and the payoff is the same: a
 * new card is a JSON row. Every reader below returns a **labelled list**, and
 * every consumer folds that list into a breakdown it already had — rule 5 read
 * at the scale of a card. Nothing outside this file switches on `effect.kind`.
 *
 * The one-evaluator rule, said precisely
 * --------------------------------------
 * There are twenty-eight shapes in the vocabulary and one walk over them
 * (`liveEffects`). Every reader filters that walk; none of them re-derives which
 * cards are live, which are gated, or what a card's face is — a card is what its
 * row prints (the levelling ruling of 2026-09-04), so a reader sees ordinary
 * lines. That is what keeps the promise true as the table grows: the failure
 * mode of a second walk is a card that works everywhere except in the one ledger
 * somebody forgot.
 *
 * The import cycle with `cities.ts` and `meters.ts`, and why it is safe
 * --------------------------------------------------------------------
 * The same cycle `resourceEffects.ts` documents, for the same reason and with
 * the same guarantee. This module asks `cities.ts` which resources an empire
 * controls and which town is its capital, and asks `meters.ts` where the two
 * meters stand; both of those ask this module for the lines to fold into their
 * own breakdowns. It is a **function-level** cycle only: everything at the top
 * level here is a type or a constant from the data tables, and nothing in this
 * file may grow a top-level call into either.
 *
 * Conditions and recursion
 * ------------------------
 * `conditionRule` can ask about a meter, and a meter's value counts cards. That
 * is a genuine cycle, and it is cut in one stated place: **an empire condition
 * is evaluated against a reading that ignores every condition-gated effect**
 * (`conditionDepth` below). One rule, terminating, and exact for the content
 * that exists — Emergency Powers asks about authority and pays in production
 * and borders, neither of which is authority.
 * ---
 *
 * **This file is the index** (batch E3b — `docs/flags.md` item pp,
 * `docs/audit/evaluations.md` §4b step 9: *files by layer, not by topic*). The
 * nine thousand lines above split into three, along the seams the system
 * already had:
 *
 *   · `statecraft/evaluator.ts` — `liveEffects` and the **one** switch on
 *     `CardEffect.kind`, with every reader that filters its walk. CLAUDE.md's
 *     "the ONLY module switching on `CardEffect.kind`" is now that file.
 *   · `statecraft/describers.ts` — every `describe…`, the word tables and the
 *     keyword refs. Hard rule 7's tables stay together.
 *   · `statecraft/draft.ts` — the ladder, the pools, the offers, the rerolls,
 *     the slots and the governments.
 *
 * Every name is re-exported here **by name**, and that is deliberate rather
 * than tidy: `export * from` is copied eagerly by the dev server's module
 * runner, so a star re-export of a module that imports this one back comes out
 * empty in a cycle (batch E3b measured it — `foldTile is not a function` from
 * `moduleCycles.test.ts`). A named re-export compiles to a getter, read when
 * the name is *used*, which is exactly the deferral every function-level cycle
 * in this simulation already relies on.
 *
 * So `import { … } from './statecraft'` resolves as it always did, and a caller
 * that wants to name a layer may import the layer instead.
 */


export {
  anyCardDef,
  buildingMatchesYieldPercent,
  cardActionRule,
  cardAmplifier,
  cardAmplifierFlat,
  cardAuthority,
  cardBeadOccasions,
  cardBehaviorRule,
  cardBorderZoc,
  cardBuildingHappiness,
  cardBuildingPercents,
  cardCityRenownShares,
  cardCityStat,
  cardCombatLines,
  cardCombatPercent,
  cardEmpireRenownShares,
  cardExtraCharges,
  cardFoundingRider,
  cardHappiness,
  cardLinesOnBuilding,
  cardLandfallEffects,
  cardMeterFlag,
  cardMeterRule,
  cardOfferRule,
  cardPantheonSlots,
  cardPeriodicOffers,
  cardPressureRule,
  cardPressureSources,
  cardProduction,
  cardProjectPays,
  cardPurchaseRiders,
  cardRenownLines,
  cardRouteShareLines,
  cardRouteYieldLines,
  cardRuleIsScoped,
  cardRulePercent,
  cardTierBoost,
  cardGrantsAbility,
  cardTileLines,
  cardUnitStamp,
  cardUnitStat,
  cardUnlocksBuilding,
  cardUnlocksUnit,
  cardUpkeepRebateLines,
  cardUpkeepSurchargeLines,
  cardYieldConversions,
  cityBeliefUnlocksBuilding,
  cityHasFreshwater,
  cityScopeAdmits,
  consecrationCardTileLines,
  countOf,
  explainCardCityYields,
  explainCardEmpireYields,
  explainCardPercentYields,
  filledOrderSlots,
  foldCardRulePercent,
  foldCardYields,
  foldCityStat,
  followerBeliefEffects,
  followerCardTileLines,
  forgetTheLaw,
  heldReligions,
  liveCityEffects,
  liveEffects,
  liveUnitEffects,
  musterPeriodicUnits,
  payWindfallGrants,
  religionFounder,
  runPeriodicBoons,
  scopedCardTileLines,
  sealTurnsFor,
  slottedOrdersOfFlavour,
  tileConditionHolds,
  tileConditionReadsFold,
  timedCityTileLines,
  timedEffectIsLive,
  timedTurnsLeft,
  unitMatches,
  windfallPayout,
} from './statecraft/evaluator';
export type {
  CardBuildingHappinessLine,
  CardBuildingPercentLine,
  CardCityRenownShare,
  CardCityStatLine,
  CardCombatLine,
  CardMeterLine,
  CardPercentLine,
  CardPressureSource,
  CardProductionLine,
  CardPurchaseLine,
  CardRenownLine,
  CardRouteLine,
  CardRouteShareLine,
  CardRuleLine,
  CardTileLine,
  CardUpkeepLine,
  CardYieldLine,
  CombatSituation,
  EmpireRates,
  FoundingRider,
  LiveCardEffect,
  TileLine,
  WindfallOccasionFacts,
  WindfallPayout,
} from './statecraft/evaluator';

export {
  cityScopeWords,
  describeBuildingRow,
  describeCard,
  describeEffects,
  describeFamilyVerb,
  indefinite,
  occasionWords,
  periodicProbe,
  ref,
  REF_PATTERN,
  stripRefs,
  tileConditionWords,
} from './statecraft/describers';
export type {
  CardClause,
  RefKind,
} from './statecraft/describers';

export {
  adoptGovernmentAt,
  cardRouteSlots,
  doctrineChoiceError,
  draftCost,
  draftSettledBy,
  drawablePool,
  drawDoctrineOffer,
  drawOrderOffer,
  drawOrderOptions,
  drawWeighted,
  drawWithoutReplacement,
  explainOfferSize,
  foldOfferSize,
  governmentChoiceError,
  hasStatecraftOffer,
  holdsOrder,
  isSlotted,
  livePool,
  newPlayerStatecraft,
  nextDraftCost,
  offerSize,
  orderAtSlotPosition,
  orderChoiceError,
  orderDrawWeight,
  orderSkipError,
  planDraft,
  rarityDrawWeight,
  recordScalingOccasion,
  recordWorldScalingOccasion,
  runStatecraft,
  sealRemaining,
  settleCultureWindfall,
  settleDoctrineChoice,
  settleDraft,
  settleOrderChoice,
  settleOrderSkip,
  SLOT_WORDS,
  slotOf,
  slotOrderAt,
  slotOrderError,
  slotTypesOf,
  statecraftBlocker,
  statecraftOf,
  tallyOf,
  unslotOrderAt,
  unslotOrderError,
} from './statecraft/draft';
export type {
  DoctrineOffer,
  DraftCompletion,
  DraftPlan,
  GovernmentAdoption,
  GovernmentOffer,
  OfferKind,
  OfferSizeLine,
  OrderChoice,
  OrderOffer,
  OrderSkip,
  OrderTally,
  PlayerStatecraft,
  SlotOutcome,
  SlottedOrder,
} from './statecraft/draft';
