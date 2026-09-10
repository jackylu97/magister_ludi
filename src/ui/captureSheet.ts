/**
 * **A town has fallen. What becomes of it?** — the sheet raised the moment a
 * city changes hands to the seat sitting at this screen.
 *
 * The user's ruling of 2026-09-09 (`docs/flags.md`, (hhh) 4: *"On city capture,
 * the player should be given a selection modal to either annex, raze or puppet a
 * city, with their outcomes labelled"*). Until now a stormed town simply held as
 * a puppet — the rules' own default (`handOverCity` writes `City.puppet`) — and
 * said so in a toast that scrolled away, while `annexCity` and `razeCity` sat in
 * the city panel for a player who thought to go looking. Three verbs a conquest
 * offers, one of them irreversible and one of them destroying a town, and the
 * game was not asking the question.
 *
 * The three answers, and what each is
 * -----------------------------------
 *   **Annex**   the town joins the empire. `annexCity`, and the docblock on the
 *               command says it: anytime and irreversible, no window, no verb
 *               that turns it back. What it costs is not a price the reducer
 *               charges but two reliefs it stops giving, which is why the sheet
 *               prints the town's whole bill under each outcome — see below.
 *   **Puppet**  nothing is sent. A captured town *is* a puppet until it is
 *               annexed, so this choice is the sheet closing, which is also
 *               what Escape and the × do. There is no `puppetCity` command and
 *               there must never be one: the state is already this.
 *   **Raze**    `razeCity`. The town is pulled down and its ground released.
 *               Refused for a seat of government (`razeCityError`), and the row
 *               is greyed with that sentence rather than hidden — a verb that
 *               vanished would be one a player never learns exists.
 *
 * Every figure is the simulation's own
 * ------------------------------------
 * Nothing on this sheet is a number this file knows, and since 2026-09-09
 * (`docs/flags.md` item (ppp) 6) nothing on it is a *line* either. Each answer
 * prints **the whole of what this town would cost under that outcome**, folded:
 * `explainAuthority` and `explainHappiness` asked on a what-if realm where the
 * town's puppet flag is cleared (Annex) or set (Puppet), and every line naming
 * the town summed. Two folds a meter, one subtraction apart.
 *
 * That replaces the reading this sheet shipped with, which picked lines out of
 * the two lists and mixed baselines: both Annex and Puppet printed
 * `rules.war.puppetAuthorityRelief` — the *difference* between the outcomes —
 * with a minus in front of it, Puppet's happiness was the relief signed against
 * Annex's, and nothing on the sheet said what the town cost at all. A player
 * choosing between two outcomes is owed the price of each, not the gap.
 *
 * **The what-if is a ghost, never a write** — `cardImpact.ts`'s discipline
 * exactly: a shallow copy of the state with `cities` *replaced* (and the one
 * town copied into it), so no array on the real board is reachable through it.
 * A ghost is also its own key in the slate's `WeakMap` (`src/sim/slate.ts`), so
 * a fold taken on one is remembered against the ghost and thrown away with it —
 * the real board's remembered readings are neither read nor poisoned by this
 * sheet, and a fold taken before and after opening it is the same number.
 *
 * Split for the suite that has no jsdom
 * -------------------------------------
 * `confirmCard.ts`'s arrangement, and for its reason: everything about this
 * sheet that can be *quietly* wrong — which figures it reads, what each choice
 * says, whether raze is offered — is DOM-free and lives above
 * `createCaptureSheet` (`captureFigures`, `captureFace`). Drawing the result is
 * a dozen `append` calls that fail loudly or not at all.
 *
 * The ninth sheet on `modalShell.ts`
 * ----------------------------------
 * `hidden` is the whole of its state, ×/Escape/a press on the ground arrive at
 * one `close`, the keyboard goes back to the trigger, `dispose` unbinds and
 * registers itself in `gameDisposers`, and it wears `.statecraft-overlay` for
 * the one cap rule. The one thing it does not have is a bar control that opens
 * it — a conquest is not a menu — so its `trigger` is null and the keyboard
 * goes back to wherever it was, which for a board click is the board.
 *
 * **Never for a bot seat.** The sheet is raised from `controls.ts` on the local
 * seat's own accepted attack, so a bot storming a town changes nothing on this
 * screen; and closing it sends no command, so a player who ignores it has made
 * the same choice the rules would have made for them.
 */

