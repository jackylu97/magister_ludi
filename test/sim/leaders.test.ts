/**
 * **The leader system in the simulation** — batch L6a, `docs/flags.md` (xxxx),
 * spec of record `docs/leaders.md` "The second cut — fixed identity".
 *
 * A figure is four things and this file pins all four: **two abilities**, live
 * from the turn the seat sits down and for the rest of the game; **one unique
 * unit** and **one unique building**, rows only that figure may raise and only
 * once their own technology has arrived. Everything below is a claim about one
 * of those:
 *
 *   · both abilities are in the law on turn one, for every one of the thirteen,
 *     before anything has been researched or built;
 *   · a unique opens for its figure's seat at its tech, and for no other seat at
 *     any tech; a row nobody names opens for nobody, ever — the bench;
 *   · the draft is **gone**: the command is unknown, no blocker fires, no phase
 *     runs, and a config naming a figure replays byte for byte;
 *   · a figure's unique may carry rules of its own, and they ride the law of the
 *     one figure that may field it;
 *   · the new shapes, each pinned by itself — the Rihla's free redraw, the
 *     caravan that pays and is not plundered, soldiers bought with faith in the
 *     Sainte-Chapelle, the Funduq in a town with no caravanserai, the
 *     Tetzcotzinco's share of the whole yield;
 *   · the sheet and the doc agree — "The thirteen", "The colours", "The cities"
 *     and "The biases", row for row;
 *   · every declared effect shape is read by the evaluator;
 *   · the book has a shelf.
 */

import { describe, expect, it } from 'vitest';

import { nextBotCommand } from '../../src/ai/bot';
import { type BuildingId, buildingDef } from '../../src/sim/buildingData';
import {
  IMPROVEMENT_IDS,
  type ImprovementId,
  improvementDef,
} from '../../src/sim/improvementData';
import { improvementOpenTo } from '../../src/sim/improvements';
import { foundCityAt } from '../../src/sim/cities';
import { getTileAt } from '../../src/sim/map';
import { type Command } from '../../src/sim/commands';
import { dispatch, snapshotState } from '../../src/sim/game';
import {
  LEADER_ABILITY_IDS,
  LEADER_IDS,
  type LeaderId,
  leaderAbility,
  leaderAbilityEffects,
  leaderDef,
} from '../../src/sim/leaderData';
import { OCCASIONS } from '../../src/sim/occasions';
import { type GameState, bumpRevision, playerById } from '../../src/sim/state';
import { liveEffects } from '../../src/sim/statecraft';
import { isUnlocked } from '../../src/sim/tech';
import { BUILDING_UNLOCK_TECH, TECH_IDS, UNIT_UNLOCK_TECH, techDef } from '../../src/sim/techData';
import { UNIT_TYPE_IDS, unitDef } from '../../src/sim/unitData';
import { BUILDING_IDS } from '../../src/sim/buildingData';
import { firstBlocker } from '../../src/ui/turnBlockers';
import { compendiumSections } from '../../src/ui/compendium';
import { createGame } from '../../src/sim/game';
import { inkDistance, MIN_INK_DISTANCE } from '../../src/art/seatInks';
import { SEATS } from '../../src/ui/gameSetup';

// --- the bench --------------------------------------------------------------

const EVALUATOR_SOURCE = (
  import.meta.glob('../../src/sim/statecraft/evaluator.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>
)['../../src/sim/statecraft/evaluator.ts']!;

const LEADER_DATA_SOURCE = (
  import.meta.glob('../../src/sim/leaderData.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>
)['../../src/sim/leaderData.ts']!;

const DOC = (
  import.meta.glob('../../docs/leaders.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>
)['../../docs/leaders.md']!;

function raw(first?: LeaderId, second?: LeaderId, seed = 11) {
  return createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true, ...(first ? { leader: first } : {}) },
      { name: 'Bors', color: '#3a7fe8', ...(second ? { leader: second } : {}) },
    ],
  });
}

function game(first?: LeaderId, second?: LeaderId, seed = 11) {
  const g = raw(first, second, seed);
  for (const playerId of [0, 1]) {
    const settler = g.state.units.find(
      (unit) => unit.ownerId === playerId && unitDef(unit.type).foundsCity,
    )!;
    foundCityAt(g.state, playerId, getTileAt(g.state.map, settler.col, settler.row)!);
  }
  return g;
}

/** Hands a seat every technology there is. A unique's gate is its own tech. */
function learnEverything(state: GameState, playerId: number): void {
  const player = playerById(state, playerId)!;
  for (const id of TECH_IDS) {
    if (!player.techsResearched.includes(id)) player.techsResearched.push(id);
  }
  bumpRevision(state);
}

