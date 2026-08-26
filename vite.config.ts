import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      // Dev serves any root HTML file, but the build only walks the entry
      // points it is told about. `proto3d.html` is the 3D look-dev prototype
      // (see `src/proto3d/`), `pieces.html` is the piece gallery (see
      // `src/piecesGallery/`), `abacus.html` is the victory-scoreboard spike
      // (see `src/abacusSpike/`) and `mapgen.html` is the map inspection page
      // (see `src/mapgenPage/`); listing them keeps `npm run build` producing
      // every page, and `index.html` has to be repeated because naming any
      // input at all replaces the default. Paths are relative to `root`, which
      // avoids pulling `node:path` into a config the tsconfig typechecks with
      // only the DOM and Vite client libs.
      input: {
        main: 'index.html',
        proto3d: 'proto3d.html',
        pieces: 'pieces.html',
        abacus: 'abacus.html',
        mapgen: 'mapgen.html',
      },
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],

    // `forks` is Vitest 2's default and is named here because the stress suite
    // depends on it: `test/stress/stress.test.ts` bounds its work in CPU time
    // (`process.cpuUsage`), and `process` in a *worker thread* is the whole
    // process — every sibling worker's CPU would be charged to the measurement.
    // One child process per worker is what makes that reading the worker's own.
    pool: 'forks',
    poolOptions: {
      forks: {
        // A worker keeps its module graph from one test file to the next
        // instead of tearing the whole registry down and re-evaluating every
        // import. This suite can afford it, and the reason is a property of the
        // code rather than luck:
        //
        //   - `src/sim/` is pure and its data tables (`RULES`, `MAPGEN_CONFIG`,
        //     the resource/tech/unit rows) are read-only at runtime. The one
        //     helper that edits a table, `withExtraResources`, restores it in a
        //     `finally`.
        //   - `INSTANCE_WRITES` (`src/render3d/instances.ts`) is the one mutable
        //     module singleton the tests read, and it is an accumulator every
        //     assertion opens with `resetInstanceWrites()` — a leftover count
        //     from the previous *file* is zeroed by the same call that zeroes a
        //     leftover count from the previous *line*.
        //   - Nothing anywhere calls `vi.mock`, `vi.stubGlobal` or writes to
        //     `globalThis`, so there is no per-file global to unwind.
        //
        // It also lets the mapgen memo table (`test/mapgen/fixtures.ts`) span
        // the whole directory rather than one file, which is where most of what
        // this bought comes from. A test that ever *does* need a virgin module
        // graph is the signal to turn this back on rather than to work around
        // it.
        isolate: false,
      },
    },
  },
});
