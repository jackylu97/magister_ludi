/**
 * The Faith sheet: rites, the bonuses your religion pays, and the religion
 * itself, on three tabs (`docs/plans/faith-screen-f1.md`; batches UX9 to UX11
 * in `docs/plans/hud-ux-decisions.md`, "Build plan").
 *
 * The sheet is called Faith since the ruling of 2026-10-15 (`docs/flags.md`
 * (ssssss) 4.7), because it holds rites and bonuses as well as the religion.
 * Its three tabs, each drawn by its own module:
 *
 *   - **Rites** (`ritesTab.ts`): every town of yours as a row, the rites you
 *     know as a strip of chips, and rite mode, which ranks the free towns by
 *     what a rite would add and starts it in one click.
 *   - **Bonuses** (`bonusesTab.ts`): everything your religion pays, as cards on
 *     shelves under a headline that adds up to the top bar's faith. Dealt every
 *     time the tab opens; a figure counts up only if it changed since the
 *     player last looked (ruling 4.1).
 *   - **Religion & followers** (`followersTab.ts`): the religion's name and
 *     facts, the pantheon wheel, who follows, the rival faiths pressing your
 *     towns, and the clergy.
 *
 * This module is the frame: the tabs and the bank over them, the conversation
 * each tab keeps (the Rites tab's selected rite and menu, the Bonuses tab's
 * memory of what was last seen, the town the clergy is called in), and the
 * commands the page sends for it. The tab a seat last chose is remembered for
 * that seat (`faithTabFor`), as the city screen remembers its add-list tab: a
 * fact about the person at the keyboard, kept for the page's lifetime and
 * never saved.
 *
 * **No retired piece is named on this sheet**, in a sentence or in a comment.
 * `test/ui/religionScreen.test.ts` checks this file, the tab modules, their
 * shared words (`faithReading.ts`, `riteWords.ts`) and the sheet's own block in
 * `index.html`, which holds its title and hint line. A screen that explained a
 * mechanism the reducer refuses would teach a player a rule that is not true.
 *
 * The frame is `modalShell.ts`, like every parchment sheet: `hidden` is the
 * whole of the screen state, and the ×, Escape and a press on the ground arrive
 * at one `close`. Escape on the Rites tab first leaves rite mode, then closes an
 * open town menu, and only then closes the sheet (`escapeRites`, through the
 * shell's `onKey`).
 *
 * Nothing on this screen is state. Every figure is a reading of the game, and
 * every change is a command the page sends: a purchase, a rename, a rite in a
 * town (`performRite`, through `controls.performRite`), or a prophet's rite over
 * the realm (`empireRite`).
 */

import { createModalShell } from './modalShell';
import { type CardImpactSheet, cardImpactSheet } from '../sim/cardImpact';
import { cityRite, empireRiteError, riteError } from '../sim/religion';
import type { PurchasableItem } from '../sim/purchase';
import type { RiteId } from '../sim/religionData';
import { type GameState, playerById } from '../sim/state';
import { element } from './dom';
import { bankLineElement, readBank } from './bankFigure';
import { wantsMotion } from './motion';
import { createInfoCard, type InfoCard } from './infoCard';
import {
  type RitesView,
  createRiteReadingCache,
  drawRitesTab,
  escapeRites,
  freshRitesView,
  noteRealmRite,
  noteRiteStarted,
  ritesCount,
  ritesTabModel,
  ritesViewForTown,
  selectRite,
  toggleTownMenu,
} from './ritesTab';
import { bonusFigures, bonusesTabModel, drawBonusesTab, figureChanged } from './bonusesTab';
import { drawFollowersTab, followersTabModel } from './followersTab';
import { religionReading } from './faithReading';

/**
 * The words and readings other modules have always imported from this sheet,
 * now kept in `faithReading.ts` and `riteWords.ts` so the tab modules can share
 * them, and handed on from here by name.
 */
export {
  type FollowingCityLine,
  type ReligionHouse,
  type ReligionReading,
  AXIS_MARK,
  POOL_WORD,
  SLOT_GLYPH,
  beliefCardType,
  beliefOfferEyebrow,
  poolTechName,
  pressureLedgerText,
  priceLedgerText,
  religionReading,
} from './faithReading';
export { riteGrantWords, riteTeacherName } from './riteWords';

// --- the three tabs -------------------------------------------------------------

/** The Faith sheet's three tabs. */
export type FaithTab = 'rites' | 'bonuses' | 'religion';

