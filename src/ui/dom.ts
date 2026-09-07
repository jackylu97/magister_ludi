/**
 * The three builders every surface was retyping.
 *
 * Nothing here is a decision. `element` is `document.createElement` with the
 * class and the text folded in, `requireElement` is `getElementById` that
 * refuses to hand back `null`, and `withArticle` is "a" or "an" off a name.
 * They are in one leaf for one reason: the simplification audit counted
 * twenty-three copies of the first, five of the second and two of the third
 * (`docs/audit/simplify.md` §2), and a helper copied twenty-three times is a
 * helper that has already drifted — three of the copies tested `className`
 * with `!== undefined` and the rest with truthiness, one of the two
 * `withArticle`s tested the vowel with `includes` and the other with a regex.
 * Same answers today; two rules tomorrow.
 *
 * The article helper sits beside the DOM ones rather than in a leaf of its own
 * because it has nowhere else to go that is not a cycle: the two files that
 * write it (`compendium.ts`, `controls.ts`) share no other module, and
 * `compendiumText.ts` — the obvious home for a word rule — imports
 * `compendium.ts` already.
 *
 * **The one thing this module must never grow** is a second element builder.
 * There is a second one and it is deliberate: `yieldElement` in `yieldMark.ts`
 * writes its text through `setYieldText` so a composed figure arrives with its
 * marks drawn. It is built on this one, it lives beside the printer it needs,
 * and the three panels that print figures import it under the same name.
 */

/**
 * An element, its class, and optionally its text.
 *
 * Generic over the tag so a caller gets an `HTMLButtonElement` back from
 * `'button'` and does not have to cast to reach `disabled`. The class is
 * skipped when it is empty rather than written as `""`, which is the same DOM
 * and one fewer attribute in the inspector.
 */
export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * The element with this id, or a thrown error naming it.
 *
 * Every root page's boot starts by claiming the handful of nodes its HTML
 * promises, and a page that has lost one of them should say which on the first
 * line rather than fail with `null` four functions later.
 */
export function requireElement<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node as T;
}

/**
 * "a Landmark", "an Academy" — the indefinite article, off the name.
 *
 * A sentence composed around a data row still has to be grammatical, and "a
 * Academy" is the version that shipped. The vowel test is the crude one on
 * purpose: every name it is asked about is a unit's, an improvement's or a
 * great person's work, and none of those tables has a "a university" trap in
 * it.
 */
export function withArticle(name: string): string {
  return `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`;
}