import { type City, type GameState, cityById } from '../sim/state';
import { type MeterContribution, explainAuthority, explainHappiness } from '../sim/meters';
import { type ModalShell, createModalShell } from './modalShell';
import { cityDisplayName } from './cityDisplay';
import { element } from './dom';
import { meterFigure, signedMeterFigure } from './figures';
import { razeCityError } from '../sim/diplomacy';

/** The three answers a conquest offers. `puppet` sends nothing — see the docblock. */
export type CaptureChoice = 'annex' | 'puppet' | 'raze';

/** The three, in the order the sheet lays them out: keep, hold, destroy. */
export const CAPTURE_CHOICES: readonly CaptureChoice[] = ['annex', 'puppet', 'raze'];

/**
 * What this town would cost its captor under each outcome, in the meters' own
 * figures.
 *
 * **Whole costs, not the difference between them.** Each pair below is one fold
 * of one meter's whole list, on a realm where the town is held that way — so the
 * two answers are comparable by subtraction and each of them is a price a player
 * can go and check against the meter's own ledger. Negative is a cost; a town
 * whose own buildings pay more happiness than its citizens ask for reads
 * positive, and that is a true thing to print.
 */
export interface CaptureFigures {
  /** Every authority line naming this town, folded, on the realm that annexed it. */
  annexAuthority: number;
  /** Every happiness line naming this town, folded, on the realm that annexed it. */
  annexHappiness: number;
  /** The same fold on the realm that holds it as a puppet. */
  puppetAuthority: number;
  /** The same fold on the realm that holds it as a puppet. */
  puppetHappiness: number;
  /** How many stand in it — what razing kills, and what neither other answer costs. */
  population: number;
  /** How many hexes answer to it, and would answer to nobody if it came down. */
  hexes: number;
}

/** Does this meter line belong to this town? The label the meter itself wrote. */
function namesCity(line: MeterContribution, city: City): boolean {
  return line.source === city.name || line.source.startsWith(`${city.name} `);
}

/** One town's whole share of a meter, folded — rule 5's sum of a labelled list. */
function foldTown(list: readonly MeterContribution[], city: City): number {
  let sum = 0;
  for (const line of list) if (namesCity(line, city)) sum += line.value;
  return sum;
}

/**
 * **The realm as it would be, holding this town that way** — a ghost, and every
 * word of `cardImpact.ts`'s rule about ghosts applies here.
 *
 * Shallow: every field not named is shared with the real board, and `cities` is
 * *replaced* rather than written into, with one town copied out of it. Nothing
 * downstream can reach the real array through it, and the meters take no
 * argument that could let them.
 *
 * A ghost is also a fresh key for the slate's `WeakMap`, so whatever the two
 * folds remember is remembered against the ghost and dies with it. The board's
 * own readings are untouched — which is the whole reason this is a copy of the
 * state and not two writes and a restore.
 */
function heldAs(state: GameState, city: City, puppet: boolean): GameState {
  return {
    ...state,
    cities: state.cities.map((row) => {
      if (row.id !== city.id) return row;
      const copy: City = { ...row };
      // Cleared the way `annexCity` clears it, so the ghost is the state the
      // reducer would actually leave behind rather than a near-miss of it.
      if (puppet) copy.puppet = true;
      else delete copy.puppet;
      return copy;
    }),
  };
}

/**
 * The figures, read off the simulation.
 *
 * Pure and exported so the readings can be pinned by a test with no DOM: the
 * failure this sheet is most exposed to is a number composed here instead of
 * asked for, and that is visible in whether the value moves when the meter does.
 */
