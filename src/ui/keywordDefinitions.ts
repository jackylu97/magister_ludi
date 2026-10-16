/**
 * The short definition a keyword's hover card shows, read off the Compendium's
 * own entry for the keyword's `kind:id` (batch T2).
 *
 * The Compendium's rule holds here unchanged: nothing on a card is hand-written
 * prose about a number. A definition is a *selection* from the generated entry
 * (`compendium.ts`, `compendiumText.ts`, `compendiumShelves.ts`) and never a
 * rewording of it. It keeps the entry's own row and clause objects, so the
 * figures are the same composed strings the book prints and the clauses are the
 * describers' own words, keyword marks included.
 *
 * What "short" means
 * ------------------
 * - **An entry built from a data row** (a unit, a building, a card): its eyebrow,
 *   its name, every row of figures, and every clause except the notes. That is
 *   the thing's facts without its caveats. The flavour line goes too. A line
 *   saying the card is withdrawn or not dealt yet is kept, and comes first,
 *   because it is the thing to know before the rules under it. A struck-through
 *   line (designed but not built) is kept and printed struck through, the way
 *   the book prints it.
 * - **A written page** (a concept, the lead page of a shelf): its first
 *   paragraph. The Compendium's voice puts what a thing is and why it matters
 *   first on every written page, so the first paragraph is that page's
 *   definition.
 *
 * Everything else is one click away, on the card's "Full entry" button.
 *
 * Loaded on first use
 * -------------------
 * The Compendium's module is about 95 KB and building every entry takes about
 * 50 ms, and the game page keeps both off its load (`lazyScreen.ts`). So this
 * module imports the Compendium's types only, and `loadKeywordDefinitions`
 * imports the module itself the first time a keyword is hovered or focused.
 * `main.ts` already fetches that chunk when the browser is idle, so the first
 * hover usually waits only for the entries to be built. A failed load is
 * dropped, so the next hover tries again.
 */

import type {
  CompendiumClause,
  CompendiumEntry,
  CompendiumRow,
  CompendiumSection,
} from './compendium';

/** What a hover card prints for one keyword. */
export interface KeywordDefinition {
  /** The entry id, the same `kind:id` the keyword carries. */
  readonly id: string;
  readonly name: string;
  /** What kind of thing it is, in the Compendium's own words: "food building". */
  readonly eyebrow: string;
  /** Composed in `YIELD_GLYPH`, as the book composes them. Empty on a written page. */
  readonly rows: readonly CompendiumRow[];
  /** The entry's own clauses, in its own order. */
  readonly lines: readonly CompendiumClause[];
  /** True for a written page: `lines` is one paragraph of prose, not a list. */
  readonly prose: boolean;
}

/** One entry's short definition. See the module docblock for what is kept. */
export function shortDefinition(entry: CompendiumEntry): KeywordDefinition {
  const prose = entry.written === true || entry.pamphlet === true;
  return {
    id: entry.id,
    name: entry.name,
    eyebrow: entry.eyebrow,
    rows: prose ? [] : entry.rows,
    lines: prose ? entry.clauses.slice(0, 1) : entry.clauses.filter((line) => line.note !== true),
    prose,
  };
}

/** Looks a definition up by entry id. Null for an id the book has no entry for. */
export type DefinitionReader = (entryId: string) => KeywordDefinition | null;

/** A reader over a built book. Each definition is made once, when first asked for. */
export function definitionReader(sections: readonly CompendiumSection[]): DefinitionReader {
  const entries = new Map<string, CompendiumEntry>();
  for (const section of sections) {
    for (const entry of section.entries) entries.set(entry.id, entry);
  }
  const made = new Map<string, KeywordDefinition>();
  return (entryId) => {
    const known = made.get(entryId);
    if (known !== undefined) return known;
    const entry = entries.get(entryId);
    if (entry === undefined) return null;
    const definition = shortDefinition(entry);
    made.set(entryId, definition);
    return definition;
  };
}

let loading: Promise<DefinitionReader> | null = null;

/**
 * The reader over the whole Compendium, built on the first call and shared by
 * every call after it.
 */
export function loadKeywordDefinitions(): Promise<DefinitionReader> {
  if (loading === null) {
    loading = import('./compendium')
      .then(({ compendiumSections }) => definitionReader(compendiumSections()))
      .catch((error: unknown) => {
        loading = null;
        throw error;
      });
  }
  return loading;
}
