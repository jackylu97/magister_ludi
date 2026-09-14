# Painted embarkation

The user approved the religious/caravan set, declined a separate loaded
caravan appearance, and requested embarked boats. Use the same painted wagon
for idle and trading caravans. Add one shared noncombat transport hull for
all land units afloat, retaining the original unit badge and owner pigments.
Naval ships keep their approved models. No simulation or trade rule changes.

Add an Embarked review group on real coastal water, including embark and
landfall examples with legal movement. Transport sculpts are cached/instanced;
resting, moving and falling pieces share the same resolver. Crossing the shore
must exchange the land piece and boat at the shore, rather than carrying the
destination sculpt across the entire move. Verify geometry/pigments, actual
movement, shore transitions, picking, fog and original sculpt fingerprints;
run typecheck, core and build before returning for visual review.

Implemented the shared `embarked` asset alongside the naval kit. Its broad
one-mast hull carries chests and a bench, with no oars, ram or cannon fittings.
It is a render-state key, not a new unit type. Original land identities remain
in badges and picking metadata. Naval types keep their own hulls. Painted
traders and Rihla caravans now ignore route state when choosing the wagon.
The legacy renderer is otherwise unchanged.

Painted walkers start with their departure terrain and exchange cached models
when the animated position crosses a tile shoreline. They reuse the same
walker between changes and restore the resting instance at completion. The
same resolver covers falling copies. Full shore tests cover embarkation,
landfall, no repeated mesh rebuild on one terrain, sea deaths and cleanup.
Flair’s Embarked group uses Sailing/Wayfinding and real movement commands.

Validation: all 6,506 core tests in 231 files pass; final typecheck and build
pass (the existing large-chunk advisory remains). The transport/boat mask,
shared instancing and individual pick IDs, unchanged trading wagons, legal
fixture movement, both shoreline transitions, sea deaths and original model
fingerprints are covered. Live review verified hull selection, settler embark,
warrior landfall and fog. No browser errors. Evidence:
`.dream-loop/embarked-transport-review.png`.

Review: `/flair.html?review=units&unit=embarked&group=embarked&light=golden&detail=close`.
Approved by the user. World-layer integration is the next checkpoint.
