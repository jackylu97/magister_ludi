# Discovery sites — visual checkpoint

September 12, 2026. Implemented in `terrain-study.html` for the next user eye check. The approved terrain, painted lighting, farms and city kit are preserved. Production renderer integration remains a separate stage.

## Coverage

- Ancient ruins: worn masonry arch, snapped columns and scattered architectural fragments.
- Tribal villages: clay and thatch longhouse with smaller round huts around a quiet yard.
- Buried antiquities: opened stone burial chest, displaced lid and inscribed ceremonial stele.
- Finds at sea: fractured open hull, exposed ribs, leaning broken mast and flotsam at the water datum.
- Barbarian camps: madder-red tents, timber lookout and an open stockade entrance.

The first four follow actual `tile.discovery` locations. Antiquities are revealed for this art preview; the game's prospecting and fog rules will be applied during integration. Barbarian camps are runtime GameState entities, so the settlement preview includes one explicitly staged camp on a clear tile. No simulation/mapgen data is edited, and settlement examples never overwrite generated discovery sites.

Controls → **Discoveries & camps** focuses each family. **Inspect site** lists every occurrence, including forest, hill and oasis placements. The camp follows the Settlement examples toggle; generated discoveries remain when that toggle is off.

## Placement and rendering

Nine small GLBs authored in Blender with the settlement kit's mineral grain and shared painted material. The new files total about 292 KiB. Component triangle counts range from 132 to 636. Geometry is loaded once and rendered through the existing near-chunk/far-board instance batches; there is no new animation loop, light, postprocess or per-frame placement work.

`siteLayout.js` performs deterministic, footprint-aware local placement. Rigid pieces are seated individually and have fitted foundations; neighboring vegetation and loose rocks respect their clearings. Oasis sites use reduced pieces on the dry banks, leaving the pool open. Ground markings are clipped to the existing terrain triangles. Wrecks use the common water level with the lower keel intentionally submerged.

`siteArt.js` handles site composition independently from the resource/improvement catalogue. This also keeps barbarian camps separate from hunting-camp improvements and from the city wall toggle.

## Verification

- `node scripts/terrain-study/check-sites.mjs`: three standard seeds, 239 generated discoveries plus three staged camps. Determinism, unchanged game data, discovery coverage, 827 land pieces and 20,675 real terrain footprint samples pass. All nine GLBs have finite geometry.
- `node scripts/terrain-study/check-settlements.mjs`: existing resource, farm-contour and city-asset regression checks pass.
- `npm run build`: passes; existing chunk-size advisory remains.
- Browser benchmark: standard 80×52 map, seed 1, settlements on, Daylight, Apple M4 / ANGLE Metal, 842×836 at DPR 1.5. Repeat run: all six phases median 16.7 ms; near views p95 17.6–17.7 ms. Fully zoomed-out panning still has occasional 32–33 ms frames (467 draws / 2.47M triangles). Zero camera-triggered shadow rebakes. The first overview run was slower, so this is a current-device result, not a claim of unchanged performance on every machine. Raw measurements: `.dream-loop/discovery-benchmark-first.json` and `.dream-loop/discovery-benchmark-final.json`.
- Visual review: all five families, an oasis village and hill ruins inspected in-browser. Independent visual review rated this checkpoint 9/10 against the approved style, with no blocking placement or silhouette issues. Optional later polish: more variation in wreck ribs and additional asymmetric wear on ruins.

Floating gardens are excluded from the remaining art scope at the user's direction. Next checkpoint after this eye check: unit-line bases. Roads, city borders, remaining improvements/city states and production gameplay integration remain subsequent work.