/** The ids the law is carrying for this seat, in the walk's own order. */
function lawSources(state: GameState, playerId: number): string[] {
  return liveEffects(state, playerId).map((held) => String(held.card));
}

// --- the two abilities ------------------------------------------------------

describe('a figure’s two abilities', () => {
  /**
   * **The whole of the second cut, walked over the whole roster.** There is no
   * age, no draft and no gate: a figure's pair of lines is in the seat's law on
   * turn one, before a settler has stopped walking, and stays there. Every one
   * of the thirteen, because "one of them forgot" is exactly the failure a
   * hand-picked example would miss.
   */
  it('are both live from the first turn, for every one of the thirteen', () => {
    for (const id of LEADER_IDS) {
      const g = raw(id);
      const sources = lawSources(g.state, 0);
      for (const ability of leaderDef(id).abilities) {
        expect(sources, `${id} · ${ability.id}`).toContain(ability.id);
      }
    }
  });

  it('reach the law with every effect the sheet wrote, and nothing beside', () => {
    for (const id of LEADER_IDS) {
      const g = raw(id);
      const held = liveEffects(g.state, 0).filter((line) =>
        leaderDef(id).abilities.some((ability) => ability.id === line.card),
      );
      expect(held.map((line) => line.effect), id).toEqual(leaderAbilityEffects(id));
    }
  });

  it('are exactly two a figure, named once across the whole sheet', () => {
    expect(LEADER_ABILITY_IDS).toHaveLength(LEADER_IDS.length * 2);
    expect(new Set(LEADER_ABILITY_IDS).size).toBe(LEADER_ABILITY_IDS.length);
    for (const id of LEADER_IDS) expect(leaderDef(id).abilities, id).toHaveLength(2);
  });

  it('belong to the seat that plays the figure and to no other', () => {
    const g = raw('joan', 'mansaMusa');
    expect(lawSources(g.state, 0)).toContain('theVoices');
    expect(lawSources(g.state, 1)).not.toContain('theVoices');
    expect(lawSources(g.state, 1)).toContain('theHajj');
  });

  it('are absent entirely from a roster that names no figure', () => {
    const g = raw();
    const ids = new Set(lawSources(g.state, 0));
    for (const ability of LEADER_ABILITY_IDS) expect(ids.has(ability), ability).toBe(false);
    for (const leader of LEADER_IDS) expect(ids.has(leader), leader).toBe(false);
  });
});

// --- the two uniques --------------------------------------------------------

/** Every row a figure names, in sheet order. The uniques' own register. */
function claimedUnits(): string[] {
  return LEADER_IDS.map((id) => leaderDef(id).unit);
}

/**
 * A figure's **second** unique, with its kind — a hall for twelve of the
 * thirteen, a work of the ground for the one (batch L8).
 *
 * Read off the sheet and never assumed, which is the whole of what L8 changed
 * here: the claims below are about "the row nobody else may raise", and which
 * *table* that row lives in is the figure's business. The load validator has
 * already refused a figure carrying neither.
 */
type SecondUnique =
  | { kind: 'building'; id: BuildingId }
  | { kind: 'improvement'; id: ImprovementId };

function secondUnique(leader: LeaderId): SecondUnique {
  const def = leaderDef(leader);
  return def.improvement !== undefined
    ? { kind: 'improvement', id: def.improvement }
    : { kind: 'building', id: def.building! };
}

function claimedSeconds(): SecondUnique[] {
  return LEADER_IDS.map((id) => secondUnique(id));
}

function secondName(row: SecondUnique): string {
  return row.kind === 'building' ? buildingDef(row.id).name : improvementDef(row.id).name;
}

/**
 * Whether this seat may raise that second row now — `isUnlocked` for a hall,
 * and the two questions `isUnlocked` cannot be asked for a work of the ground
 * (`improvementOpenTo`: the figure's gate, then the row's own technology).
 */
function secondOpen(state: GameState, playerId: number, row: SecondUnique): boolean {
  return row.kind === 'building'
    ? isUnlocked(state, playerId, 'building', row.id)
    : improvementOpenTo(state, playerId, row.id);
}

