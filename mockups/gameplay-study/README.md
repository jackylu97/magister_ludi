# Gameplay art study

Standalone visual treatment based on the accepted hex terrain study. No live game
code or save files are changed. Run Vite and open `/mockups/gameplay-study/`.

Grounded in game conventions:
- Hex radius 1; orthographic camera at the elevation/azimuth in data/view3d.json.
- One city centred on one hex, surrounding territory, population and production label.
- Selected Warrior on an adjacent hex, badge and ground selection ring.
- Warrior strength and movement imported from data/units.json.
- Grassland, plains, desert, coast/ocean, forest features and discrete raised hill tiles and mountain sculpts.

Authored example, not simulation: Uruk's population 3 and Granary production are
illustrative. Territory, improvements and mixed biomes are composed for comparison,
not obtained from mapgen or validated game commands. No fog, end-turn processing,
pathfinding or real selection commands. Hover raycasts the displayed tile-top meshes. The small map uses its own zoom framing; camera angles
match the game. The city and piece are proposed replacement art, not current assets.

Rendering: static material batches, shared instanced vegetation, cached shadows.
The live draw/triangle counter reports this scene only, not full-board performance.

## Hill readability pass

Flat tiles are level at 0.22. Explicit hill tiles have a slightly raised rim at 0.40
and a rounded asymmetric crown rising approximately another 0.78 units. The crest
leans toward the light to expose a broader shaded slope; water remains at 0.04 world units. Six hills include bare and forested examples.
Surface colour still describes the biome; the raised crown describes hills.
Hover reads the explicit hill state through raycast tile tops.

Territory borders use a single flat ribbon mesh with shared miter joins, inset
inside the territory perimeter and sampled against the terrain. Depth testing
lets trees, rocks and buildings occlude the line. No screen overlay or tubes.

The HUD study imports the production `src/style.css`, yield mark renderer and
dock icon artwork. Research, resource strip, unit sheet and End Turn use the
existing UI classes with sample state; actions show a preview notice rather than
dispatching game commands. Warrior strength/movement come from the unit data.
Hide HUD compares the terrain with/without the panels; close the unit sheet and
click the warrior badge to reopen it. The narrow-screen unit sheet moves lower
and uses a compact action row to avoid covering the selected piece. Production
UI files and game behaviour are unchanged.

## Standard-size rendering benchmark (2026-09-11)

Run `?benchmark` to repeat. Results saved in `benchmark-results.json`.
Apple M4 MacBook Air, 16 GB; Chromium/Metal; 1440×900 render size at DPR 1.5
(2160×1350 buffer). 45 warm-up frames and 180 measured frames per case with
camera panning. All runs stayed visible. This is a short scaling experiment.

113 shared-geometry copies of this 37-tile scene produce 4,181 tile equivalents,
versus Standard's 80×52 = 4,160. Play and regional views held 60fps; full-board
view averaged 43.7fps, p95 33.4ms, 2,939 draws and 5.48M triangles. Normal view
peaked at 193 draws / 397k triangles. CPU submit p95 rose from 3.2ms to 24.7ms
at full-board zoom; these are not GPU timings. No console errors.

This does NOT measure generated-map assembly, unique-map memory, full simulation,
full-map picking, fog, or all future assets. Shared repeated geometry is optimistic
for memory; repeated cities/outcrops are not realistic biome distribution. Shadows
use the current small fixed frustum, not world-wide coverage. Initial CPU render
submission is not a complete load-time measurement. Benchmark does not refresh
projected DOM labels, and the HUD is static. Results do not establish low-end or
mobile performance. Chunk batching and distant-detail reduction should precede
production rollout; a real-map benchmark remains required after integration.
