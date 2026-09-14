# Approved time-of-day lighting

September 12, 2026. The user approved this pass before moving to resources and settlements.

The terrain preview now offers Original, Morning, Daylight, Golden hour and Dusk. Golden hour is the initial default; `?light=original` keeps the previously approved look available. Each preset is defined in `src/terrainStudy/daylightPresets.js`.

Painted lighting uses warm sun pigment, a broad cool fill family and cooler cast-shadow pigment. A gentle highlight shoulder retains colour on pale sand/stone. The existing grain remains attached to world-space surfaces. Water uses restrained separate sun gains so the map is not covered by an orange tint. Physical mode uses the same preset's directional light, hemisphere fill and environment intensity.

Changing a preset updates shared shader uniforms and existing lights. It does not reconstruct map geometry, add postprocessing passes or recompile each material. A changed sun direction requests one cached full-map shadow bake. Camera panning does not refit or repeatedly bake the shadow map.

The preview selector demonstrates discrete time-of-day looks. A continuous or turn-driven cycle, per-player clock semantics and production UI are not implemented. If added later, update colour uniforms freely but schedule sun-shadow rebakes deliberately; continuously moving the sun would undo the static-shadow performance benefit.