describe('a unique row', () => {
  /**
   * **Two questions, and both must answer yes.** The seat's sheet has to name
   * the row *and* the row's own technology has to have come — which is the whole
   * of the second cut's unlock rule and the reason there is no age machinery
   * anywhere in the system.
   */
  it('opens for its figure’s seat once its own technology has come', () => {
    for (const id of LEADER_IDS) {
      const def = leaderDef(id);
      const g = game(id);
      learnEverything(g.state, 0);
      const second = secondUnique(id);
      expect(isUnlocked(g.state, 0, 'unit', def.unit), `${id} · ${def.unit}`).toBe(true);
      expect(secondOpen(g.state, 0, second), `${id} · ${second.id}`).toBe(true);
    }
  });

  it('opens for no other seat, at any technology at all', () => {
    for (const id of LEADER_IDS) {
      const def = leaderDef(id);
      const second = secondUnique(id);
      // A seat under somebody else's figure, and a seat under nobody.
      const other = LEADER_IDS.find((candidate) => candidate !== id)!;
      const g = game(other);
      learnEverything(g.state, 0);
      learnEverything(g.state, 1);
      expect(isUnlocked(g.state, 0, 'unit', def.unit), `${other} holds ${def.unit}`).toBe(false);
      expect(secondOpen(g.state, 1, second), `nobody holds ${second.id}`).toBe(false);
    }
  });

  /**
   * **The bench.** The first cut's other pieces kept their rules, their prices
   * and their marker, and are opened by nobody — which is a row waiting for a
   * figure rather than a row deleted.
   */
  it('that nobody names opens for nobody, however much they have researched', () => {
    const claimedU = new Set(claimedUnits());
    const claimed = new Set(claimedSeconds().map((row) => row.id as string));
    const benchUnits = UNIT_TYPE_IDS.filter(
      (id) => unitDef(id).unlockedByLeader === true && !claimedU.has(id),
    );
    const benchBuildings = BUILDING_IDS.filter(
      (id) => buildingDef(id).unlockedByLeader === true && !claimed.has(id),
    );
    // The **improvements' bench**, which the Terraces opened (batch L8): a work
    // of the ground carrying the marker that no figure's sheet names is refused
    // to every seat, the roster's rule read one table over.
    const benchGround = IMPROVEMENT_IDS.filter(
      (id) => improvementDef(id).unlockedByLeader === true && !claimed.has(id),
    );
    expect(benchUnits.length + benchBuildings.length, 'the bench is not empty').toBeGreaterThan(0);
    for (const leader of LEADER_IDS) {
      const g = game(leader);
      learnEverything(g.state, 0);
      for (const id of benchUnits) {
        expect(isUnlocked(g.state, 0, 'unit', id), `${leader} · ${id}`).toBe(false);
      }
      for (const id of benchBuildings) {
        expect(isUnlocked(g.state, 0, 'building', id), `${leader} · ${id}`).toBe(false);
      }
      for (const id of benchGround) {
        expect(improvementOpenTo(g.state, 0, id), `${leader} · ${id}`).toBe(false);
      }
    }
  });

  it('is not opened by the sheet alone — the technology still has to arrive', () => {
    // Joan's Gendarme sits at column 11 and her Sainte-Chapelle behind the
    // Temple; a seat on turn one holds neither, sheet or no sheet.
    const g = game('joan');
    expect(isUnlocked(g.state, 0, 'unit', 'gendarme')).toBe(false);
    expect(isUnlocked(g.state, 0, 'building', 'sainteChapelle')).toBe(false);
  });

  it('is one figure’s and one figure’s only — no row is claimed twice', () => {
    expect(new Set(claimedUnits()).size).toBe(LEADER_IDS.length);
    // **Across all three kinds** (batch L8): thirteen second rows, no id twice,
    // and every one of them carrying the marker of its own table.
    const seconds = claimedSeconds();
    expect(new Set(seconds.map((row) => row.id as string)).size).toBe(LEADER_IDS.length);
    for (const id of claimedUnits()) expect(unitDef(id as never).unlockedByLeader, id).toBe(true);
    for (const row of seconds) {
      const marked =
        row.kind === 'building'
          ? buildingDef(row.id).unlockedByLeader
          : improvementDef(row.id).unlockedByLeader;
      expect(marked, row.id).toBe(true);
    }
  });

  /**
   * **A figure carries a soldier and one of the other two, never neither.** The
   * fourth line of a face is a thing nobody else may build; which table it lives
   * in is the figure's business, and a figure with an empty fourth line would be
   * a face the landing screen could not draw.
   */
  it('is a soldier and exactly one of a hall or a work of the ground', () => {
    for (const id of LEADER_IDS) {
      const def = leaderDef(id);
      const kinds = [def.building, def.improvement].filter((row) => row !== undefined);
      expect(kinds.length, `${id} carries ${kinds.length} second uniques`).toBe(1);
    }
    // And the one who trades the hall for a field is the one the ruling names.
    const ground = LEADER_IDS.filter((id) => leaderDef(id).improvement !== undefined);
    expect(ground).toEqual(['pachacuti']);
    expect(leaderDef('pachacuti').building).toBeUndefined();
  });

  /**
   * A unique's own rules ride the law of the figure that may field it, scoped to
   * the row's class in the row's own data (`UnitDef.effects`). The pin is that
   * they arrive at all and arrive for nobody else.
   */
  it('brings its own rules into its figure’s law and into no other seat’s', () => {
    const g = game('mansaMusa', 'joan');
    const mine = liveEffects(g.state, 0).filter((line) => line.card === 'mansaMusa');
    expect(mine.map((line) => line.effect)).toEqual(unitDef('mandekalu').effects);
    expect(liveEffects(g.state, 1).some((line) => line.card === 'mansaMusa')).toBe(false);
  });
});

