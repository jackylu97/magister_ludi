/**
 * The deal notice beside the turn button: a state-derived reminder that offers
 * from other empires wait for an answer, deliberately independent of turn
 * blockers. It never stops a turn from ending.
 *
 * Batch SS6 drew it in the diplomacy sheet's look (layout B's notice on
 * `docs/plans/mockups/scholars-study/diplomacy-options.html`): at rest, the
 * envelope, the count and "offers waiting"; open, a ruled list with one row a
 * court (its shield, its leader and one line of terms) and a plain foot. A
 * press on a row opens the sheet on that court with the offer loaded on the
 * paper. With one offer, a press on the notice opens it at once.
 */
import type { GameState } from '../sim/state';
import { seatName } from '../sim/leaderData';
import { peaceTermsOn } from '../sim/wars';
import { element } from './dom';
import { courtMarkNode, courtSeal, sideOfPeace, termLines } from './diplomacyScreen';
import './diplomacyOffers.css';

interface PendingCourtOffer { key: string; by: number; kind: 'trade' | 'peace'; }
export function pendingCourtOffers(state: GameState, seat: number): PendingCourtOffer[] {
  const offers: PendingCourtOffer[] = state.dealProposals
    .filter(p => p.to === seat && p.by !== seat)
    .map(p => ({ key: `deal-${p.id}`, by: p.by, kind: 'trade' }));
  for (const war of state.wars) {
    const by = war.a === seat ? war.b : war.b === seat ? war.a : null;
    if (by !== null && war.offers?.includes(by) && !war.offers.includes(seat)) {
      offers.push({ key: `peace-${by}`, by, kind: 'peace' });
    }
  }
  return offers;
}

/** Which paper the sheet opens for an offer: the bargain's id, or their peace. */
export function offerPaper(offer: PendingCourtOffer): number | 'peace' {
  return offer.kind === 'peace' ? 'peace' : Number(offer.key.slice('deal-'.length));
}

/**
 * One offer as the notice's line of terms, in `termLines`' words: "offers
 * Lapis Lazuli for 6 gold a turn", "offers peace: gives Kufa, 80 gold".
 */
export function offerNoticeLine(state: GameState, seat: number, offer: PendingCourtOffer): string {
  const real = (lines: string[]): string[] => lines.filter((line) => line !== 'Nothing');
  if (offer.kind === 'peace') {
    const terms = peaceTermsOn(state, seat, offer.by);
    if (terms === null) return 'offers peace';
    const gives = real(termLines(state, sideOfPeace(terms, offer.by, seat)));
    const asks = real(termLines(state, sideOfPeace(terms, seat, offer.by)));
    const parts: string[] = [];
    if (gives.length > 0) parts.push(`gives ${gives.join(', ')}`);
    if (asks.length > 0) parts.push(`asks ${asks.join(', ')}`);
    return parts.length > 0 ? `offers peace: ${parts.join('; ')}` : 'offers peace';
  }
  const paper = state.dealProposals.find((row) => row.id === offerPaper(offer));
  if (!paper) return 'offers a bargain';
  const gives = real(termLines(state, paper.give));
  const asks = real(termLines(state, paper.take));
  const what = gives.length > 0 ? `offers ${gives.join(', ')}` : 'asks';
  return asks.length > 0 ? `${what}${gives.length > 0 ? ' for' : ''} ${asks.join(', ')}` : what;
}

export function createDiplomacyOffers(options: {
  host: HTMLElement;
  getState(): GameState;
  getPlayerId(): number;
  /** Opens the sheet on that court, with this offer on the paper. */
  review(by: number, offer: number | 'peace'): void;
}) {
  const root = element('div', 'diplomacy-offers');
  const button = element('button', 'diplomacy-offers-button') as HTMLButtonElement;
  button.type = 'button';
  button.title = 'Review incoming proposals. You can end your turn without answering.';
  const count = element('b', 'diplomacy-offers-count');
  const label = element('span');
  label.setAttribute('aria-live', 'polite'); label.setAttribute('aria-atomic', 'true');
  button.append(courtMarkNode('envelope', 'diplomacy-offers-mark'), count, label);
  const list = element('div', 'diplomacy-offers-list'); list.hidden = true;
  list.setAttribute('role', 'region'); list.setAttribute('aria-label', 'Incoming diplomatic offers');
  root.append(button, list); root.hidden = true; options.host.append(root);
  let signature = '';
  function close() { list.hidden = true; button.setAttribute('aria-expanded', 'false'); button.classList.remove('is-open'); }
  function refresh() {
    const state = options.getState(), seat = options.getPlayerId();
    const offers = pendingCourtOffers(state, seat);
    const next = `${seat}:${offers.map(o => `${o.key}:${seatName(state, o.by)}:${offerNoticeLine(state, seat, o)}`).join(',')}`;
    root.hidden = offers.length === 0;
    document.body.classList.toggle('has-diplomatic-offers', offers.length > 0);
    if (next === signature) return;
    signature = next; close();
    count.textContent = String(offers.length);
    label.textContent = offers.length === 1 ? 'offer waiting' : 'offers waiting';
    button.setAttribute('aria-label', `${offers.length} ${label.textContent}. Review diplomatic proposals`);
    list.replaceChildren(element('h3', 'diplomacy-offers-head', 'Offers waiting'));
    for (const offer of offers) {
      const row = element('button', 'diplomacy-offers-row') as HTMLButtonElement;
      row.type = 'button';
      const words = element('span', 'diplomacy-offers-words');
      words.append(element('b', '', seatName(state, offer.by)), element('span', '', offerNoticeLine(state, seat, offer)));
      row.append(courtSeal(state, offer.by, 'small'), words, courtMarkNode('arrow', 'diplomacy-offers-arrow'));
      row.onclick = () => { close(); options.review(offer.by, offerPaper(offer)); };
      list.append(row);
    }
    list.append(element('p', 'diplomacy-offers-note', 'You can end the turn without an answer.'));
  }
  button.onclick = () => {
    refresh();
    const offers = pendingCourtOffers(options.getState(), options.getPlayerId());
    if (offers.length === 1) { close(); options.review(offers[0].by, offerPaper(offers[0])); }
    else if (offers.length > 1) {
      list.hidden = !list.hidden; button.setAttribute('aria-expanded', String(!list.hidden));
      button.classList.toggle('is-open', !list.hidden);
      if (!list.hidden) list.querySelector('button')?.focus();
    }
  };
  const outside = (event: PointerEvent) => { if (!root.contains(event.target as Node)) close(); };
  const key = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && !list.hidden) { close(); event.preventDefault(); button.focus(); }
  };
  document.addEventListener('pointerdown', outside);
  root.addEventListener('keydown', key);
  refresh();
  return {
    refresh, close,
    dispose() { document.removeEventListener('pointerdown', outside); root.removeEventListener('keydown', key); root.remove(); document.body.classList.remove('has-diplomatic-offers'); },
  };
}