export function captureFigures(
  state: GameState,
  playerId: number,
  city: City,
): CaptureFigures {
  const annexed = heldAs(state, city, false);
  const held = heldAs(state, city, true);
  let hexes = 0;
  for (const owner of state.tileOwner) if (owner === city.id) hexes += 1;
  return {
    annexAuthority: foldTown(explainAuthority(annexed, playerId), city),
    annexHappiness: foldTown(explainHappiness(annexed, playerId), city),
    puppetAuthority: foldTown(explainAuthority(held, playerId), city),
    puppetHappiness: foldTown(explainHappiness(held, playerId), city),
    population: city.population,
    hexes,
  };
}

/** One labelled number beside a choice. Tabular mono where it is drawn. */
export interface CaptureFigureLine {
  label: string;
  value: string;
}

/** One of the three answers, as the sheet offers it. */
export interface CaptureOption {
  choice: CaptureChoice;
  /** The button's word. A **verb** — never "OK", `confirmFace`'s rule. */
  label: string;
  /** What this answer *is*, in a first-time player's terms. */
  body: string;
  /** What it moves, each figure labelled. */
  figures: CaptureFigureLine[];
  /** Why it cannot be taken, or `null`. The reducer's own sentence. */
  blocked: string | null;
}

/** Everything the sheet draws, composed once. */
export interface CaptureFace {
  cityId: number;
  /** "Uruk is taken" — the town's display name, star and all. */
  title: string;
  options: CaptureOption[];
}

/**
 * The three answers in words and figures.
 *
 * The prose is the war doc's (`docs/war-diplomacy.md` 9b) and the reducer's,
 * said plainly: a puppet's production is chosen for it and a puppet spends
 * nothing — three clauses in one voice (`purchaseError`, `tilePurchaseError`,
 * `contributeError`) plus its citizens' focus — and razing pays nothing at all,
 * which is worth saying out loud precisely because a player may expect it to.
 */
export function captureFace(state: GameState, playerId: number, city: City): CaptureFace {
  const figures = captureFigures(state, playerId, city);
  // The fold's own sign, printed as the meters print theirs: a cost reads with a
  // minus, a town that pays its own way reads with a plus, and nought reads
  // `0` — which is what razing costs on both meters and is worth saying rather
  // than leaving off the face.
  const authority = (value: number): CaptureFigureLine => ({
    label: 'Authority',
    value: `${signedMeterFigure(value)}⚜`,
  });
  const happiness = (value: number): CaptureFigureLine => ({
    label: 'Happiness',
    value: `${signedMeterFigure(value)}☺`,
  });
  return {
    cityId: city.id,
    title: `${cityDisplayName(state, city)} is taken`,
    options: [
      {
        choice: 'annex',
        label: 'Annex',
        body:
          'The town joins your empire and obeys you like any other: you choose what' +
          ' it builds, you may buy in it and buy its ground. There is no way back.',
        figures: [authority(figures.annexAuthority), happiness(figures.annexHappiness)],
        blocked: null,
      },
      {
        choice: 'puppet',
        label: 'Hold as a puppet',
        body:
          'The town keeps its own counsel. Its production is chosen for it, it will' +
          ' buy nothing — no unit, no building, no ground — and its citizens work' +
          ' where they please. Everything it makes is still yours, and you may annex' +
          ' it whenever you like.',
        figures: [authority(figures.puppetAuthority), happiness(figures.puppetHappiness)],
        blocked: null,
      },
      {
        choice: 'raze',
        label: 'Raze',
        body:
          'The town is pulled down and its ground answers to nobody. Nothing is paid' +
          ' for its stones.',
        figures: [
          // Nought on both meters, and printed rather than omitted: a town that
          // is gone asks nothing of either, and that is the *comparison* the
          // other two answers are being made against.
          authority(0),
          happiness(0),
          { label: 'Citizens', value: meterFigure(figures.population) },
          // What the ground does, said as the verb `razeCityAt` performs: every
          // hex that answered to this town answers to nobody, and is there to
          // be settled or taken by whoever reaches it first.
          { label: 'Territory released', value: `${meterFigure(figures.hexes)}⬡` },
        ],
        blocked: razeCityError(state, playerId, city.id),
      },
    ],
  };
}

