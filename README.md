# Magister Ludi

*The Master of the Game.* A browser-based Civ V-style 4X. The board is a
tabletop diorama: low-poly
hex tiles under a warm sun, trees and rocks standing on them, units as turned
wooden game pieces, everything outlined and lit in three flat bands.

It is rendered in WebGL by `src/render3d/`. The two 2D canvas pipelines that came
before it still run — `?art=sprites` for the isometric sprite board, `?art=flat`
for the assetless debug one — but they are frozen: new visual work happens in 3D.

## Requirements

Node 18+.

## Run

```sh
npm install
npm run dev        # dev server on http://localhost:5173
npm run build      # production build into dist/
npm run preview    # serve the production build
npm run test       # vitest run
npm run typecheck  # tsc --noEmit
```

## Controls

Left selects, right orders. The full list is behind the `?` button in the corner
of the status card, and it is the same list as this one.

- Drag with either button to pan (the map wraps east–west forever); wheel or
  pinch to zoom toward the cursor.
- **Left click** one of your units to select it, again to cycle a stack. Left
  click anywhere that is not one of your own pieces to put the selection down.
  The parchment **badge** floating over a unit always selects it too, whatever
  the ground under it currently means — which is how a garrison is picked up
  while its city's screen has turned that ring into a citizen board.
- **Right click** a tile to send the selected unit there. With nothing selected,
  right click does nothing at all.
- `M` arms move mode, where the next *left* click issues the move instead — the
  trackpad path, for anyone without a comfortable right click. The cursor turns
  to a crosshair and the selected unit's ring brightens while it is armed.
- Select a settler and press **Found City** or `B` to plant a city.
- Click one of your cities — on the board or on its banner — to open its screen:
  yields, growth, and a production queue you can add to, reorder and trim. The
  dots on the map are the tiles its citizens are working.
- `T` — or the research card, top left — opens the star chart. `A` — or
  **Abacus** in the bar — opens the Abacus: the score as a counting frame on the
  table, one rod per player and one bead per point. No bead is earned yet;
  scoring arrives with M11.
- `Esc` backs out one layer at a time: move mode, then an open popover, then the
  city screen, then the selection. `Enter` ends the turn (`G` toggles the hex
  grid in 2D).
- Hover a tile to see its terrain, feature, yields and coordinates in the context
  card, bottom-left. It is only on screen while it has something to say.
- The `☰` button opens game setup: a seed (number or word), a map size, **New
  Game**, and **Shadows**, which can be switched off if the frame rate hurts —
  it rebuilds the board.
- `?art=sprites` brings back the 2D isometric sprite renderer and `?art=flat` the
  flat-colour debug one — both exactly as they behaved before the 3D view landed.

## Layout

- `src/sim/` — pure simulation. No DOM, no canvas, no randomness beyond the
  seeded PRNG in `src/sim/rng.ts`. Knows nothing about the isometric view.
  `cities.ts` holds the whole of what a city is — territory, citizens, yields,
  growth, production and borders — and `turn.ts` is the order those rules run in.
- `src/render3d/` — the WebGL renderer: the board's instance buffers
  (`board3d.ts`), the toon and outline materials (`toon.ts`), closed-form picking
  (`picking.ts`), the fixed-angle camera (`camera3d.ts`), overlays, pieces and
  move animation. Reads simulation state, never mutates it.
- `src/render/` — the frozen 2D canvas pipeline. Reads simulation state, never
  mutates it. All per-tile art goes through `src/render/tileVisuals.ts`; the
  vertical squash and the elevation offsets live in `src/render/projection.ts`.
- `src/proto3d/` + `proto3d.html` — the look-dev sandbox the 3D view grew out of.
  No interaction, no wrap; a page for judging a palette and a light rig.
- `src/ui/` — pointer and keyboard handling (`controls.ts` owns the whole input
  contract above), the city screen, the tech screen (`techTree.ts`: the star
  chart, the one deliberately dark surface in the interface), the city banners,
  the HUD popovers, and `mapView.ts`: the small interface both renderers
  implement, so input logic knows about neither.
- `data/` — terrain, unit, building, technology, rules and map-generation data as
  JSON, plus `view3d.json` (the 3D look: palette, tile heights, lights,
  overlays) and `view.json` (the same job for the frozen 2D renderer).
- `public/sprites/` — vendored Kenney art, CC0. See its `CREDITS.md`.
- `test/` — Vitest tests for the simulation and for the pure parts of the
  renderers: the 3D picking round-trip (every tile of a map, projected through
  the camera and picked back, at several zooms and across the wrap seam), the
  move-animation arithmetic, the 2D projection round-trip, the sprite manifest.

## Tuning the look

`data/view3d.json` is meant to be edited by hand while the dev server is running.
Nothing in `src/render3d/` writes a tunable literal, so a value there is the only
place a given number exists. The ones worth playing with first are `palette`
(fifteen colours, and every material in the scene is one of them or a mechanical
derivation of one), `board.height` (how tall the elevation steps are),
`look.outline`, `look.rampSteps` and `lights.*`.

Two constraints the file cannot check for itself. Keep `board.height` values
inside a range of about one hex radius: picking intersects those planes and its
error at a cliff edge grows with the tallest step (see `src/render3d/picking.ts`).
And keep `board.tileGap` non-zero — the grout line it opens between tiles is
what makes the board read as pieces on a table rather than an extruded heightmap.

`data/view.json` does the same job for the frozen 2D renderer.

Its own unwritten constraint: keep the rises below roughly
`0.5 · baseSize · squash`, or a raised face will reach up far enough to clip the
base of a tree standing on the tile behind it. See the painter's-order note in
`src/render/terrainCache.ts`.
