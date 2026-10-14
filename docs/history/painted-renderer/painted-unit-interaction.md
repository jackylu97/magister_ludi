# Painted unit interaction and readability

User ruling, 2026-09-14: the infantry variants are approved. Change only the
warrior's equipment to a club without a shield. Pieces should read as fully
opaque. Make resting unit outlines much thinner, restoring a stronger outline
on hover. Hover must target the same owned unit as the existing badge and tile
selection conventions. Add direct model hover and click selection alongside
those routes, without changing action targeting, ownership, visibility or
stack cycling rules. Keep the approved enamel chess-piece art.

Implementation scope: production Renderer3D plus the actual-renderer units
fixture in Flair. No simulation or save changes. Diagnose the apparent
transparency rather than merely overriding already opaque material defaults.
Keep static board batching and cached geometry; hovering must not rebuild the
board or all units. Preserve unrelated approved art and the frozen 2D renderer.

Validation: focused geometry, rendered-unit picking, hover lifecycle and UI
selection tests; browser eye check of normal/hover silhouettes and opaque
overlapping equipment; root batch typecheck, core suite and build.

## Implementation

- Warrior retains its approved body, helmet and footprint, with one tapered
  wooden club and two small grip bindings. Other accepted sculptures are pinned
  by their existing geometry fingerprints.
- Unit rims use `units.outlineWidth` and `units.hoverOutlineWidth` in
  `data/view3d.json` (0.012 and 0.055 world units). Each bucket owns its width
  attribute; only the old and new hovered piece's wrap slots change. Moving
  pieces use the same widths. Terrain outlines are unchanged.
- The main piece materials were already opaque. The reversed-depth x-ray pass
  also admitted their own rear surfaces, flattening and tinting visible faces.
  Visible unit bodies now mark stencil after opaque scenery; the x-ray pass
  skips marked pixels. Painted postprocessing retains that stencil in its scene
  targets. Actual scenery occlusion can still show a positional silhouette.
- `resolveUnitPointerTarget` is shared by controls and Flair. Badge and tile
  hits preserve stack cycling; direct model hits and DOM garrison icons select
  the named eligible unit. Action modes and city assignment retain precedence.
- Model picking checks the actual live body triangles and wrap transforms.
  Hull outlines, badges and ghosts are excluded. Hidden and zero-scaled slots
  cannot be hit; nearby opaque scenery, including shader-hidden terrain props,
  is checked before accepting a model. Ownership is checked after the nearest
  visible body is found. Walking poses are also candidates.
- Panning, leaving the viewport, cancelled gestures, modes, fog, replacement
  state and camera jumps clear stale hover. Selecting a unit from Buy Tiles
  also clears that city mode.
- Flair allows hover/click selection without reframing the camera; its badge
  toggle remains available to inspect opaque equipment and headgear.

## Validation

- Typecheck and production build passed (exit 0).
- Full core suite passed: 6,486 tests in 229 files (exit 0).
- Focused tests cover opaque painted and fallback bodies, shared material
  lifetime, wrapped hover widths, exact model picking and scenery occlusion,
  actual control gestures/modes, and DOM garrison hover lifecycle.
- Browser: reviewed warrior club/no shield, solid overlapping surfaces, thin
  resting rims and stronger hover; clicked the model with badges hidden and
  verified selection without a camera jump. Main game loaded the existing save
  with no browser errors; no turn or game command was issued.
- Evidence: `.dream-loop/warrior-opaque-rest.png`,
  `.dream-loop/warrior-hover-selected.png`; gate logs use
  `.dream-loop/unit-interaction-*` (the final core log ends in `core-final`).

Review: `/flair.html?review=units&unit=warrior&light=golden&detail=close&owner=pachacuti&group=infantry`.
