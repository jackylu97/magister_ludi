# Leader changes before unit integration — September 14, 2026

User ruling: the six special improvements are approved. Check `origin/main` and
fold in its leader-related changes before continuing the painted renderer work.

Preserve the approved, uncommitted painted terrain/city/improvement work. Inspect
the upstream changes and their dependencies, integrate them without changing their
gameplay rules, then update affected renderer adapters and the unit inventory.
Resolve overlaps against both versions and validate the combined build. Unit art
migration follows this integration checkpoint.

## Integrated baseline

- Branch: `codex/painted-leader-integration`; HEAD and fetched `origin/main` are
  `3f997dcec731d91badc27469c441bf99374e95e1`, 57 commits after the previous
  `c26f2bb` baseline. The local `main` branch was not moved.
- All 201 original modified/untracked files were copied and SHA256-verified at
  `/private/tmp/webciv-leader-integration-20260914-101656` before integration.
  The directory contains the manifest, original files, binary diff, three-way
  merge inputs/output and final preservation record. The accepted art remains
  uncommitted in the working tree; nothing was pushed.
- Seven tracked files overlapped. Six merged cleanly. The Flair stylesheet
  retained both its new works-review rules and upstream leader-canton rules.
  There were no untracked/upstream path collisions.
- Shared renderer seams preserve painted surface heights and city banner
  anchors while incorporating upstream city flags, secondary owner colours,
  selection ink and siege/banner behavior. Siege information remains in the
  DOM layer. Neutral building and terrain materials keep the approved palette.

## Leader and content compatibility

- The final roster contains thirteen leaders, each with a unique unit and city
  building. Their selected identity, paired colours, town names, abilities and
  start biases come from upstream data and simulation.
- Units increased from 44 to 61: thirteen active leader units and four parked
  alternatives still present in the registry. The painted catalogue assigns all
  seventeen additions explicitly, preserving the original 44 line/rank addresses
  and twelve accepted representative models. New assignments have `ready: false`.
  The five great-person families remain intact. The exact variant inventory is
  maintained in [terrain-study-units.md](terrain-study-units.md).
- Canonesses and apostles now receive religious badges from their proclamation
  role. Rihla caravans receive the trader badge from their trading role instead
  of inheriting the worker badge from their shared base model class.
- Treasure ships reuse the current carrack sculpt, and Alexandrian galleys reuse
  the galley sculpt; their existing mast/canton data agrees with those aliases.
  Embarked and laden appearances continue to resolve through the shared rules.
- There are now 117 city-building rows. These additions are city buildings, not
  extra tile improvements. All 43 resource types and the fourteen in-scope tile
  improvements remain covered. Floating gardens remain excluded.
- Pachacuti's terraces permit dry resource-free hill farms; the painted contour
  farm already follows those tile surfaces. Additional prophet-founded holy
  sites use the actual tile improvement, so the existing work layer covers them.

## Runtime and saves

Upstream moves the save schema from 110 to 115 with no migration. Existing saves
were left untouched; changing their version number would not migrate their state.
The upstream research/item progress fields, player leader/secondary colour fields,
counted adjacent mountains, buy/spawn behavior and full-allowance auto-explore
were retained without changes to simulation rules or random-number generation.

A fresh standard 80 × 52, seed 1, two-seat game was tested through the real UI
at `/?art=painted&light=golden` with Mithridates. Founded Sinope, inspected his
leader sheet and purple/silver territory, queued a worker and Mining, sent the
scout exploring, ended turn 1 and reached turn 2. Saved separately as
`Mithridates — painted integration` and loaded that save successfully: city,
production, research and turn state were retained. The review game is left open.

## Validation

- Typecheck and production build exit 0.
- Painted city/works/fixture/surface and city-banner compatibility: 118/118 pass.
- Complete unit badge/sculpt coverage and civilian/naval regressions: 165/165 pass.
- The settled core batch ran 6,405 tests: 6,404 passed and one failed on stale
  great-person documentation. The same figures mismatch exists on `origin/main`:
  the document says general combat 3 / aura 3 while the rules say 6 / 5. Only the
  documentation was corrected to the current rules; its focused sync file then
  passed all 5 tests. No simulation/data changes were needed.
- The catalogue test uses the repository's variable-specifier Node import pattern
  to keep the project's existing browser type surface. No Node typings added;
  its final focused run passes 4/4. `git diff --check` passes.
- Logs: `.dream-loop/leader-upstream-{core,typecheck,build,painted,catalog}.log`.
- Reloaded game screenshot: `.dream-loop/leader-upstream-reloaded.png`.

## Next visual checkpoint

Continue with unit-line integration using the expanded roster. The approved
twelve representative pieces are the baseline, with four remaining base families
(siege and three naval lines) and equipment/leader/state variants still pending.
Discovery sites, roads and paired borders remain later live-game migrations.

Include moving as well as stationary ownership marks in the unit checkpoint:
upstream stationary unit outlines use secondary owner ink, but the current walking
copy still uses the default outline. Review this along with stacked pieces,
garrison clearance, embarked/laden forms and great-person families.

No performance claim is made by this merge. The earlier baseline predates the
upstream map/start changes; benchmark the combined build during the next relevant
performance checkpoint.
