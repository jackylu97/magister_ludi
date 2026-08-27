import { configDefaults, defineConfig } from 'vitest/config';

/**
 * The two tiers, selected by one environment variable.
 *
 * `npm run test` is the gate that runs after every change, so it must stay
 * short enough that nobody is tempted to skip it. What makes it long is a
 * handful of tests with a shape rather than a bug: a sweep over every seed and
 * size, a hundred-turn pacing simulation, a long byte-for-byte replay, a scale
 * fixture. Those live in a **sibling file** named `<concern>.slow.test.ts`
 * beside the concern's own `<concern>.test.ts`, so every concern keeps its fast
 * unit coverage in core and nothing is dropped from the suite.
 *
 * Selection is the suffix and nothing else — there is no list of slow files to
 * keep in sync, and a new sweep lands in the slow tier by being written in the
 * file its convention names. `TEST_TIER` picks which half runs:
 *
 *   - `core` (the default) — everything except `*.slow.test.ts`.
 *   - `slow` — only `*.slow.test.ts`.
 *   - `all`  — both, which is the pre-push gate (`npm run test:all`).
 *
 * Vitest's positional arguments are *filters* applied after this include/exclude
 * pair has collected the files, so `vitest run test/sim` composes with the tier:
 * the per-module scripts mean "core for that module". `test:stress` is the one
 * script that names `all`, because `test/stress/` is slow by nature and holds a
 * single `.slow.test.ts` — under `core` it would collect nothing and Vitest
 * treats an empty collection as a failure.
 */
// Declared rather than imported from `node:process`, for the same reason the
// build inputs below are relative paths: the tsconfig typechecks this file with
// only the DOM and Vite client libs, and one environment variable is not worth
// pulling `@types/node` into the project's type surface.
declare const process: { env: Record<string, string | undefined> };

const TIER = process.env.TEST_TIER ?? 'core';
const SLOW_GLOB = '**/*.slow.test.ts';

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
      // (see `src/abacusSpike/`), `mapgen.html` is the map inspection page (see
      // `src/mapgenPage/`) and `flair.html` is the art cabinet — every drawn
      // mark, flourish and city sculpt in isolation (see `src/flairGallery/`);
      // listing them keeps `npm run build` producing every page, and
      // `index.html` has to be repeated because naming any input at all
      // replaces the default. Paths are relative to `root`, which avoids
      // pulling `node:path` into a config the tsconfig typechecks with only the
      // DOM and Vite client libs.
      input: {
        main: 'index.html',
        proto3d: 'proto3d.html',
        pieces: 'pieces.html',
        abacus: 'abacus.html',
        mapgen: 'mapgen.html',
        flair: 'flair.html',
      },
    },
  },
  test: {
    environment: 'node',

    // Vitest replaces the contents of any `.css` import with an empty string
    // unless this is on — `?raw` included, which is the whole of why it is here.
    // `test/ui/cityScreen.test.ts` holds a rule that spans `style.css` and
    // `data/view3d.json` (the camera's city-framing bias is half the city
    // panel's width, and the two numbers live in different files), and this
    // project deliberately has no node typings, so `node:fs` is not the way a
    // test reads a source here — Vite's raw glob is, exactly as
    // `seatRoster.test.ts` reads `src/ui`. Nothing in the suite *imports* a
    // stylesheet for its side effect, so switching this on costs the collection
    // one stylesheet parse and changes nothing else.
    css: true,
    include:
      TIER === 'slow'
        ? [`test/${SLOW_GLOB}`, `src/${SLOW_GLOB}`]
        : ['test/**/*.test.ts', 'src/**/*.test.ts'],

    // `configDefaults.exclude` is what keeps `node_modules` and `dist` out;
    // spreading it rather than replacing it is why the tier can add one glob
    // without inheriting the job of listing the rest.
    exclude: TIER === 'core' ? [...configDefaults.exclude, SLOW_GLOB] : [...configDefaults.exclude],

    // `forks` is Vitest 2's default and is named here because the stress suite
    // depends on it: `test/stress/stress.slow.test.ts` bounds its work in CPU time
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
