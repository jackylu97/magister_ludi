# Siege equipment review

User ruling: mounted variants approved; proceed to the siege set. Implement
catapult and trebuchet as compact tabletop mechanisms in the approved ivory,
enamel and gilt palette. No human crew. A low wheeled torsion catapult and a
tall counterweight trebuchet must read differently at game zoom.

Use the shared production painted unit kit for owner pigments, instancing,
selection, hover, movement and falling copies. Add a Siege comparison group
to Flair in this same pass. Preserve all previous assets and simulation rules.
Inspect both models at game and detail scale, check movement/visibility, and
run typecheck, core tests and build before returning for an eye check.

Implemented in the shared source factory and production resolver. Siege has
its own two-piece comparison with individual game/detail views. Direct
catapult URLs also choose the siege fixture instead of the representatives.
The two siege IDs extend both the resting and moving/falling test cases;
fallback tests now use the still-legacy inquisitor.

Validation: 58 focused tests, typecheck, all 6,495 core tests in 230 files and
production build pass. Build retains the existing large-chunk advisory.

Live review: both silhouettes with badges hidden, maroon/gold and papyrus/lapis
palettes, direct trebuchet selection, real movement, remembered fog and
restoration. No browser errors. Evidence: `.dream-loop/siege-variants-review.png`
and `.dream-loop/trebuchet-review.png`.

Review: `/flair.html?review=units&unit=siege&group=siege&light=golden&detail=close`.
Approved by the user; proceed to naval.
