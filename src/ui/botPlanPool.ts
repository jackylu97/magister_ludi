import type { SeatPlanner } from '../ai/driver';
import type { FrozenBoard, Warn } from '../ai/frozenBoard';
import { type BotPlanReply, type BotPlanRequest, readBotTuning } from './botPlanProtocol';

export type BotPlanPriority = 'background' | 'foreground';

interface PoolOptions {
  workerFactory?: () => Worker;
  hardwareConcurrency?: number;
  concurrency?: number;
  backgroundConcurrency?: number;
  timeoutMs?: number;
  includeDecisions?: boolean;
}

type SeatReply = Extract<BotPlanReply, { kind: 'planned' }>['seats'][number];

interface Pending {
  resolve(reply: BotPlanReply): void;
  reject(error: Error): void;
  timer: ReturnType<typeof setTimeout>;
}

interface Slot {
  worker: Worker;
  pending?: Pending;
}

function startWorker(): Worker {
  return new Worker(new URL('./botPlan.worker.ts', import.meta.url), { type: 'module' });
}

/** The coordinator waits for a complete set of plans before it dispatches any command. */
export function createBotPlanPool(options: PoolOptions = {}) {
  const cores = options.hardwareConcurrency ?? globalThis.navigator?.hardwareConcurrency ?? 2;
  const capacity = Math.min(6, Math.floor(options.concurrency ?? (cores - 2)));
  // While the player can act, use the coordinator alone on smaller machines.
  // A machine with more cores can plan two seats at once.
  const backgroundCapacity = Math.min(capacity, Math.floor(options.backgroundConcurrency ?? (cores >= 8 ? 2 : 1)));
  const timeoutMs = options.timeoutMs ?? 60_000;
  const canStart = options.workerFactory !== undefined || typeof Worker !== 'undefined';
  const slots: Slot[] = [];
  let nextId = 1;
  let working = false;
  let disabled = false;

  function closeWorkers(error: Error): void {
    for (const { worker, pending } of slots.splice(0)) {
      worker.onmessage = worker.onerror = worker.onmessageerror = null;
      worker.terminate();
      if (pending === undefined) continue;
      clearTimeout(pending.timer);
      pending.reject(error);
    }
  }

  function grow(count: number): void {
    while (slots.length < count) {
      let worker: Worker;
      try {
        worker = (options.workerFactory ?? startWorker)();
      } catch (error) {
        // A browser that cannot construct nested workers should keep playing in one worker.
        disabled = true;
        throw error;
      }
      const slot: Slot = { worker };
      worker.onmessage = ({ data }: MessageEvent<BotPlanReply>): void => {
        const pending = slot.pending;
        if (pending === undefined) return;
        slot.pending = undefined;
        clearTimeout(pending.timer);
        pending.resolve(data);
      };
      worker.onerror = (event): void => {
        event.preventDefault?.();
        closeWorkers(new Error('A seat plan worker stopped'));
      };
      worker.onmessageerror = (): void => closeWorkers(new Error('A seat plan worker sent an unreadable reply'));
      slots.push(slot);
    }
  }

  async function send(slot: Slot, request: BotPlanRequest): Promise<SeatReply[]> {
    const reply = await new Promise<BotPlanReply>((resolve, reject) => {
      const timer = setTimeout(() => closeWorkers(new Error('A seat plan worker timed out')), timeoutMs);
      slot.pending = { resolve, reject, timer };
      slot.worker.postMessage(request);
    });
    if (reply?.id !== request.id) throw new Error('A seat plan reply belongs to a different request');
    if (reply.kind === 'failed') throw new Error(reply.message);
    if (reply.kind !== 'planned' || !Array.isArray(reply.seats)) throw new Error('A seat plan worker sent an invalid reply');
    const planned = new Set(reply.seats.map(({ plan }) => plan.playerId));
    if (reply.seats.length !== request.seats.length || !request.seats.every((id) => planned.has(id))) {
      throw new Error('A seat plan worker did not plan the requested seats');
    }
    for (const { plan, warnings } of reply.seats) {
      if (plan.firstNewId !== request.board.firstNewId || !Array.isArray(plan.steps) || !Array.isArray(warnings)) {
        throw new Error('A seat plan worker sent an invalid plan');
      }
    }
    return reply.seats;
  }

  function capacityFor(priority: BotPlanPriority): number {
    return priority === 'background' ? backgroundCapacity : capacity;
  }

  function supports(priority: BotPlanPriority): boolean {
    return canStart && !disabled && capacityFor(priority) >= 2;
  }

  async function planBatch(board: FrozenBoard, seats: readonly number[], warn: Warn, priority: BotPlanPriority) {
    if (seats.length === 0) return [];
    const count = Math.min(seats.length, capacityFor(priority));
    if (!supports(priority) || count < 2) throw new Error('Parallel seat planning is unavailable');
    if (working) throw new Error('Another group of seat plans is pending');
    working = true;
    try {
      grow(count);
      const tuning = readBotTuning(board.state);
      const groups = Array.from({ length: count }, (_, index) => seats.filter((_seat, offset) => offset % count === index));
      const replies = await Promise.all(groups.map((group, index) => send(slots[index]!, {
        id: nextId++, board, seats: group, tuning, includeDecisions: options.includeDecisions ?? false,
      })));
      const bySeat = new Map(replies.flat().map((entry) => [entry.plan.playerId, entry]));
      const ordered = seats.map((id) => bySeat.get(id)!);
      for (const { warnings } of ordered) {
        for (const { message, detail } of warnings) warn(message, detail);
      }
      return ordered.map(({ plan }) => plan);
    } catch (error) {
      closeWorkers(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      working = false;
    }
  }

  return {
    get available(): boolean { return supports('foreground'); },
    supports,
    plan(warn: Warn = (message, detail) => console.warn(message, detail), priority: BotPlanPriority = 'foreground'): SeatPlanner {
      return (board, seats) => planBatch(board, seats, warn, priority);
    },
    dispose(): void {
      disabled = true;
      closeWorkers(new Error('Seat plan pool disposed'));
    },
  };
}
