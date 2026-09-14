# Memory table — study 01

Standalone art-direction maquette. Run the existing Vite dev server and open
`/mockups/memory-table/`. No game code or production assets are changed.

User direction (2026-09-11): focus on 3D terrain, pieces and highlighted borders;
hermetic, courtly, cabinet-of-curiosities, grandiose history, never grimdark.
Material character and ornament may extend into the world. The earlier art-pass
doc's texture-free world restriction is relaxed for this experiment. Sparse tarot
splash art remains a separate layer. User images guide colour and silhouette;
Messenger by Abeto is a reference for economical web graphics, not historical style.

This study tests lapis/vermilion pieces, warm carved material, ceramic land,
engraved water, a memory-theatre city, and brass vs beaded boundaries. Controls
allow close inspection and removal of decoration. It deliberately does not cover
map generation, gameplay readability at full map scale, production performance,
or a complete unit roster. No external assets or new dependencies are needed.

References: https://messenger.abeto.co/ ; Iranian astrolabe
https://www.metmuseum.org/art/collection/search/451699 ; Indian gilded chessmen
https://www.metmuseum.org/art/collection/search/200032 .

## Study 02 — living terrain

User requested richer terrain, graphic toon shading, bold plain borders and a
more lifelike wargame diorama. Removed brass/beaded boundary options. Added a
shared 128px procedural grain texture, sculpted terrain surfaces, clustered
trees, grass, rocks and continuous water. Static terrain merges by material;
shadow maps refresh on scene changes. Full-map performance is not benchmarked.
Study 01 geometry is preserved in `study-01.js` as a source reference.

## Study 03 — monumental pieces, miniature world

Reduced trees to roughly a quarter of the earlier scale and increased forest
density. Added clustered villages, farms, procession roads, an aqueduct,
river sections, sails, broken mountain ridges, capital stairs and obelisks.
The sovereign gains a tarot sun disc. Terrain additions remain batched by
material. These are authored compositions, not procedural gameplay systems;
full-map draw cost, distant readability and river continuity remain untested.

## Study 04 — two art directions

Use the Art direction links, or `?direction=lush` and `?direction=graphic`.
Lush uses denser forest and settlements, smooth textured materials, harbour
piers, garden terraces, stone scatter and a ruined sanctuary. Graphic uses
flat toon colour, untextured rounded groves, sparse settlements and matte
pieces. Both include subtle birds/cloud motion, disabled by Gentle motion
or reduced-motion preference. These are visual experiments, not optimized
production renderers. Prior benchmark numbers apply only to Study 03; the
`?benchmark` route imports its preserved source for reproducibility.

## Study 05 — divergent renderers

The detailed route uses physical materials, generated bump/roughness maps,
environment reflections, SSAO, perturbed rock forms, fluted garments and
arcaded architecture. The graphic route uses a four-step toon ramp, dark
shadow fill, silhouette hulls and geometric crease outlines. Rendering is
implemented in `render-treatment.js`. These experimental effects have not
been benchmarked and may require replacement for production.
