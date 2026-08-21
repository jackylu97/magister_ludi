import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      // Dev serves any root HTML file, but the build only walks the entry
      // points it is told about. `proto3d.html` is the 3D look-dev prototype
      // (see `src/proto3d/`) and `pieces.html` is the piece gallery (see
      // `src/piecesGallery/`); listing them keeps `npm run build` producing
      // every page, and `index.html` has to be repeated because naming any
      // input at all replaces the default. Paths are relative to `root`, which
      // avoids pulling `node:path` into a config the tsconfig typechecks with
      // only the DOM and Vite client libs.
      input: {
        main: 'index.html',
        proto3d: 'proto3d.html',
        pieces: 'pieces.html',
      },
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