/** The tabs in the order they are drawn, with their labels. */
export const FAITH_TABS: readonly { tab: FaithTab; label: string }[] = [
  { tab: 'rites', label: 'Rites' },
  { tab: 'bonuses', label: 'Bonuses' },
  { tab: 'religion', label: 'Religion & followers' },
];

/**
 * The tab each seat last chose. Module state rather than game state, for the
 * reason the city screen's add-list tab is (`addTab` in `cityPanel.ts`): which
 * tab a player last looked at is a fact about the person at the keyboard, it is
 * not in the save, and it resets when the page does. Kept per seat because a
 * hot-seat game passes the keyboard round. Read and written by seat id only;
 * nothing walks it.
 */
const tabBySeat = new Map<number, FaithTab>();

/** The tab this seat sees when the sheet opens: the one it last chose, or Rites. */
export function faithTabFor(seat: number): FaithTab {
  return tabBySeat.get(seat) ?? 'rites';
}

/** Remembers a seat's choice of tab. */
export function chooseFaithTab(seat: number, tab: FaithTab): void {
  tabBySeat.set(seat, tab);
}

export interface ReligionScreen {
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  toggle(): void;
  /**
   * Opens the sheet on the Rites tab with this town's "Start a rite" menu open:
   * the city screen's way in, from its Faith card. A town keeping a rite has no
   * menu, so its row is marked and brought into view instead.
   */
  openRitesFor(cityId: number): void;
  /** The state changed. Redraws if the screen is up; cheap enough to call always. */
  refresh(): void;
  dispose(): void;
}

export interface ReligionScreenOptions {
  overlay: HTMLElement;
  body: HTMLElement;
  closeButton: HTMLElement;
  trigger?: HTMLElement;
  getState: () => GameState;
  getPlayerId: () => number;
  /** Sends the purchase. The screen never mutates state itself. */
  buy: (cityId: number, item: PurchasableItem, currency: 'faith' | 'gold') => void;
  /**
   * Starts a rite in a town: one `performRite` command, which the page sends
   * through `controls.performRite`. Optional, so a page without it still draws
   * the Rites tab, with its Start buttons unpressable.
   */
  performRite?: (cityId: number, rite: RiteId) => void;
  /**
   * Has a prophet say a rite over the whole realm: one `empireRite` command.
   * Optional for `performRite`'s reason.
   */
  sayRiteOverRealm?: (unitId: number, rite: RiteId) => void;
  /**
   * Opens a town's city screen. A town's name on the Rites tab is a link to it,
   * and following it closes the sheet. Without it the names are plain words.
   */
  openCity?: (cityId: number) => void;
  /**
   * Sends `renameReligion`. Optional, so a page with no religion verb wired
   * simply shows the name as a heading rather than as a field.
   */
  rename?: (name: string) => void;
  /** Said in the manicule line — a refusal, in the reducer's own words. */
  onRefuse?: (message: string) => void;
  onOpen?: () => void;
}

