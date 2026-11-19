# Failed game startup and retry

A failed first Start returns to the landing form. It releases the renderer, workers, screens and event listeners created during that attempt. Begin can then build the interface again. Once startup succeeds, Restart and Load keep the interface and replace the game through `adoptGame`.

The board opens Faith with H, Diplomacy with W, Routes with E, Standings with S and In Play with I. Faith and Routes retain their access checks. An open screen handles its own keys. In Play closes itself on I. The board leaves text fields, editable content and the browser's modified S and I shortcuts alone.

## Browser check

Use a fresh browser session and intercept the Vite response for `src/main.ts` in the test browser. Insert a one-time exception immediately before the first `controls.refresh(initial === null ? 0 : resumeSeat(game.state))` inside `boot`. Count calls to the active renderer's resize method and commands issued by Shift-clicking End Turn. The injected exception and counters belong to the browser check only.

In Chromium with `?art=flat`, the first attempt reported the exception on the landing form. Begin succeeded on retry without a page reload. One resize event called the renderer once. Shift-clicking End Turn issued one End Turn command. W and S each opened their screen and a second press left it open. I opened and closed In Play. H and E kept the initial access checks. Restart reused the running interface. Loading the saved game restored its one command and its local seat.

The same forced failure on the painted board exposed a second problem. Three.js polled the ground texture's shader after the failed game released the material. Terrain preparation now starts the shader link with `renderer.compile`. The first draw uses the linked program. Repeating the test on the painted board produced no uncaught browser errors. Retry, shortcuts, resize, End Turn, Restart and Load all passed, including the saved command and local seat check.

## Automated checks

The focused tests passed for screen lifecycle, screen hotkeys, End Turn, board controls, Faith, Diplomacy, Routes, In Play, the empire drawer, the top bar, city and unit panels, info cards, refresh gates, the tech chart, notifications and the tutorial. The lifecycle test checks the same failure path that the browser exercised. The hotkey test sends keyboard events before and after aborting an attempt. Both TypeScript projects passed.