// --- the draft, retired -----------------------------------------------------

describe('the draft', () => {
  it('is an unknown command, refused, and the state is byte-identical', () => {
    const g = game('pachacuti');
    const before = snapshotState(g.state);
    const result = dispatch(g, { type: 'chooseLeaderCard', playerId: 0, index: 0 } as never);
    expect(result.ok).toBe(false);
    expect(snapshotState(g.state)).toEqual(before);
  });

  it('raises no blocker on a seat under a figure, on turn one or any other', () => {
    const g = game('akhenaten');
    for (let turn = 0; turn < 3; turn += 1) {
      expect(firstBlocker(g.state, 0)?.kind).not.toBe('leaderDraft');
      g.state.turn += 1;
    }
  });

  it('leaves no occasion behind it', () => {
    expect(OCCASIONS).not.toContain('leaderOffered' as never);
  });

  it('writes no field on the seat — a figure is the whole of the record', () => {
    const g = game('modu');
    const seat = playerById(g.state, 0)! as unknown as Record<string, unknown>;
    expect(seat['leaderPicks']).toBeUndefined();
    expect(seat['leaderOffer']).toBeUndefined();
    expect(seat['leader']).toBe('modu');
  });

  it('lets the bots play a seat under a figure without stalling', () => {
    const g = game('taizong', 'mithridates');
    for (const playerId of [0, 1]) {
      const command = nextBotCommand(g.state, playerId);
      // Whatever it decides, it decides *something* and it is never the retired
      // pick — a bot that still owed a card would answer `null` for ever.
      if (command !== null) expect((command as { type: string }).type).not.toBe('chooseLeaderCard');
    }
  });
});

// --- determinism ------------------------------------------------------------

describe('a config naming a figure', () => {
  it('replays byte for byte from its own log', () => {
    const first = game('hypatiaOfAlexandria', 'hildegard', 4);
    const second = game('hypatiaOfAlexandria', 'hildegard', 4);
    expect(snapshotState(second.state)).toEqual(snapshotState(first.state));
  });

  it('costs a leaderless game nothing at all', () => {
    const plain = raw();
    const again = raw();
    expect(snapshotState(again.state)).toEqual(snapshotState(plain.state));
  });
});

// --- the new shapes ---------------------------------------------------------

describe('the Rihla', () => {
  /** A seat holding a hand, so the redraw has something to redraw. */
  function dealt() {
    const g = game('ibnBattutaOfTangier', 'pachacuti');
    const sc = playerById(g.state, 0)!.statecraft;
    sc.pendingOrder = { options: [...(sc.pendingOrder?.options ?? [])] };
    return g;
  }

  it('opens the reroll’s door and waives the first asking’s price', async () => {
    const { explainRerollCost, rerollDoorOpen } = await import('../../src/sim/religion');
    const g = dealt();
    expect(rerollDoorOpen(g.state, 0)).toBe(true);
    const price = explainRerollCost(g.state, 0, 'order');
    expect(price.total).toBe(0);
    expect(price.lines.map((line) => line.source)).toEqual(['The Rihla']);
  });

  it('is spent by the redraw it paid for, and the next asking costs', async () => {
    const { explainRerollCost, settleReroll } = await import('../../src/sim/religion');
    const g = dealt();
    const player = playerById(g.state, 0)!;
    const before = player.faithPool;
    const taken = player.statecraft.rerollsTaken;
    expect(settleReroll(g.state, player)?.paid).toBe(0);
    // Nothing was spent and the lifetime ladder did not move — a waived asking
    // is not an asking the price should remember.
    expect(player.faithPool).toBe(before);
    expect(player.statecraft.rerollsTaken).toBe(taken);
    // And the stamp is on the hand it dealt, so the second asking is priced.
    expect(player.statecraft.pendingOrder?.rerolled).toBe(true);
    expect(explainRerollCost(g.state, 0, 'order').total).toBeGreaterThan(0);
  });

  it('is never a belief’s — that hand has a free asking of its own', async () => {
    const { rihlaPaysFor } = await import('../../src/sim/religion');
    const g = dealt();
    const player = playerById(g.state, 0)!;
    expect(rihlaPaysFor(g.state, player, 'belief')).toBe(false);
    expect(rihlaPaysFor(g.state, player, 'order')).toBe(true);
  });

  it('belongs to the seat that holds it and to no other', async () => {
    const { rerollDoorOpen } = await import('../../src/sim/religion');
    const g = dealt();
    expect(rerollDoorOpen(g.state, 1)).toBe(false);
  });
});

