# The city screen — the redesign that revision 2 overrode

Cut out of `docs/city-screen.md` on 2026-09-11. The first redesign, kept for
the record; the spec of record is the reference doc's revisions 2, 3 and 3.1.

## The first redesign (kept for the record; rev 2 overrides)

Adopt the house split, inside the widened dock. **Left column — the town**
(read-mostly):

- Header band: name · size · hp (+siege badge) · belief line · the growth
  ring (the banner's own mark, larger) with "grows in N" beside it.
- A **yield chip row** — one chip per yield showing the fold; the full
  rule-5 breakdown moves to the existing hover-card idiom. Nothing is
  deleted, it is one hover deeper.
- **The people** — one section: assigned count + focus note + specialists
  + followers as sub-rows of a single box.
- **Growth and Borders** — two compact progress rows (bar, turns figure),
  breakdowns on hover.
- **Standing facts, collapsed** — Defence / Built / Routes as disclosure
  rows (closed by default, count in the summary: "Built · 7"), the current
  contents unchanged inside.

**Right pane — the work** (the decision surface):

- A **current production card**: item name, progress bar, turns, with the
  modifier lines it already prints.
- The queue rows directly under it.
- **Add to queue directly under the queue**, tabbed by
  `ProductionCategory` (Units / Buildings / Wonders / Projects) instead of
  one long list; the buy-mode toggle and purchase prices stay exactly
  where the flow has them, inside the same pane.
- Puppet note and locked hints stay with the pane they explain.

Rules that bind the pass:

- **No information deleted** — every list, ledger and hover the screen
  prints today remains reachable (hover or disclosure). Rule 5 is not
  negotiable; this pass moves ink, it does not dry it up.
- No sim changes, no new sim reads — the same `CityReading` photograph.
- Specimen language throughout; tabular figures; the split's existing CSS
  classes and the capped-overlay rule (the sheet joins the one rule the
  register test pins, as Diplomacy just did).
- Keyboard/Esc/close behaviour, `gameDisposers`, and the sticky info-card
  rules unchanged.
- The 8/28 ruling stands: no redundant "Empire +X%" line beside the
  per-city modifier lines.
