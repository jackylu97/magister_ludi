/** A state-derived reminder, deliberately independent of turn blockers. */
import type { GameState } from '../sim/state';
import { seatName } from '../sim/leaderData';
import { element } from './dom';
import './diplomacyOffers.css';

export interface PendingCourtOffer { key: string; by: number; kind: 'trade' | 'peace'; }
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

export function createDiplomacyOffers(options: {
  host: HTMLElement;
  getState(): GameState;
  getPlayerId(): number;
  review(by: number): void;
}) {
  const root = element('div', 'diplomacy-offers');
  const button = element('button', 'btn diplomacy-offers-button') as HTMLButtonElement;
  button.type = 'button';
  button.title = 'Review incoming proposals. You can end your turn without answering.';
  const icon = element('span', '', '✉'); icon.setAttribute('aria-hidden', 'true');
  const label = element('span');
  label.setAttribute('aria-live', 'polite'); label.setAttribute('aria-atomic', 'true');
  button.append(icon, label);
  const list = element('div', 'diplomacy-offers-list'); list.hidden = true;
  list.setAttribute('role', 'region'); list.setAttribute('aria-label', 'Incoming diplomatic offers');
  root.append(button, list); root.hidden = true; options.host.append(root);
  let signature = '';
  function close() { list.hidden = true; button.setAttribute('aria-expanded', 'false'); }
  function refresh() {
    const state = options.getState(), seat = options.getPlayerId();
    const offers = pendingCourtOffers(state, seat);
    const next = `${seat}:${offers.map(o => `${o.key}:${seatName(state, o.by)}`).join(',')}`;
    root.hidden = offers.length === 0;
    document.body.classList.toggle('has-diplomatic-offers', offers.length > 0);
    if (next === signature) return;
    signature = next; close();
    label.textContent = offers.length === 1 ? '1 offer waiting' : `${offers.length} offers waiting`;
    button.setAttribute('aria-label', `${label.textContent} — review diplomatic proposals`);
    list.replaceChildren(element('p', 'eyebrow', 'Incoming proposals'));
    for (const offer of offers) {
      const row = element('button', 'diplomacy-offers-row', `${seatName(state, offer.by)} · ${offer.kind === 'peace' ? 'Peace offer' : 'Trade offer'}`) as HTMLButtonElement;
      row.type = 'button'; row.onclick = () => { close(); options.review(offer.by); };
      list.append(row);
    }
    list.append(element('p', 'diplomacy-offers-note', 'These offers do not prevent ending your turn.'));
  }
  button.onclick = () => {
    refresh();
    const offers = pendingCourtOffers(options.getState(), options.getPlayerId());
    if (offers.length === 1) { close(); options.review(offers[0].by); }
    else if (offers.length > 1) {
      list.hidden = !list.hidden; button.setAttribute('aria-expanded', String(!list.hidden));
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