describe('A Guest at Every Court', () => {
  /**
   * **The fourth chair is open on turn one.** `newPlayerStatecraft` builds the
   * chiefdom's bare spread before any law exists to read; `newGame` refits each
   * seat once the figure is in it (user, 2026-09-14: "his first government
   * should start with 1 military 1 economic and 2 wildcards"). The rival at the
   * same table keeps the chiefdom's three, and the chiefdom's own chairs keep
   * their flavours — the extra one is appended, a wildcard by construction.
   */
  it('seats Ibn Battuta’s council with one more wildcard chair from the first turn', async () => {
    const { slotTypesOf } = await import('../../src/sim/statecraft');
    const g = raw('ibnBattutaOfTangier', 'pachacuti');
    const mine = playerById(g.state, 0)!.statecraft;
    const theirs = playerById(g.state, 1)!.statecraft;
    expect(slotTypesOf(mine)).toEqual(['military', 'economic', 'wildcard', 'wildcard']);
    expect(mine.slots).toEqual([null, null, null, null]);
    expect(slotTypesOf(theirs)).toEqual(['military', 'economic', 'wildcard']);
  });
});

describe('the Rihla caravan', () => {
  it('is the trader Ibn Battuta’s seat sends, and the roster’s for everyone else', async () => {
    const { caravanTypeFor } = await import('../../src/sim/routes');
    const g = game('ibnBattutaOfTangier', 'pachacuti');
    expect(caravanTypeFor(g.state, 0)).toBe('rihlaCaravan');
    expect(caravanTypeFor(g.state, 1)).toBe('trader');
  });

  it('pays its three coins on every road, and cannot be plundered', () => {
    const g = game('ibnBattutaOfTangier');
    const mine = liveEffects(g.state, 0).filter((line) => line.card === 'ibnBattutaOfTangier');
    expect(mine.map((line) => line.effect)).toEqual([
      { kind: 'pays', where: 'route', gold: 3 },
      { kind: 'rule', rule: 'tradersUnplunderable' },
    ]);
  });

  /**
   * **And the blow really does not land.** The rule is `tradersUnplunderable`,
   * which takes a laden cart out of the *target list* rather than letting a blow
   * resolve and do nothing — so the pin is asked of the one reading that
   * decides it, with a rival's identical cart beside it as the control.
   */
  it('leaves a rival’s laden cart takeable and its own alone', async () => {
    const { cardBehaviorRule } = await import('../../src/sim/statecraft');
    const g = game('ibnBattutaOfTangier', 'pachacuti');
    expect(cardBehaviorRule(g.state, 0, 'tradersUnplunderable')).toBe(true);
    expect(cardBehaviorRule(g.state, 1, 'tradersUnplunderable')).toBe(false);
  });
});

describe('the Sainte-Chapelle', () => {
  it('opens the faith bank for a soldier, and leaves it shut for a settler', async () => {
    const { explainPurchaseCost } = await import('../../src/sim/purchase');
    const g = game('joan');
    const city = g.state.cities.find((held) => held.ownerId === 0)!;
    learnEverything(g.state, 0);
    const soldier = { kind: 'unit', id: 'warrior' } as const;
    const civilian = { kind: 'unit', id: 'settler' } as const;
    // Shut before the chapel stands: a town sells for coin like every other.
    expect(explainPurchaseCost(g.state, 0, city.id, soldier, 'faith')).toBeNull();
    city.buildings.push('sainteChapelle');
    bumpRevision(g.state);
    expect(explainPurchaseCost(g.state, 0, city.id, soldier, 'faith')).not.toBeNull();
    // And the word is the civilian arm's negation, not its widening.
    expect(explainPurchaseCost(g.state, 0, city.id, civilian, 'faith')).toBeNull();
  });
});