export interface CaptureSheetOptions {
  overlay: HTMLElement;
  body: HTMLElement;
  closeButton: HTMLElement;
  /** The live game, asked at each open. Never held. */
  getState: () => GameState;
  /** Whose screen this is. The sheet is never raised for anybody else. */
  localPlayerId: () => number;
  /**
   * Sends the choice. `annex` and `raze` only — a puppet is the state the town
   * is already in, so the sheet closing *is* that answer and nothing is sent.
   */
  decide: (choice: Exclude<CaptureChoice, 'puppet'>, cityId: number) => void;
  /** Shuts whatever else the HUD has up, as every sheet's `onOpen` does. */
  onOpen?: () => void;
}

export interface CaptureSheet {
  readonly isOpen: boolean;
  /** Raises the sheet over a town just taken. A town that is no longer a puppet is ignored. */
  open(cityId: number): void;
  close(): void;
  dispose(): void;
}

export function createCaptureSheet(options: CaptureSheetOptions): CaptureSheet {
  const { overlay, body, closeButton } = options;
  /** Which town the sheet is about. `null` between visits — there is no second flag. */
  let subject: number | null = null;

  function city(): City | null {
    if (subject === null) return null;
    return cityById(options.getState(), subject) ?? null;
  }

  function draw(): void {
    body.replaceChildren();
    const town = city();
    if (!town) return;
    const face = captureFace(options.getState(), options.localPlayerId(), town);

    // The town is named here rather than in the sheet's own header, because the
    // header is markup and the subject changes with every conquest.
    body.append(element('h3', 'capture-town', face.title));
    body.append(
      element(
        'p',
        'capture-lead',
        'It holds as a puppet unless you say otherwise. Closing this leaves it one.',
      ),
    );

    const row = element('div', 'capture-choices');
    for (const option of face.options) {
      const card = element('div', 'capture-choice');
      card.append(element('h3', 'capture-choice-title', option.label));
      card.append(element('p', 'capture-choice-body', option.body));

      const figures = element('dl', 'capture-figures');
      for (const line of option.figures) {
        figures.append(element('dt', 'capture-figure-label', line.label));
        figures.append(element('dd', 'capture-figure-value', line.value));
      }
      card.append(figures);

      const press = document.createElement('button');
      press.type = 'button';
      press.className =
        option.choice === 'raze' ? 'btn btn-quiet capture-press' : 'btn btn-primary capture-press';
      press.textContent = option.label;
      if (option.blocked !== null) {
        press.disabled = true;
        press.title = option.blocked;
        card.append(element('p', 'wanting capture-blocked', option.blocked));
      } else {
        press.addEventListener('click', () => answer(option.choice));
      }
      card.append(press);
      row.append(card);
    }
    body.append(row);
  }

  const shell: ModalShell = createModalShell({
    overlay,
    body,
    closeButton,
    // No bar control opens a conquest, so there is nothing to hand the keyboard
    // back to and nothing to mirror `aria-expanded` on.
    trigger: null,
    draw,
    onOpen: options.onOpen,
    // The town is forgotten on the way out and not on the way in, so a repaint
    // provoked by whatever the choice did cannot draw a sheet about a town that
    // has just been pulled down.
    onClose: () => {
      subject = null;
    },
  });

  /**
   * One answer, once. The sheet comes **down first** — `confirmCard`'s rule and
   * for its reason: the command re-renders the board underneath, and a raze
   * settled behind a standing sheet would leave a sheet describing a town that
   * is gone.
   */
  function answer(choice: CaptureChoice): void {
    const id = subject;
    if (id === null) return;
    shell.close();
    if (choice === 'puppet') return;
    options.decide(choice, id);
  }

  return {
    get isOpen(): boolean {
      return shell.isOpen;
    },
    open(cityId: number): void {
      const town = cityById(options.getState(), cityId);
      // A town that is not this seat's puppet has no question to put: a ceded
      // town annexed the same turn, a save loaded over a live sheet, a second
      // report of one capture.
      if (!town || town.ownerId !== options.localPlayerId() || town.puppet !== true) return;
      subject = cityId;
      shell.open();
    },
    close(): void {
      shell.close();
    },
    dispose(): void {
      subject = null;
      shell.dispose();
    },
  };
}