export function createReligionScreen(options: ReligionScreenOptions): ReligionScreen {
  const { overlay, body, closeButton, trigger } = options;

  /**
   * The half of the Rites tab's previews that is a reading of the **real**
   * board, taken once a draw and shared by every preview (`cardImpactSheet`,
   * batch H18), the Statecraft sheet's own bargain.
   *
   * Its lifetime is **one draw**: the reducer mutates `GameState` in place, so a
   * sheet kept past the next command would answer with a board the game has
   * moved on from. Set and let go in `draw`, stored nowhere.
   */
  let sheet: CardImpactSheet | null = null;

  // --- the Rites tab ------------------------------------------------------------

  /** The Rites tab's conversation (`RitesView`), and the seat it belongs to. */
  let ritesView: RitesView = freshRitesView(0);
  let ritesSeat: number | null = null;
  /** The town `openRitesFor` asked about, used by the opening it causes. */
  let pendingTown: number | null = null;
  /** True for the paint after `openRitesFor`, so that town's row is scrolled into view once. */
  let scrollToFocus = false;
  /** The previews and chip voices, kept while the board is unchanged. */
  const riteReadings = createRiteReadingCache();

  /** The conversation for this seat; a seat that changed under the sheet starts afresh. */
  function viewFor(state: GameState, seat: number): RitesView {
    if (ritesSeat !== seat) {
      ritesView = freshRitesView(state.turn);
      ritesSeat = seat;
    }
    return ritesView;
  }

  /**
   * A Start button: one `performRite` command, sent by the page. The gate is
   * asked again at the click, because the button was drawn against the board as
   * it stood; a refusal now is said in the reducer's own words instead of being
   * sent. Whether the command was taken is read off the board afterwards (the
   * town keeps the rite), and only then is the start recorded for the faith line
   * and the "started now" mark.
   */
  function startRite(cityId: number, rite: RiteId): void {
    const send = options.performRite;
    if (send === undefined) return;
    const state = options.getState();
    const seat = options.getPlayerId();
    const refusal = riteError(state, seat, cityId, rite);
    if (refusal !== null) {
      options.onRefuse?.(refusal);
      draw();
      return;
    }
    const before = playerById(state, seat)?.faithPool ?? 0;
    send(cityId, rite);
    const after = options.getState();
    const city = after.cities.find((one) => one.id === cityId);
    if (city !== undefined && cityRite(after, city) === rite) {
      ritesView = noteRiteStarted(
        viewFor(after, seat),
        after.turn,
        { cityId, rite },
        before,
        playerById(after, seat)?.faithPool ?? 0,
      );
    }
    draw();
  }

  /**
   * The realm's button: one `empireRite` command with the prophet the model
   * picked, asked of `empireRiteError` again at the click. Taken when the bank
   * paid for it; every town now keeping the rite is recorded as started.
   */
  function sayOverRealm(unitId: number, rite: RiteId): void {
    const send = options.sayRiteOverRealm;
    if (send === undefined) return;
    const state = options.getState();
    const seat = options.getPlayerId();
    const refusal = empireRiteError(state, seat, unitId, rite);
    if (refusal !== null) {
      options.onRefuse?.(refusal);
      draw();
      return;
    }
    const before = playerById(state, seat)?.faithPool ?? 0;
    send(unitId, rite);
    const after = options.getState();
    const bank = playerById(after, seat)?.faithPool ?? 0;
    if (bank < before) {
      const towns = after.cities
        .filter((city) => city.ownerId === seat && cityRite(after, city) === rite)
        .map((city) => city.id);
      ritesView = noteRealmRite(viewFor(after, seat), after.turn, rite, towns, before, bank);
    }
    draw();
  }

  /** The Rites tab: its model, read with this paint's shared sheet, and drawn. */
  function drawRites(state: GameState, seat: number): HTMLElement {
    const view = viewFor(state, seat);
    const model = ritesTabModel(state, seat, view, riteReadings.readings(state, seat, sheet ?? undefined));
    const openCity = options.openCity;
    return drawRitesTab(model, {
      selectRite: (rite) => {
        ritesView = selectRite(ritesView, rite);
        draw();
      },
      toggleMenu: (cityId) => {
        ritesView = toggleTownMenu(ritesView, cityId);
        draw();
      },
      start: options.performRite === undefined ? undefined : startRite,
      sayOverRealm: options.sayRiteOverRealm === undefined ? undefined : sayOverRealm,
      // A town's name opens its city screen and closes the sheet, which would
      // otherwise stand in front of it.
      openCity:
        openCity === undefined
          ? undefined
          : (cityId) => {
              shell.close();
              openCity(cityId);
            },
    });
  }

  // --- the Bonuses tab -----------------------------------------------------------

  /**
   * What each seat last saw on the Bonuses tab, figure by figure (`bonusFigures`):
   * the memory ruling 4.1 asks for, so a figure counts up only when it changed
   * since the player last looked. Kept for the sheet's life, and never saved.
   */
  const seenBySeat = new Map<number, Map<string, string>>();
  /**
   * True when the next paint of the Bonuses tab is an opening: the sheet has just
   * opened on it, or the player has just switched to it. Only an opening deals
   * and counts; a plain repaint moves nothing.
   */
  let bonusesOpening = false;
  /** The opening's timers and counts, stopped by the next paint and by closing. */
  let timers: number[] = [];
  let cancels: (() => void)[] = [];
  /** The hover card the Bonuses cards raise, made the first time one is needed. */
  let info: InfoCard | null = null;

  /** Stops everything an opening scheduled, and puts the hover card away. */
  function stopMotion(): void {
    for (const id of timers) window.clearTimeout(id);
    for (const cancel of cancels) cancel();
    timers = [];
    cancels = [];
    info?.hide();
  }

  /** The Bonuses tab: its model, the figures that changed, and the opening if this is one. */
  function drawBonuses(state: GameState, seat: number): HTMLElement {
    const model = bonusesTabModel(state, seat);
    const now = bonusFigures(model);
    const seen = seenBySeat.get(seat);
    const opening = bonusesOpening && wantsMotion();
    bonusesOpening = false;
    const tab = drawBonusesTab(
      model,
      {
        opening,
        counts: (key) => figureChanged(seen, key, now.get(key) ?? ''),
        later: (ms, run) => {
          timers.push(window.setTimeout(run, ms));
        },
        keep: (cancel) => {
          cancels.push(cancel);
        },
      },
      {
        hover: (anchor, build) => {
          info ??= createInfoCard({ className: 'info-card' });
          info.bind(anchor, build);
        },
      },
    );
    seenBySeat.set(seat, now);
    return tab;
  }

  // --- the Religion & followers tab -------------------------------------------------

  /** Which town the clergy is called in. A conversation, not the game. */
  let aimedCityId: number | null = null;

  /** The Religion & followers tab: its model and its drawing, with the page's verbs. */
  function drawReligion(state: GameState, seat: number): HTMLElement {
    const model = followersTabModel(state, seat, religionReading(state, seat), aimedCityId);
    aimedCityId = model.clergy.cityId;
    const rename = options.rename;
    return drawFollowersTab(state, seat, model, {
      rename:
        rename === undefined
          ? undefined
          : (name) => {
              rename(name);
              draw();
            },
      refuse: (message) => options.onRefuse?.(message),
      buy: (cityId, item, currency) => {
        options.buy(cityId, item, currency);
        draw();
      },
      aim: (cityId) => {
        aimedCityId = cityId;
        draw();
      },
      toBonuses: () => {
        chooseFaithTab(seat, 'bonuses');
        bonusesOpening = true;
        draw();
      },
    });
  }

  // --- the frame: tabs, the bank, and one paint ------------------------------------

  /** The row over every tab: the three tabs, and the faith bank in the bank display's style. */
  function drawHead(state: GameState, seat: number, tab: FaithTab): HTMLElement {
    const head = element('div', 'faith-head');
    const tabs = element('div', 'faith-tabs');
    tabs.setAttribute('role', 'group');
    tabs.setAttribute('aria-label', 'Faith sheet tabs');
    for (const { tab: which, label } of FAITH_TABS) {
      const on = which === tab;
      const button = element('button', on ? 'faith-tab is-on' : 'faith-tab');
      button.type = 'button';
      button.dataset.key = `tab:${which}`;
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
      button.append(element('span', 'faith-tab-label', label));
      if (which === 'rites') button.append(element('span', 'faith-tab-count', ritesCount(state, seat)));
      button.addEventListener('click', () => {
        if (which === 'bonuses' && faithTabFor(seat) !== 'bonuses') bonusesOpening = true;
        chooseFaithTab(seat, which);
        draw();
      });
      tabs.append(button);
    }
    head.append(tabs);
    head.append(bankLineElement([readBank(state, seat, 'faith')]));
    return head;
  }

  /** Where things stood before a repaint, so the repaint can keep them. */
  interface Layout {
    tab: string | null;
    scroll: number;
    /** Each town row's top, by town id. */
    rows: Map<string, number>;
    /** The `data-key` of the control that had the keyboard. */
    focus: string | null;
  }

  /** Set when the sheet opens: the first paint of a visit keeps nothing from the last one. */
  let fresh = true;

  function measure(): Layout {
    const panel = body.querySelector<HTMLElement>('.faith-panel');
    const rows = new Map<string, number>();
    for (const row of body.querySelectorAll<HTMLElement>('.faith-town[data-city]')) {
      rows.set(row.dataset.city!, row.getBoundingClientRect().top);
    }
    const active = document.activeElement;
    const focus =
      active instanceof HTMLElement && body.contains(active)
        ? (active.closest<HTMLElement>('[data-key]')?.dataset.key ?? null)
        : null;
    return { tab: panel?.dataset.tab ?? null, scroll: panel?.scrollTop ?? 0, rows, focus };
  }

  /**
   * The rows slide from where they were to where they are (the user's
   * mockup: "slide into place"), as a transform that ends where the layout
   * already is, so nothing waits on it. Skipped under reduced motion.
   */
  function slide(before: Map<string, number>): void {
    for (const row of body.querySelectorAll<HTMLElement>('.faith-town[data-city]')) {
      const was = before.get(row.dataset.city!);
      if (was === undefined) continue;
      const moved = was - row.getBoundingClientRect().top;
      if (Math.abs(moved) < 1) continue;
      row.animate?.([{ transform: `translateY(${moved}px)` }, { transform: 'translateY(0)' }], {
        duration: 360,
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      });
    }
  }

  /**
   * Gives the keyboard back to the control that had it. A Start button whose
   * town has just moved to the kept group is gone, so the keyboard goes to the
   * selected rite's chip, or, from a menu, to that town's name.
   */
  function giveBackFocus(key: string | null): void {
    if (key === null) return;
    let target = body.querySelector<HTMLElement>(`[data-key="${key}"]`);
    if (target === null && ritesView.selected !== null) {
      target = body.querySelector<HTMLElement>(`[data-key="chip:${ritesView.selected}"]`);
    }
    if (target === null) {
      const city = /^(?:start|menu|menu-start):(\d+)/.exec(key)?.[1];
      if (city !== undefined) target = body.querySelector<HTMLElement>(`[data-key="name:${city}"]`);
    }
    target?.focus({ preventScroll: true });
  }

  /** After a paint: the scroll, the slide and the keyboard, kept from before it. */
  function settle(panel: HTMLElement, tab: FaithTab, before: Layout | null): void {
    if (before !== null) {
      if (before.tab === tab) {
        panel.scrollTop = before.scroll;
        if (wantsMotion()) slide(before.rows);
      }
      giveBackFocus(before.focus);
    }
    if (scrollToFocus && tab === 'rites') {
      scrollToFocus = false;
      body.querySelector<HTMLElement>('.faith-town.is-focus')?.scrollIntoView({ block: 'nearest' });
    }
  }

  function draw(): void {
    sheet = cardImpactSheet(options.getState(), options.getPlayerId());
    try {
      paint();
    } finally {
      sheet = null;
    }
  }

  function paint(): void {
    const state = options.getState();
    const seat = options.getPlayerId();
    const before = fresh ? null : measure();
    fresh = false;
    stopMotion();
    body.replaceChildren();
    if (!playerById(state, seat)) return;
    const tab = faithTabFor(seat);
    body.append(drawHead(state, seat, tab));
    const panel = element('div', `faith-panel is-${tab}`);
    panel.dataset.tab = tab;
    if (tab === 'rites') panel.append(drawRites(state, seat));
    else if (tab === 'bonuses') panel.append(drawBonuses(state, seat));
    else panel.append(drawReligion(state, seat));
    body.append(panel);
    settle(panel, tab, before);
  }

  /**
   * The frame (`modalShell.ts`). Opening forgets the last visit's rite mode,
   * menu and starts, and makes the Bonuses tab's next paint an opening
   * (`onShow`); closing stops anything still moving (`onClose`); Escape on the
   * Rites tab leaves rite mode, then an open menu, before the shell closes the
   * sheet (`onKey`).
   */
  const shell = createModalShell({
    overlay,
    body,
    closeButton,
    trigger,
    onOpen: () => options.onOpen?.(),
    onShow: () => {
      const state = options.getState();
      ritesView = freshRitesView(state.turn);
      ritesSeat = options.getPlayerId();
      if (pendingTown !== null) {
        ritesView = ritesViewForTown(ritesView, pendingTown);
        pendingTown = null;
        scrollToFocus = true;
      }
      bonusesOpening = true;
      fresh = true;
    },
    onClose: () => stopMotion(),
    onKey: (event) => {
      if (event.key !== 'Escape') return false;
      if (faithTabFor(options.getPlayerId()) !== 'rites') return false;
      const next = escapeRites(ritesView);
      if (next === null) return false;
      event.preventDefault();
      event.stopPropagation();
      ritesView = next;
      draw();
      return true;
    },
    onDispose: () => stopMotion(),
    draw,
  });

  return {
    get isOpen(): boolean {
      return shell.isOpen;
    },
    open: shell.open,
    close: shell.close,
    toggle: shell.toggle,
    openRitesFor(cityId: number): void {
      const seat = options.getPlayerId();
      chooseFaithTab(seat, 'rites');
      if (shell.isOpen) {
        ritesView = ritesViewForTown(viewFor(options.getState(), seat), cityId);
        scrollToFocus = true;
        shell.refresh();
        return;
      }
      pendingTown = cityId;
      shell.open();
    },
    refresh: shell.refresh,
    dispose: shell.dispose,
  };
}