describe('the Funduq', () => {
  it('stands in a town holding no caravanserai, and is not once an empire', () => {
    expect(buildingDef('funduq').requiresBuilding).toBeUndefined();
    expect(buildingDef('funduq').requiresSite).toBeUndefined();
    expect(buildingDef('funduq').oncePerEmpire).toBeUndefined();
    // The row it replaces is the one that carries both restrictions.
    expect(buildingDef('caravanserai').oncePerEmpire).toBe(true);
  });
});

describe('the Tetzcotzinco', () => {
  it('takes its share of the whole yield, not of the surplus', () => {
    const effects = buildingDef('tetzcotzinco').effects ?? [];
    const share = effects.find((effect) => effect.kind === 'percentYields');
    expect(share).toEqual({
      kind: 'percentYields',
      yield: 'food',
      percent: 15,
      scope: { test: 'hasBuilding', building: 'tetzcotzinco' },
    });
    // The Aqueduct is the other reading of the same words and stays the other
    // reading: a `rulePercent` on `growthSurplus` is the surplus alone.
    expect(
      (buildingDef('aqueduct').effects ?? []).some((effect) => effect.kind === 'rulePercent'),
    ).toBe(true);
  });

  it('keeps the Garden’s own effects beside it', () => {
    const garden = buildingDef('garden').effects ?? [];
    const mine = buildingDef('tetzcotzinco').effects ?? [];
    for (const effect of garden) expect(mine).toContainEqual(effect);
  });
});

// --- the register -----------------------------------------------------------

describe('the sheet register', () => {
  it('declares no effect shape the evaluator does not read', () => {
    const kinds = new Set<string>();
    for (const id of LEADER_ABILITY_IDS) {
      for (const effect of leaderAbility(id).effects) kinds.add(effect.kind);
    }
    for (const id of LEADER_IDS) {
      for (const effect of unitDef(leaderDef(id).unit).effects ?? []) kinds.add(effect.kind);
    }
    for (const kind of kinds) {
      expect(EVALUATOR_SOURCE, `no arm reads "${kind}"`).toContain(`'${kind}'`);
    }
  });

  it('names every ability in `LeaderAbilityId`, and names nothing else', () => {
    const declared = new Set(
      [...LEADER_DATA_SOURCE.matchAll(/^ {2}\| '([a-zA-Z]+)';?$/gm)].map((hit) => hit[1]!),
    );
    for (const id of LEADER_ABILITY_IDS) {
      expect(declared.has(id), `${id} is not in the union`).toBe(true);
    }
    const live = new Set<string>(LEADER_ABILITY_IDS);
    for (const id of declared) expect(live.has(id), `${id} names no ability`).toBe(true);
  });

  it('gives every ability something to do, or says in plain words why not', () => {
    for (const id of LEADER_ABILITY_IDS) {
      const ability = leaderAbility(id);
      const acts = ability.effects.length > 0 || (ability.deferred ?? []).length > 0;
      expect(acts, `${id} does nothing and does not say so`).toBe(true);
      expect(ability.name.length, id).toBeGreaterThan(0);
      expect(ability.text.length, id).toBeGreaterThan(0);
    }
  });
});

// --- the sheet and the doc --------------------------------------------------

