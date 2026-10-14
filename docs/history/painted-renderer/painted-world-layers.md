# Painted world layers

The user approved embarked boats and asked to move on. The next integration
batch brings the approved roads, discoveries and paired territory borders into
the painted main game. Caravan load art remains intentionally omitted.

- Roads follow the actual paved cells, including junctions and wrap seams.
  Their neutral painted ribbons sit on the terrain and remain behind scenery.
- Discoveries use the approved ruin, village, antiquity, wreck and raider-camp
  compositions. Existing technology gates, fog, standing markers and claim
  removal remain authoritative.
- Each empire's perimeter uses its primary and secondary colours, joined
  continuously and projected onto the terrain. Internal city boundaries vanish.
- These are independent, cached presentation layers. Road construction,
  pillage, site claims and border changes do not rebuild the terrain or mutate
  the simulation.
- Add a production-renderer review in Flair, including hills, water, shared
  borders, visibility and live removal checks. Validate with render tests,
  typecheck, core tests and production build before the visual checkpoint.

Status: approved by the user. Final gameplay/performance validation is next.

Production adapters reuse the approved site art and surface ribbons. Ground
geometry is clipped against actual terrain triangles, cached between fog
changes and merged in regions. Site props share the works layer's instancing,
wrap, fog and disposal code. Site and work reservations are combined so a claim
restores scenery without disturbing an adjacent improvement. River crossings
use a short flat span with each bank owning its own visible half.

Validation: typecheck and production build passed, and all 6,512 core tests in
232 files passed. Tests cover road facts and pillage, exact hill contact,
river-crossing joins, two inks, internal boundary removal, map wrapping, fog,
site technology gates, claims/camp removal, instancing and unchanged state.
Live inspection verified ground occlusion, ruins, hillside antiquities, camps,
water wrecks, claim/reveal changes, ownership merge and fog. No browser errors.
The existing large-chunk build advisory remains.

Review: `/flair.html?review=world&view=borders&light=golden`.
Build/test logs: `/tmp/world-typecheck.log`, `/tmp/world-core.log`,
`/tmp/world-build.log`.

## Final validation follow-up

The user approved the world-layer visuals. A main-game startup check exposed
an extended stall. Site layout currently calls the registered chunk raycaster
for every candidate in its placement search. Replace those repeated world
queries with the same local terrain triangles; verify equal surface contacts
and re-measure startup before making a frame-rate claim.
