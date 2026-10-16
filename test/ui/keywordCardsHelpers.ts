/**
 * A small stand-in for the browser's DOM, enough to run the hover cards' layer
 * (`src/ui/keywordCards.ts`) and the keyword renderer under it in this suite,
 * which has no DOM (`vite.config.ts`, `environment: 'node'`).
 *
 * It is not a browser. It keeps a tree of nodes with their attributes, classes
 * and listeners; it matches the handful of selector shapes the layer uses
 * (`.class`, `[attr]`, `[attr="value"]`, a tag, `:not(...)`, and lists of
 * those); it sends an event through the window, the document and the node's
 * ancestors in the capture phase and back out in the bubble phase; and it moves
 * focus with `focusout` and `focusin`. Layout is whatever a test says it is:
 * a node's box is the `rect` a test gives it, and a hover card's box is its
 * `style.left` and `style.top` with a fixed size.
 *
 * A non-test module, so the suites that use it do not import each other
 * (CLAUDE.md, "Commands & test discipline").
 */

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

type Handler = (event: FakeEvent) => void;

interface Listener {
  readonly type: string;
  readonly fn: Handler;
  readonly capture: boolean;
}

function captureOf(options: unknown): boolean {
  if (options === true) return true;
  return typeof options === 'object' && options !== null && (options as { capture?: boolean }).capture === true;
}

/** Something listeners can be added to: a node, the document or the window. */
export class FakeTarget {
  listeners: Listener[] = [];

  addEventListener(type: string, fn: Handler, options?: unknown): void {
    this.listeners.push({ type, fn, capture: captureOf(options) });
  }

  removeEventListener(type: string, fn: Handler, options?: unknown): void {
    const capture = captureOf(options);
    const at = this.listeners.findIndex((one) => one.type === type && one.fn === fn && one.capture === capture);
    if (at >= 0) this.listeners.splice(at, 1);
  }
}

export class FakeEvent {
  defaultPrevented = false;
  stopped = false;
  stoppedNow = false;
  readonly type: string;
  readonly target: unknown;
  [key: string]: unknown;

  constructor(type: string, target: unknown, init: Record<string, unknown> = {}) {
    this.type = type;
    this.target = target;
    Object.assign(this, init);
  }

  preventDefault(): void {
    this.defaultPrevented = true;
  }

  stopPropagation(): void {
    this.stopped = true;
  }

  stopImmediatePropagation(): void {
    this.stopped = true;
    this.stoppedNow = true;
  }
}