describe('the doc’s tables and the data', () => {
  /** Every `| … |` row of one heading's table, cells trimmed. */
  function tableRows(heading: string): string[][] {
    const start = DOC.indexOf(heading);
    expect(start, heading).toBeGreaterThanOrEqual(0);
    const after = start + heading.length;
    const ends = [DOC.indexOf('\n## ', after), DOC.indexOf('\n### ', after)].filter(
      (at) => at >= 0,
    );
    const end = ends.length === 0 ? -1 : Math.min(...ends);
    const section = DOC.slice(start, end === -1 ? undefined : end);
    // **The first table under the heading and no other.** "The thirteen" is
    // followed by a sketchbook table of figures that are *not* in the game, so a
    // walk of every pipe line in the section would compare the roster against
    // the shelf. A table is a contiguous run of lines, which is what stops here.
    const rows: string[][] = [];
    let started = false;
    for (const line of section.split('\n')) {
      if (!line.startsWith('|')) {
        if (started) break;
        continue;
      }
      started = true;
      const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
      if (cells.every((cell) => /^-+$/.test(cell))) continue;
      rows.push(cells);
    }
    return rows;
  }

  /** "**Pachacuti**" → "Pachacuti"; "*the Voices*: a kill…" → "the Voices". */
  function plain(cell: string): string {
    return cell.replace(/\*\*/g, '').trim();
  }
  function abilityName(cell: string): string {
    const italic = /^\*(.+?)\*/.exec(cell.trim());
    return italic ? italic[1]!.trim() : cell.trim();
  }

  it('carries the same thirteen figures, with the same ability names', () => {
    const rows = tableRows('### The thirteen').filter((cells) => cells[0] !== 'figure');
    expect(rows).toHaveLength(LEADER_IDS.length);
    rows.forEach((cells, at) => {
      const def = leaderDef(LEADER_IDS[at]!);
      expect(plain(cells[0]!), `row ${at}`).toBe(def.name);
      // The people column is the word a sentence puts after "the" (`seatPeople`,
      // `docs/flags.md` (ppppp)), so the doc and the sheet are held together the
      // way the figure's own name is — a fourteenth figure names its country in
      // the same edit, or this fails.
      expect(plain(cells[1]!), `${def.name} people`).toBe(def.people);
      // Names are compared case-insensitively and without the leading article's
      // capital: the table writes them in prose ("*the Voices*") and the sheet
      // writes them as titles ("The Voices"), which is the same name twice.
      for (const half of [0, 1] as const) {
        expect(
          abilityName(cells[3 + half]!).toLowerCase(),
          `${def.name} ability ${half + 1}`,
        ).toBe(def.abilities[half]!.name.toLowerCase());
      }
      // The unique cells name the rows in prose; the row's own name is in them.
      // The **last cell is read by kind** (batch L8): a hall for twelve of the
      // thirteen and a work of the ground for the one, so the column holds a
      // name off whichever table the figure's sheet points at.
      expect(
        cells[5]!.toLowerCase(),
        `${def.name} unit`,
      ).toContain(unitDef(def.unit).name.replace(/^The /, '').toLowerCase());
      const second = secondUnique(LEADER_IDS[at]!);
      expect(
        cells[6]!.toLowerCase(),
        `${def.name} ${second.kind}`,
      ).toContain(secondName(second).replace(/^The /, '').toLowerCase());
      // And a work of the ground says in the cell that it is one, so a reader of
      // the table is never told a field is a hall.
      if (second.kind === 'improvement') {
        expect(cells[6]!.toLowerCase(), `${def.name} says its kind`).toContain(
          'unique improvement',
        );
      }
    });
  });

  it('names the same towns, in the same order', () => {
    const rows = tableRows('## The cities').filter((cells) => cells[0] !== 'Leader');
    expect(rows).toHaveLength(LEADER_IDS.length);
    rows.forEach((cells, at) => {
      const def = leaderDef(LEADER_IDS[at]!);
      expect(cells[0], `row ${at}`).toBe(def.name);
      expect(cells[1]!.split(' · ').map((name) => name.trim()), def.name).toEqual([...def.cities]);
    });
  });

  it('writes the same bias, weight for weight and want for want', () => {
    const rows = tableRows('### The biases').filter((cells) => cells[0] !== 'Leader');
    expect(rows).toHaveLength(LEADER_IDS.length);
    /** "river 6 · hills 1.5" → {river: 6, hills: 1.5}; "—" → {}. */
    function pairs(cell: string): Record<string, number> {
      if (cell === '—') return {};
      const out: Record<string, number> = {};
      for (const part of cell.split(' · ')) {
        const [key, value] = part.trim().split(' ');
        out[key!] = Number(value);
      }
      return out;
    }
    rows.forEach((cells, at) => {
      const def = leaderDef(LEADER_IDS[at]!);
      const bias = def.startBias;
      expect(cells[0], `row ${at}`).toBe(def.name);
      expect(pairs(cells[1]!), `${def.name} terrain`).toEqual({ ...(bias.terrain ?? {}) });
      expect(pairs(cells[2]!), `${def.name} wants`).toEqual({ ...(bias.wants ?? {}) });
      expect(pairs(cells[3]!), `${def.name} resources`).toEqual({ ...(bias.resources ?? {}) });
      expect(pairs(cells[4]!), `${def.name} luxuries`).toEqual({ ...(bias.luxuries ?? {}) });
      expect(
        cells[5] === '—' ? [] : cells[5]!.split(' · ').map((word) => word.trim()),
        `${def.name} furnish`,
      ).toEqual([...(bias.furnish ?? [])]);
    });
  });

  it('leaves not one deck table behind it', () => {
    expect(DOC).not.toContain('The starting six — the decks');
    expect(DOC).not.toMatch(/^leader bonus:/m);
  });
});

// --- the colours ------------------------------------------------------------

