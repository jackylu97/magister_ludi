import { type BotPlanReply, type BotPlanRequest, answerBotPlan } from './botPlanProtocol';

interface PlanWorkerScope {
  onmessage: ((event: MessageEvent<BotPlanRequest>) => void) | null;
  postMessage(reply: BotPlanReply): void;
}

if (typeof self !== 'undefined' && typeof document === 'undefined' && typeof self.postMessage === 'function') {
  const scope = self as unknown as PlanWorkerScope;
  scope.onmessage = ({ data }): void => scope.postMessage(answerBotPlan(data));
}