/** `dataset`'s camelCase key as its attribute: `kwc` → `data-kwc`. */
function dataAttribute(key: string): string {
  return `data-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

/** Does `node` match one compound selector, such as `.kw[data-ref]`? */
function matchesCompound(node: FakeNode, compound: string): boolean {
  let rest = compound.trim();
  const tag = /^[a-z][a-z0-9]*/i.exec(rest);
  if (tag !== null) {
    if (node.tagName.toLowerCase() !== tag[0].toLowerCase()) return false;
    rest = rest.slice(tag[0].length);
  }
  while (rest.length > 0) {
    let match: RegExpExecArray | null;
    if ((match = /^\.([\w-]+)/.exec(rest)) !== null) {
      if (!node.classList.contains(match[1]!)) return false;
    } else if ((match = /^\[([\w-]+)(?:="([^"]*)")?\]/.exec(rest)) !== null) {
      const value = node.getAttribute(match[1]!);
      if (value === null) return false;
      if (match[2] !== undefined && value !== match[2]) return false;
    } else if ((match = /^:not\((.*?)\)/.exec(rest)) !== null) {
      const inner = match[1]!;
      const hit = inner === ':disabled' ? node.hasAttribute('disabled') : matchesCompound(node, inner);
      if (hit) return false;
    } else if ((match = /^:focus-visible/.exec(rest)) !== null) {
      // The browser's guess at whether the keyboard moved focus; here a test
      // says which it was (`FakeDom.keyboard`).
      if (!node.dom.keyboard || node.dom.document.activeElement !== node) return false;
    } else {
      throw new Error(`the stand-in DOM cannot match "${compound}"`);
    }
    rest = rest.slice(match[0].length);
  }
  return true;
}

function matchesSelector(node: FakeNode, selector: string): boolean {
  if (node.kind !== 'element') return false;
  return selector.split(',').some((part) => matchesCompound(node, part));
}

/** One node: an element, a run of text, or a fragment. */
export class FakeNode extends FakeTarget {
  readonly kind: 'element' | 'text' | 'fragment';
  readonly tagName: string;
  parentNode: FakeNode | null = null;
  childNodes: FakeNode[] = [];
  text = '';
  readonly attrs = new Map<string, string>();
  /** Its box, when a test gives it one. See `getBoundingClientRect`. */
  rect: Rect | null = null;
  readonly style: Record<string, string> & {
    setProperty(name: string, value: string): void;
    removeProperty(name: string): void;
    getPropertyValue(name: string): string;
  };
  readonly dataset: Record<string, string | undefined>;
  readonly classList: {
    add(...names: string[]): void;
    remove(...names: string[]): void;
    toggle(name: string, force?: boolean): boolean;
    contains(name: string): boolean;
  };

  constructor(
    readonly dom: FakeDom,
    kind: 'element' | 'text' | 'fragment',
    tag: string,
  ) {
    super();
    this.kind = kind;
    this.tagName = tag.toUpperCase();
    const props: Record<string, string> = {};
    this.style = Object.assign(props, {
      setProperty: (name: string, value: string): void => {
        props[name] = value;
      },
      removeProperty: (name: string): void => {
        delete props[name];
      },
      getPropertyValue: (name: string): string => props[name] ?? '',
    }) as FakeNode['style'];
    this.dataset = new Proxy({} as Record<string, string | undefined>, {
      get: (_target, key) => (typeof key === 'string' ? this.attrs.get(dataAttribute(key)) : undefined),
      set: (_target, key, value) => {
        if (typeof key === 'string') this.attrs.set(dataAttribute(key), String(value));
        return true;
      },
      deleteProperty: (_target, key) => {
        if (typeof key === 'string') this.attrs.delete(dataAttribute(key));
        return true;
      },
    });
    const names = (): string[] => (this.attrs.get('class') ?? '').split(/\s+/).filter((name) => name !== '');
    const write = (list: string[]): void => {
      this.attrs.set('class', list.join(' '));
    };
    this.classList = {
      add: (...added) => write([...new Set([...names(), ...added])]),
      remove: (...removed) => write(names().filter((name) => !removed.includes(name))),
      toggle: (name, force) => {
        const on = force ?? !names().includes(name);
        if (on) write([...new Set([...names(), name])]);
        else write(names().filter((one) => one !== name));
        return on;
      },
      contains: (name) => names().includes(name),
    };
  }

  // --- attributes ---------------------------------------------------------------

  setAttribute(name: string, value: string): void {
    this.attrs.set(name, String(value));
  }

  getAttribute(name: string): string | null {
    return this.attrs.get(name) ?? null;
  }

  hasAttribute(name: string): boolean {
    return this.attrs.has(name);
  }

  removeAttribute(name: string): void {
    this.attrs.delete(name);
  }

  get className(): string {
    return this.attrs.get('class') ?? '';
  }

  set className(value: string) {
    this.attrs.set('class', value);
  }

  get id(): string {
    return this.attrs.get('id') ?? '';
  }

  set id(value: string) {
    this.attrs.set('id', value);
  }

  get type(): string {
    return this.attrs.get('type') ?? '';
  }

  set type(value: string) {
    this.attrs.set('type', value);
  }

  get hidden(): boolean {
    return this.attrs.has('hidden');
  }

  set hidden(value: boolean) {
    if (value) this.attrs.set('hidden', '');
    else this.attrs.delete('hidden');
  }

  get tabIndex(): number {
    const written = this.attrs.get('tabindex');
    if (written !== undefined) return Number(written);
    return ['BUTTON', 'A', 'INPUT'].includes(this.tagName) ? 0 : -1;
  }

  set tabIndex(value: number) {
    this.attrs.set('tabindex', String(value));
  }

  // --- text ---------------------------------------------------------------------

  get textContent(): string {
    if (this.kind === 'text') return this.text;
    return this.childNodes.map((child) => child.textContent).join('');
  }

  set textContent(value: string) {
    if (this.kind === 'text') {
      this.text = value;
      return;
    }
    this.replaceChildren(this.dom.document.createTextNode(value));
  }

  // --- the tree -----------------------------------------------------------------

  /** Each argument as the nodes it stands for: a fragment gives up its children. */
  private adopt(items: readonly (FakeNode | string)[]): FakeNode[] {
    const out: FakeNode[] = [];
    for (const item of items) {
      const node = typeof item === 'string' ? this.dom.document.createTextNode(item) : item;
      if (node.kind === 'fragment') {
        const moved = [...node.childNodes];
        node.childNodes = [];
        for (const child of moved) child.parentNode = null;
        out.push(...moved);
      } else {
        node.detach();
        out.push(node);
      }
    }
    return out;
  }

  /** Takes this node out of its parent, moving focus off it as a browser does. */
  private detach(): void {
    const parent = this.parentNode;
    if (parent === null) return;
    const active = this.dom.document.activeElement;
    if (active !== null && this.contains(active)) this.dom.document.activeElement = this.dom.document.body;
    parent.childNodes = parent.childNodes.filter((child) => child !== this);
    this.parentNode = null;
  }

  append(...items: (FakeNode | string)[]): void {
    for (const node of this.adopt(items)) {
      node.parentNode = this;
      this.childNodes.push(node);
    }
  }

  replaceChildren(...items: (FakeNode | string)[]): void {
    const incoming = this.adopt(items);
    for (const child of [...this.childNodes]) child.detach();
    for (const node of incoming) {
      node.parentNode = this;
      this.childNodes.push(node);
    }
  }

  remove(): void {
    this.detach();
  }

  replaceWith(...items: (FakeNode | string)[]): void {
    const parent = this.parentNode;
    if (parent === null) return;
    const incoming = this.adopt(items);
    const at = parent.childNodes.indexOf(this);
    this.detach();
    for (const node of incoming) node.parentNode = parent;
    parent.childNodes.splice(at, 0, ...incoming);
  }

  contains(other: unknown): boolean {
    for (let node = other as FakeNode | null; node !== null && node !== undefined; node = node.parentNode) {
      if (node === this) return true;
    }
    return false;
  }

  get isConnected(): boolean {
    let node: FakeNode = this;
    while (node.parentNode !== null) node = node.parentNode;
    return node === this.dom.document.documentElement;
  }

  matches(selector: string): boolean {
    return matchesSelector(this, selector);
  }

  closest(selector: string): FakeNode | null {
    for (let node: FakeNode | null = this; node !== null; node = node.parentNode) {
      if (matchesSelector(node, selector)) return node;
    }
    return null;
  }

  /** Every node under this one, in document order. */
  descendants(): FakeNode[] {
    return this.childNodes.flatMap((child) => [child, ...child.descendants()]);
  }

  querySelectorAll(selector: string): FakeNode[] {
    return this.descendants().filter((node) => matchesSelector(node, selector));
  }

  querySelector(selector: string): FakeNode | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  // --- layout and focus -----------------------------------------------------------

  getBoundingClientRect(): Rect & { right: number; bottom: number; x: number; y: number } {
    let box: Rect = this.rect ?? { left: 0, top: 0, width: 0, height: 0 };
    if (this.rect === null && this.classList.contains('kwc') && this.isConnected) {
      box = {
        left: Number.parseFloat(this.style.left ?? '0') || 0,
        top: Number.parseFloat(this.style.top ?? '0') || 0,
        ...this.dom.cardSize,
      };
    }
    if (!this.isConnected) box = { left: 0, top: 0, width: 0, height: 0 };
    return { ...box, right: box.left + box.width, bottom: box.top + box.height, x: box.left, y: box.top };
  }

  focus(): void {
    const document = this.dom.document;
    const previous = document.activeElement;
    if (previous === this) return;
    document.activeElement = this;
    if (previous !== null && previous !== document.body) {
      this.dom.fire(previous, 'focusout', { relatedTarget: this });
    }
    this.dom.fire(this, 'focusin', { relatedTarget: previous });
  }
}

/** The document: a tree of `html > body`, the factories, and focus. */
export interface FakeDocument extends FakeTarget {
  readonly documentElement: FakeNode;
  readonly body: FakeNode;
  activeElement: FakeNode | null;
  createElement(tag: string): FakeNode;
  createTextNode(text: string): FakeNode;
  createDocumentFragment(): FakeNode;
}

export interface FakeWindow extends FakeTarget {
  innerWidth: number;
  innerHeight: number;
  location: { hash: string };
  requestAnimationFrame(callback: () => void): number;
  cancelAnimationFrame(id: number): void;
}

/** The whole stand-in, with what a test needs to drive it. */
export class FakeDom {
  readonly document: FakeDocument;
  readonly window: FakeWindow;
  /** The size every hover card measures at. */
  cardSize = { width: 288, height: 180 };
  /** Whether focus is moving by keyboard, for `:focus-visible`. A click sets it false. */
  keyboard = true;
  private frames = new Map<number, () => void>();
  private nextFrame = 1;

  constructor() {
    const doc = new FakeTarget() as FakeTarget & Partial<FakeDocument>;
    const html = new FakeNode(this, 'element', 'html');
    const body = new FakeNode(this, 'element', 'body');
    Object.assign(doc, {
      documentElement: html,
      body,
      activeElement: body,
      createElement: (tag: string) => new FakeNode(this, 'element', tag),
      createTextNode: (text: string) => {
        const node = new FakeNode(this, 'text', '#text');
        node.text = text;
        return node;
      },
      createDocumentFragment: () => new FakeNode(this, 'fragment', '#fragment'),
    });
    this.document = doc as FakeDocument;
    html.append(body);
    const win = new FakeTarget() as FakeTarget & Partial<FakeWindow>;
    Object.assign(win, {
      innerWidth: 1280,
      innerHeight: 800,
      location: { hash: '' },
      requestAnimationFrame: (callback: () => void): number => {
        const id = this.nextFrame++;
        this.frames.set(id, callback);
        return id;
      },
      cancelAnimationFrame: (id: number): void => {
        this.frames.delete(id);
      },
    });
    this.window = win as FakeWindow;
  }

  /** Runs every animation frame waiting. */
  flushFrames(): void {
    const waiting = [...this.frames.values()];
    this.frames.clear();
    for (const callback of waiting) callback();
  }

  /**
   * Sends one event to `target`: the capture phase from the window down, then
   * the bubble phase back up. A target of the window or the document reaches
   * only what is above it.
   */
  fire(target: FakeNode | FakeTarget, type: string, init: Record<string, unknown> = {}): FakeEvent {
    const event = new FakeEvent(type, target, init);
    const path: FakeTarget[] = [];
    if (target instanceof FakeNode) {
      const chain: FakeNode[] = [];
      for (let node: FakeNode | null = target; node !== null; node = node.parentNode) chain.unshift(node);
      path.push(this.window, this.document, ...chain);
    } else if (target === this.document) {
      path.push(this.window, this.document);
    } else {
      path.push(target);
    }
    const at = path.length - 1;
    const call = (holder: FakeTarget, capture: boolean | null): void => {
      for (const listener of [...holder.listeners]) {
        if (event.stoppedNow) return;
        if (listener.type !== type) continue;
        if (capture !== null && listener.capture !== capture) continue;
        listener.fn(event);
      }
    };
    for (let index = 0; index < at && !event.stopped; index += 1) call(path[index]!, true);
    if (!event.stopped) call(path[at]!, null);
    for (let index = at - 1; index >= 0 && !event.stopped; index -= 1) call(path[index]!, false);
    return event;
  }

  /** Every listener on the window and the document, as `type/capture` strings. */
  pageListeners(): string[] {
    return [...this.window.listeners, ...this.document.listeners]
      .map((one) => `${one.type}/${one.capture ? 'capture' : 'bubble'}`)
      .sort();
  }
}

/** Puts a fresh stand-in in place of `document` and `window`; returns it and the undo. */
export function installFakeDom(): { dom: FakeDom; restore: () => void } {
  const global = globalThis as { document?: unknown; window?: unknown };
  const realDocument = global.document;
  const realWindow = global.window;
  const dom = new FakeDom();
  global.document = dom.document;
  global.window = dom.window;
  return {
    dom,
    restore: () => {
      global.document = realDocument;
      global.window = realWindow;
    },
  };
}
