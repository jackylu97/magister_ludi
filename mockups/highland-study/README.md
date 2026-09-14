# Highlands — terrain study

Fresh standalone plains/hill/mountain study based on the user's latest reference:
complex shaped rocks and architectural silhouettes, simple colours and shading.
No figures, room, cards or earlier aesthetic explorations. The game is untouched.

Open `/mockups/highland-study/` on the existing Vite dev server. Drag to orbit,
scroll to zoom, switch meadow/ochre palettes, or reset the camera.

Continuous deformed terrain, asymmetric ring-built rock meshes, small chamfered
buildings with dark doorway inserts, clustered broadleaf trees, cypress forms,
and instanced patch grass. Static terrain is batched by material. Shadows are
cached; pixel ratio capped at 1.5. Live triangle/draw figures describe the current
view, not full-game FPS. Not tested on a generated standard map.

This is a first composition and shape study, not finished asset art. Architecture
and rocks still need art-direction feedback before further modelling investment.

## Hex-world pass

37 axial hexes, narrow seams and visible cut sides. All top surfaces sample
the same height function so the rolling land joins across cells. Foliage and
paths are clipped to the patch. Added a compact columned sanctuary with steps,
pediment, open arch and broken column fragments. Still a composed scene, not
a game map generator.
