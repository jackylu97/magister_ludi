# Anti-cavalry and ranged variants

User approval, September 14, 2026: proceed with the next two unit-line reviews.
Keep the approved enamel chess-piece bodies, plinths, spearman cap and archer.
Add small silhouette/equipment variations, retaining ivory, gilt and owner ink.

Scope: phalanx, spear wall, pikeman, fubing and Pontic peltast; bowman, composite
bowman, crossbowman and slinger. Shared bases, no articulated human redesign.
Long spears and shields distinguish anti-cavalry; bows, crossbow and sling
distinguish ranged. Preserve all existing approved models and interactions.

Expose separate Anti-cavalry and Ranged groups in the production Flair review,
including the original spearman/archer for comparison. Resolve new assets in
the main painted game, movement and falling paths through the existing kit.
Stop for an eye check before mounted, siege, naval or other world-layer work.

Validate geometry preservation, model coverage, owner colouring, fog, movement,
fixture routing and live silhouettes. Run typecheck, core tests and build.

Implemented: the nine variants resolve in the main painted renderer and share
the existing instanced, moving and falling model paths. The comparison groups
include six anti-cavalry pieces and five ranged pieces. Original representative
and infantry packed-geometry fingerprints remain unchanged.

Validation: 52 focused tests pass; typecheck, all 6,489 core tests in 229 files,
and production build pass. Build retains the existing large-chunk advisory.
Live review covered all nine silhouettes, two owner palettes, direct model
selection with badges hidden, movement, remembered fog and restoration. No
browser errors were reported. Evidence: `.dream-loop/polearm-variants-review.png`
and `.dream-loop/ranged-variants-review.png`.

Review links:
- `/flair.html?review=units&unit=polearm&group=polearm&light=golden&detail=game`
- `/flair.html?review=units&unit=ranged&group=ranged&light=golden&detail=game`

Approved by the user on September 14; continue with the mounted equipment batch.
