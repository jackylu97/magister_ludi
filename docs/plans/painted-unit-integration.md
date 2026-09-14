# Painted unit integration — September 14, 2026

User ruling: continue integration after folding in the upstream leader system.
Start the unit-line checkpoint with the twelve approved primitive chess pieces
and five great-person family emblems from `terrain-study-units.md`.

Bring these exact sculpts into the opt-in painted game and the Flair Cabinet.
Preserve their ivory/gilt details, paired owner colours, real lighting and cached
instancing. Keep the existing unit layer's fog, badges, health, builder charges,
selection, stack offsets, hiding/restoring, world wrap and gameplay contracts.
Stationary, moving and falling copies must resolve the same approved art;
embarked units and unapproved types retain their existing runtime sculpts for
this first review. No new naval/siege/leader model approval is implied.

Fit plinths and wagon wheels to actual terrain rather than a centre-height guess.
Place the approved pieces in a production-renderer review with game/detail zoom,
owner pairs, family variants, a hill, city occupancy and a movement check. Keep
the accepted terrain/city/works art intact. Unit integration finishes at an eye
check before the remaining model families and other world layers proceed.

## Implemented checkpoint

The twelve accepted representatives now render in the opt-in main game at
`/?art=painted&light=golden`. `paintedUnits.ts` packs the exact approved primitive
factory into cached indexed geometry. An owner mask recolours enamel while
preserving ivory and gilt; the existing painterly lighting hook remains active.
All five great-person appearances resolve through the real `Unit.person` family.

Resting instances, walking copies and falling copies use the same model resolver.
Paired leader colours and routed/hostile emphasis agree across those paths,
including the outline's linear-colour calculation. Falling copies preserve the
shader hooks on their private fading materials. Fog, badges, health, worker
charges, selection, hiding/restoring and three world-wrap copies retain the
existing unit-layer contracts.

`paintedUnitPlacement.ts` fits upright pieces from their rotated plinth underside
or wagon wheel contacts against the actual terrain triangles. Resting fits are
cached; moving fits sample at most 24 contacts. Wider stack offsets accommodate
the approved plinths, and badge anchors use the selected sculpture's height.
There is no per-frame sculpt or terrain rebuild.

## Review and evidence

Open `/flair.html?review=units&unit=warrior&light=golden&detail=close`.
This focused stall uses the production renderer with twelve representatives,
five great-person families, three actual leader colour pairs, city occupancy,
hill placements, game/detail zoom, selection, remembered terrain and a resettable
movement command. Its disposable fixture never changes a saved game. Changing
owners recolours the existing fixture without rebuilding its map.

Browser checks covered the warrior/spearman pair, cavalry, city stack, wagon on
hills, general family, owner changes, selection, actual one-hex movement and
remembered terrain hiding units. The existing Mithridates integration save also
resumed at turn 2; selecting the painted scout's badge opened its real orders
panel. No gameplay command was issued to that save during this checkpoint.
Screenshots: `.dream-loop/painted-units-main-game.png` and
`.dream-loop/painted-units-review.png`.

Validation: typecheck and production build pass. The full core suite passed all
6,428 tests across 223 files. After the final moving-outline correction, three
focused motion/falling tests and typecheck/build passed again. New adapter,
unit-layer, fixture and motion coverage checks actual packed geometry, owner
masks, shadow flags, fog, wrap/hide restoration, independent terrain raycasts,
all five family identities and shader/disposal behaviour. Existing piece/bar
regressions passed 112 tests. Logs are `.dream-loop/painted-units-*.log`.

## Limits and next review

This is the first unit integration review, not completion of all 61 roster IDs.
The remaining 49 IDs retain their existing models, as do embarked appearances
and laden traders. No new naval, siege or leader-specific sculpts are approved.
Rigid support checks terrain rather than building collision; the existing
centre-based movement/death placement conventions remain. Geometry is shared
and cached, but this checkpoint makes no new standard-map performance claim.

Next, after the user's eye check: review the remaining line and equipment
variants in bounded batches, followed by the other pending world-layer
integrations and the combined gameplay/performance review.
