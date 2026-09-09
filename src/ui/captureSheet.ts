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
 *               charges but two reliefs it stops giving — see below.
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
 * Nothing on this sheet is a number this file knows. The writ each choice moves
 * is read off `explainAuthority`'s own line for this town, the contentment off
 * `explainHappiness`'s — the same two lists the meters' ledgers print, matched
 * by the source label the meter itself wrote. What **annexing** costs is the one
 * figure that cannot be read as a line, because the line for an annexed town
 * does not exist while the town is a puppet: it is `rules.war`'s own relief, the
 * field `cityCosts` subtracts. Asking `meters.ts` for the annexed price directly
 * would be better and needs `cityCosts` exported; it is module-private today.
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
import { RULES } from '../sim/rulesData';
import { cityDisplayName } from './cityDisplay';
import { element } from './dom';
import { meterFigure } from './figures';
import { razeCityError } from '../sim/diplomacy';

/** The three answers a conquest offers. `puppet` sends nothing — see the docblock. */
export type CaptureChoice = 'annex' | 'puppet' | 'raze';

/** The three, in the order the sheet lays them out: keep, hold, destroy. */
export const CAPTURE_CHOICES: readonly CaptureChoice[] = ['annex', 'puppet', 'raze'];

/**
 * What this town is worth to its captor, in the meters' own figures.
 *
 * Read once, off the two lists the ledgers print, so a figure on this sheet and
 * the same figure on the authority card can never be two different readings of
 * the same turn.
 */
export interface CaptureFigures {
  /** The writ this town costs today, as a puppet. `explainAuthority`'s own line. */
  puppetWrit: number;
  /**
   * The writ annexing adds — `rules.war.puppetAuthorityRelief`, the relief a
   * puppet is given and an annexed town is not. The one figure here that is a
   * rules field rather than a meter line; see the module docblock.
   */
  annexWrit: number;
  /**
   * The contentment a puppet's citizens are forgiven —
   * `explainHappiness`'s own gain line. Annexing gives it back; razing takes the
   * whole town, and with it everything it asked for.
   */
  puppetRelief: number;
  /** What this town's citizens ask for, net of every relief. The fold of its lines. */
  demand: number;
  /** How many stand in it. */
  population: number;
  /** How many hexes answer to it, and would answer to nobody if it came down. */
  hexes: number;
}

/** Does this meter line belong to this town? The label the meter itself wrote. */
function namesCity(line: MeterContribution, city: City): boolean {
  return line.source === city.name || line.source.startsWith(`${city.name} `);
}

/** One town's lines out of a meter's whole list. */
function linesFor(list: readonly MeterContribution[], city: City): MeterContribution[] {
  return list.filter((line) => namesCity(line, city));
}

/** A named line's magnitude, or zero where the meter drew none. */
function magnitudeOf(list: readonly MeterContribution[], source: string): number {
  const line = list.find((row) => row.source === source);
  return line === undefined ? 0 : Math.abs(line.value);
}

/**
 * The figures, read off the simulation.
 *
 * Pure and exported so the readings can be pinned by a test with no DOM: the
 * failure this sheet is most exposed to is a number composed here instead of
 * asked for, and that is visible in which list a value came out of.
 */
export function captureFigures(
  state: GameState,
  playerId: number,
  city: City,
): CaptureFigures {
  const writ = explainAuthority(state, playerId);
  const content = explainHappiness(state, playerId);
  const townLines = linesFor(content, city);
  let hexes = 0;
  for (const owner of state.tileOwner) if (owner === city.id) hexes += 1;
  return {
    puppetWrit: magnitudeOf(writ, `${city.name} · puppet`),
    annexWrit: Math.max(0, RULES.war.puppetAuthorityRelief),
    puppetRelief: magnitudeOf(content, `${city.name} · puppet`),
    // The town's own lines, folded — costs are negative, the two reliefs
    // positive, and what is left is what holding it actually asks of the realm.
    demand: Math.abs(townLines.reduce((sum, line) => sum + line.value, 0)),
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
  const writ = (value: number, sign: '+' | '−'): CaptureFigureLine => ({
    label: 'Writ',
    value: `${sign}${meterFigure(value)}⚜`,
  });
  const content = (value: number, sign: '+' | '−'): CaptureFigureLine => ({
    label: 'Contentment',
    value: `${sign}${meterFigure(value)}☺`,
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
        figures: [writ(figures.annexWrit, '−'), content(figures.puppetRelief, '−')],
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
        figures: [writ(figures.puppetWrit, '−'), content(figures.puppetRelief, '+')],
        blocked: null,
      },
      {
        choice: 'raze',
        label: 'Raze',
        body:
          'The town is pulled down and its ground answers to nobody. Nothing is paid' +
          ' for its stones.',
        figures: [
          writ(figures.puppetWrit, '+'),
          { label: 'Citizens', value: meterFigure(figures.population) },
          { label: 'Ground', value: `${meterFigure(figures.hexes)}⬡` },
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
