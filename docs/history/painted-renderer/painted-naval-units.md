# Painted naval review

User approved siege and requested naval next. Implement all fourteen naval
roster IDs using a shared carved hull and ivory/enamel/gilt palette. No chess
plinth beneath ships. Preserve data-defined mast counts and line identity:
slender light galleys, broad raised-deck heavy hulls, ranged deck weapons.
Later rigs and leader variants receive restrained equipment differences.

Add separate Light ships, Heavy ships and Ranged ships groups to Flair on
real navigable water. Use production painting, owner pigments, picking,
movement, falling and fog. Naval hulls resolve on water; embarked land units
and laden traders keep their existing runtime boats. Check water placement
so shore terrain does not lift ships out of the sea.

Keep simulation and existing accepted asset geometry unchanged. Validate
roster coverage, masks, water/land resolution, legal movement, silhouettes,
visibility and previous art, then typecheck, core and build. Stop for review.

Implemented all fourteen IDs in the shared procedural factory and production
kit. Light ships use a slender oared hull, heavy ships a broader hull and raised
sterncastle, ranged ships a brazier/nozzles or cannon battery. Mast counts and
canton symbols follow the roster. Naval models also resolve on port-city land;
embarked land units and laden caravans retain runtime boats.

Waterborne support preserves the water/animation height instead of sampling
hull and oar contacts against adjacent shore. Separate Flair groups use actual
coast cells and the real movement command. Existing instancing, owner pigments,
model picking, hover outlines, moving/falling copies and fog remain shared.

Live review: light/heavy/ranged silhouettes, maroon/gold and papyrus/lapis,
ship-of-the-line model click, one-hex movement, remembered fog and restoration.
No browser errors. Evidence: `.dream-loop/naval-heavy-review.png`,
`.dream-loop/naval-ranged-review.png`, `.dream-loop/naval-fire-review.png`.

The core run exposed an existing city-banner hover test stub that depended on
an import mock despite the suite's shared module cache. The stub now provides
dataset/style and a null canvas context, exercising the real no-canvas fallback
without changing application behaviour.

Review groups: `navalLight`, `navalHeavy`, `navalRanged` at
`/flair.html?review=units&unit=navalLight&group=navalLight&light=golden&detail=close`.
Approved by the user; proceed to the remaining faith/caravan variants.

Validation: all 6,501 core tests across 231 files pass, including naval mast
counts, water placement, instancing, movement/falling, legal fixture movement
and earlier geometry fingerprints. Typecheck and production build pass. Build
retains the existing large-chunk advisory. `git diff --check` is clean.