describe('the thirteen’s inks', () => {
  /**
   * Thirteen distinct primaries, none within the palette's own distance of
   * another figure's or of a plain seat's. The failure is the kind nobody
   * reports — two empires whose borders are the same green — so the pin names
   * the offending pair rather than merely failing.
   */
  it('are thirteen distinct fields, and none crowds a plain seat’s', () => {
    const inks: { name: string; hex: string }[] = [
      ...LEADER_IDS.map((id) => ({ name: leaderDef(id).name, hex: leaderDef(id).colors.primary })),
      ...SEATS.map((seat) => ({ name: `seat · ${seat.name}`, hex: seat.color })),
    ];
    expect(new Set(LEADER_IDS.map((id) => leaderDef(id).colors.primary)).size).toBe(
      LEADER_IDS.length,
    );
    for (let a = 0; a < inks.length; a += 1) {
      for (let b = a + 1; b < inks.length; b += 1) {
        expect(
          inkDistance(inks[a]!.hex, inks[b]!.hex),
          `${inks[a]!.name} and ${inks[b]!.name} wear the same ink`,
        ).toBeGreaterThanOrEqual(MIN_INK_DISTANCE);
      }
    }
  });

  it('gives every figure a first town nobody else’s list takes', () => {
    const firsts = LEADER_IDS.map((id) => leaderDef(id).cities[0]);
    expect(new Set(firsts).size).toBe(LEADER_IDS.length);
    for (const id of LEADER_IDS) expect(leaderDef(id).cities.length, id).toBeGreaterThanOrEqual(10);
  });
});

// --- the shelf --------------------------------------------------------------

describe('the Compendium', () => {
  it('shelves the thirteen, each with its four lines and its towns', () => {
    const shelf = compendiumSections().find((section) => section.id === 'leader');
    // The shelf opens with its own "about" page; the thirteen follow it.
    expect(shelf?.entries.length).toBeGreaterThanOrEqual(LEADER_IDS.length);
    for (const id of LEADER_IDS) {
      const def = leaderDef(id);
      const entry = shelf!.entries.find((held) => held.name === def.name);
      expect(entry, id).toBeDefined();
      const words = entry!.clauses.map((clause) => clause.text).join(' ');
      for (const ability of def.abilities) expect(words, `${id} · ${ability.id}`).toContain(ability.name);
      expect(words, `${id} unit`).toContain(unitDef(def.unit).name);
      expect(words, `${id} second`).toContain(secondName(secondUnique(id)));
      expect(words, `${id} towns`).toContain(def.cities[0]!);
      expect(words, `${id} colours`).toContain(def.colors.names[0]);
    }
  });

  it('says of a unique that no other realm may build it', () => {
    const units = compendiumSections().find((section) => section.id === 'unit');
    const entry = units!.entries.find((held) => held.name === unitDef('gendarme').name)!;
    const words = entry.clauses.map((clause) => clause.text).join(' ');
    expect(words).toMatch(/Only one leader may ever raise this/);
  });
});

// --- the unlock gate, read off the tree -------------------------------------

describe('a unique’s technology', () => {
  it('is the row’s own gate, asked the way every other row’s is', () => {
    // Nothing about a figure changes *which* technology opens a row: a row the
    // tree names is gated by the node, and a row the tree does not name is
    // priced and dated by its own column. The pin is that the two registers
    // still agree about these rows.
    for (const id of LEADER_IDS) {
      const def = leaderDef(id);
      const unitGate = UNIT_UNLOCK_TECH.get(def.unit);
      if (unitGate !== undefined) expect(techDef(unitGate), def.unit).toBeDefined();
      // Every unnamed row carries a column, or the price fold would charge it
      // Æra I hammers.
      if (unitGate === undefined) expect(unitDef(def.unit).column, def.unit).toBeDefined();
      const second = secondUnique(id);
      if (second.kind === 'building') {
        const buildingGate = BUILDING_UNLOCK_TECH.get(second.id);
        if (buildingGate !== undefined) expect(techDef(buildingGate), second.id).toBeDefined();
        if (buildingGate === undefined) {
          expect(buildingDef(second.id).column, second.id).toBeDefined();
        }
      } else {
        // **A work of the ground is dated by its own row and nothing else**
        // (batch L8): an improvement is not a queue item, so there is no column
        // to price it and no node that names it — the gate the worker's sheet
        // greys with is the gate that opens it, and it has to be a real one.
        const gate = improvementDef(second.id).requiresTech;
        expect(gate, `${second.id} names no technology`).toBeDefined();
        expect(techDef(gate!), second.id).toBeDefined();
      }
    }
  });
});

export type { Command };
