/**
 * Entry point for the Compendium page — the game's own reference, in a tab.
 *
 * The sixth root page, and the only one of the six that is not a *dev* page:
 * `proto3d.html`, `pieces.html`, `abacus.html`, `mapgen.html` and `flair.html`
 * are look-dev and inspection surfaces, and this is a thing a player reads.
 *
 * One module, two mounts
 * ----------------------
 * There is no second Compendium. `renderCompendium` (`src/ui/compendium.ts`) is
 * the same function the in-game overlay calls, handed a different element, and
 * everything below it is the same book: the fourteen shelves, the same cards,
 * the same ids. What this file adds is the three things a *page* has and a
 * screen does not — the stylesheet, the address bar, and no game.
 *
 * **No game is the point, not a concession.** Nothing on those cards is a fact
 * about a seat or a turn (see the module's docblock), so `getState` is simply
 * omitted; a unit's roster price is the row's own figure, which is the first
 * line of `explainUnitCost`'s fold and therefore the same number the overlay
 * prints. A page that had to boot a simulation to say what a warrior costs would
 * be a page that could disagree with the game about it.
 *
 * The address bar is the second half of the id scheme
 * --------------------------------------------------
 * Every entry's id is `unit:swordsman` — its DOM id *and* its hash — so
 * `compendium.html#tech:ironWorking` opens on that card, and picking one writes
 * the hash back. That is a link a designer can paste into a ledger entry, and it
 * is the same address the in-game overlay's `open()` takes.
 */

import '../style.css';
import { renderCompendium, sectionOfId } from '../ui/compendium';

const body = document.getElementById('compendium-body');
if (!(body instanceof HTMLElement)) {
  throw new Error('compendium.html is missing #compendium-body');
}

const view = renderCompendium(body, {
  // The address bar is written on every pick, so a reader who has found the
  // right card can hand somebody the link they are looking at. `replaceState`
  // rather than assigning `location.hash`: a reference page should not fill the
  // back button with every card that was glanced at on the way.
  onSelect: (entryId) => {
    window.history.replaceState(null, '', `#${entryId}`);
  },
});

/** The entry a `#…` names, or `null` for anything that is not an entry id. */
function hashEntry(): string | null {
  const hash = window.location.hash.replace(/^#/, '');
  return hash.length > 0 && sectionOfId(hash) !== null ? hash : null;
}

const opening = hashEntry();
if (opening !== null) view.show(opening);

// Back and forward through the addresses this page wrote, and a link followed
// from outside. `hashchange` rather than a click handler because the hash is the
// only navigation this page has.
window.addEventListener('hashchange', () => {
  const wanted = hashEntry();
  if (wanted !== null && wanted !== view.current()) view.show(wanted);
});
