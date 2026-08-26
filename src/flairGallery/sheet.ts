/**
 * The Flair Cabinet's furniture: sections, blocks, control rows, mark swatches.
 *
 * Small enough to be obvious and shared by every section, which is the point —
 * a gallery whose eight sections each invented their own heading and their own
 * slider would be eight pages in a trench coat, and the thing being inspected
 * would have to compete with the inconsistency of the page inspecting it.
 *
 * Nothing here styles anything. Every class it writes is either the game's own
 * (`.hud-card`, `.eyebrow`, `.inscription`) or one of the layout classes in
 * `style.css` beside it.
 */

/** An element with a class, and optionally its text. */
export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** One numbered section of the sheet, with its title and its in-game note. */
export interface Section {
  /** The `<section>` itself, appended to the sheet. */
  root: HTMLElement;
  /** The anchor the index links to. */
  id: string;
  title: string;
}

/**
 * A section: a title in the inscription voice, and one line saying where in the
 * game the thing lives.
 *
 * The "where" line is the only documentation on the page and it is deliberately
 * one sentence: a gallery that explained its assets would be a design doc with
 * pictures, and `docs/art-pass.md` already exists.
 */
export function section(into: HTMLElement, id: string, title: string, where: string): Section {
  const root = element('section', 'sheet-section');
  root.id = id;
  const heading = element('h2', 'inscription', title);
  root.append(heading, element('p', 'sheet-where', where));
  into.append(root);
  return { root, id, title };
}

/** A titled block inside a section. */
export function block(into: HTMLElement, title: string, note?: string): HTMLElement {
  const root = element('div', 'sheet-block');
  root.append(element('h3', undefined, title));
  if (note !== undefined) root.append(element('p', 'sheet-note', note));
  into.append(root);
  return root;
}

/** The strip of knobs above a specimen. */
export function controls(into: HTMLElement): HTMLElement {
  const row = element('div', 'sheet-controls');
  into.append(row);
  return row;
}

/**
 * A slider, its label, and the tabular-mono readout of where it stands.
 *
 * The readout is mono because it is a number and every number in this project
 * is (CLAUDE.md's own rule, and the one a look-dev page is most tempted to
 * break). `format` exists so a knob can print `0.09em` rather than `0.09`.
 */
export function slider(
  into: HTMLElement,
  label: string,
  spec: { min: number; max: number; step: number; value: number },
  format: (value: number) => string,
  onInput: (value: number) => void,
): HTMLInputElement {
  const wrap = element('label');
  wrap.append(document.createTextNode(label));
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(spec.min);
  input.max = String(spec.max);
  input.step = String(spec.step);
  input.value = String(spec.value);
  const figure = element('span', 'sheet-figure', format(spec.value));
  input.addEventListener('input', () => {
    const value = Number(input.value);
    figure.textContent = format(value);
    onInput(value);
  });
  wrap.append(input, figure);
  into.append(wrap);
  onInput(spec.value);
  return input;
}

/** A push button in the control strip. */
export function button(into: HTMLElement, label: string, onClick: () => void): HTMLButtonElement {
  const node = element('button', undefined, label);
  node.type = 'button';
  node.addEventListener('click', onClick);
  into.append(node);
  return node;
}

/** A checkbox with its label. */
export function checkbox(
  into: HTMLElement,
  label: string,
  checked: boolean,
  onChange: (on: boolean) => void,
): HTMLInputElement {
  const wrap = element('label');
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  wrap.append(input, document.createTextNode(label));
  into.append(wrap);
  return input;
}

/** A `<select>` with its label, over `[value, caption]` pairs. */
export function select(
  into: HTMLElement,
  label: string,
  options: readonly (readonly [string, string])[],
  value: string,
  onChange: (value: string) => void,
): HTMLSelectElement {
  const wrap = element('label');
  wrap.append(document.createTextNode(label));
  const node = document.createElement('select');
  for (const [id, caption] of options) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = caption;
    node.append(option);
  }
  node.value = value;
  node.addEventListener('change', () => onChange(node.value));
  wrap.append(node);
  into.append(wrap);
  return node;
}

// --- the mark swatch --------------------------------------------------------

/** One drawn mark, at one size, in whatever ink its container carries. */
export function markSwatch(uri: string, size: number, tone: 'ink' | 'gilt'): HTMLElement {
  const node = element('span', `mark-swatch mark-${tone}`);
  node.setAttribute('aria-hidden', 'true');
  node.style.setProperty('--mark', `url("${uri}")`);
  node.style.setProperty('--mark-size', `${size}px`);
  return node;
}

/**
 * The sizes every drawn mark is shown at, and why these three.
 *
 * **12** is the smallest the game ever prints one — a yield unit on a figure, a
 * corner star, a charge on a seat chip — and it is where a mark dies: strokes
 * merge, a ring closes into a blot. **24** is the working size, which is most
 * of them. **64** is the grid the marks are *drawn* on (`MARK_BOX`), so it is
 * the only size at which what you are looking at is the drawing itself rather
 * than the rasteriser's opinion of it.
 */
export const MARK_SIZES = [12, 24, 64] as const;

/**
 * One cell of a mark table: the drawing at the three sizes in ink, once more in
 * gilt, its id, and the sentence saying what it depicts.
 *
 * The gilt reading is not decoration on this page. Half of this set is printed
 * in gold somewhere in the game — a tarot card's rim, a shrine's finial, the
 * age band — and gold on parchment carries a fraction of ink's contrast, so a
 * mark that survives 12px in ink and dissolves at 24px in gilt is a mark nobody
 * has actually checked.
 */
export function markCell(into: HTMLElement, id: string, uri: string, note?: string): HTMLElement {
  const cell = element('div', 'mark-cell');
  const row = element('div', 'mark-row');
  for (const size of MARK_SIZES) row.append(markSwatch(uri, size, 'ink'));
  row.append(markSwatch(uri, 24, 'gilt'));
  cell.append(row, element('div', 'mark-id', id));
  if (note !== undefined) cell.append(element('div', 'mark-note', note));
  into.append(cell);
  return cell;
}

/** A grid of mark cells. */
export function markGrid(into: HTMLElement): HTMLElement {
  const grid = element('div', 'mark-grid');
  into.append(grid);
  return grid;
}

/** A drawn mark as a `data:` URI, from the SVG document text. */
export function uriOf(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
