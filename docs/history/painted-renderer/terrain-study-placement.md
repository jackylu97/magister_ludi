# Roads and territory — placement checkpoint

September 13, 2026. Art-review checkpoint visually approved, including roads
and two colours per civilization. Ready for the playable-game integration stage.

Open `terrain-study.html?review&view=placement&placement&settled&units&light=golden&owner=enamel`.
Controls → Roads & borders includes overview, road junction, hill road, city
entrance, border grove and border colour views. Each view persists in the URL with `detail`.
The examples use the existing seeded settlement neighbourhood and real generated
terrain. Road and ownership metadata are separate from simulation tiles.

## Placement and presentation

- A deterministic road graph connects the city gate with the worked land.
  Farm paths approach the small house yards; roads avoid resource models,
  buildings, staged units and discovery sites. Either side of a river edge
  blocks a road crossing. Shared segments are represented once.
- Narrow ochre paths have a subdued earth edge. Shared junction caps keep the
  inside colour continuous at branches and corners.
- Each civilization supplies a primary/secondary colour pair. The review uses
  Mithridates' Tyrian purple `#6b2d7a` and silver `#d8d8e0`, from `docs/leaders.md`.
  Two adjoining bands follow the same perimeter: primary outside, secondary
  inside. They share exact corner vertices; holes, disconnected ownership and
  neighbouring civilizations are supported. Same-owner city claims merge before
  tracing, so they do not produce internal borders. The bands are depth-tested,
  receive scene shadows, and are covered by trees,
  buildings and rocks. It is not a screen overlay.
- Both markings clip against the exact terrain triangles. They follow the
  broad hill faces and retain the same fit at distant detail levels. Only the
  small set of marked tiles retains its near surface tessellation at distance.
- Vegetation reserves road corridors before scattering. Border foliage stays
  present so the band can pass underneath it.
- Markings share the existing batched field material. They are built with the
  board; moving the camera does not rebuild geometry or the cached sun shadow.

`roadPlan.js` and `territoryPlan.js` produce world-space paths/polygons.
`surfaceMarkings.js` projects them onto supplied surface geometry;
`placementArt.js` supplies the current art treatment. The study's main module
owns only the fixture lifecycle and review controls.

## Verification

- `node scripts/terrain-study/check-territory-plan.mjs`: 554 geometry fixtures
  and 10 paired-owner scenarios; joined corners, holes, islands, containment,
  overlap, lattice transformations, neighbouring owners and colour-pair validity.
- `node scripts/terrain-study/check-road-plan.mjs`: real standard maps and unit
  plans; deterministic connected graphs, wet-edge restrictions on both sides,
  unique segments, footprint exclusions and unchanged game data.
- `node scripts/terrain-study/check-placement.mjs`: independent raycasts on
  three standard maps, with and without staged units. Samples road interiors
  and both border bands against the visible source terrain, including hill
  slopes. Checks the actual fitted mesh colour of each band as well as clearance.
- Production build and browser inspection of each named review view.

## Next stage

This fixture uses bounded study coordinates, staged ownership and a static
network. Game-state ownership, road construction/removal, fog, world wrapping,
animated-unit shadows and the real HUD remain part of playable integration.
River bridges are not modelled here; roads route around river crossings. The
territory pigment is drawn on land and is interrupted by exposed river water.

The existing game remains available while the new look is integrated behind
an opt-in switch. City sculpt tiers follow owner age; population independently
changes house count. Preserve those current rules during the city migration.
