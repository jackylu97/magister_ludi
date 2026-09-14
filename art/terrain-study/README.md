# Shelved unit studies

The live terrain study uses the primitive chess family in
`src/terrainStudy/primitiveUnitModels.js`, following the original lapis/enamel
memory table. The user chose this simpler direction on September 12, 2026.

These models are preserved for possible later work; the live page does not load
them and the production build does not publish them as public assets.

- `mounted-knight/horseman.glb`: the detailed horse and rider, 8,395 exported triangles.
- `mounted-knight/sculpture.blend`: separate authoring meshes for further sculpting.
- `mounted-knight/review-notes.md`: the earlier review and validation record, now historical.
- `sculpted-units/`: the later Blender infantry, spearman and horse-head chess studies.

The Blender authoring scripts remain in `scripts/terrain-study/`. Running
`build_settlement_assets.py -- --units-only` writes the sculpted studies here.
Adding `--mounted-study` regenerates the detailed knight into `mounted-knight/`.
Neither mode replaces the live primitive kit. The detailed scene validator and
turnaround renderer are retained for future use.
