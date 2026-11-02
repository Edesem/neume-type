# Progress

## Done
- T1 (merged): Vite + React + TS scaffold, ESLint, Vitest, Playwright (Chromium in `node_modules/playwright-core/.local-browsers`, via `PLAYWRIGHT_BROWSERS_PATH=0`), Husky pre-commit running `npm run check` (typecheck, lint, unit, e2e), GitHub Actions with four jobs, private repo `Edesem/neume-type`.

- T2 (merged): `public/fonts/Neanes.otf` and `OFL.txt` from neanes/sbmufl at pinned commit, SHA-256 verified by unit test; `@font-face` in `src/ui/fonts.css`; Playwright confirms via CDP that U+E000 renders from Neanes (probe glyph in App; extend to all 61 in T3).
- T3 (merged): `src/data/keymap.ts` transcribed mechanically from SPEC Appendix A (61 entries, `MODIFIERS` list). Unit tests pin 61 rows, unique ids/chords/code points, no trigger in modifiers, exact checks (J, S+L, Shift+R+K, Shift+=, =), and compare every row to the SPEC table. Playwright font test now covers all 61 (App shows a temporary glyph row). Fallback proof: with U+E000 temporarily set to U+E7FF the e2e test failed ("code points drawn as .notdef", received 59391), then reverted. CDP alone did NOT catch it (Chrome reports Neanes for a missing glyph), so the test also compares canvas pixels to .notdef.
- T4 (merged): `src/core/chord.ts` (`createChordTracker`, `attemptMatches`), no DOM imports. Tests named C1-C22 plus R6, R12, R13, R14 cases. Returns ignored/held/attempt with `preventDefault`; attempts carry trigger and logical modifier set. R15 (restart keeps held set) needs no tracker code: only `blur()` clears it; session in T5 must not touch the tracker on restart.
- T5 (PR open): `src/core/session.ts` (`createSession`, `sampleTargets`): injected random and clock, owns a chord tracker, `restart()` leaves held keys alone (R15), results rounded per SPEC. Tests: C1-C22 end to end, R15, criteria 3 and 4. Also closed three chord.ts test gaps (Shift tracking without `shiftKey` on events, repeat preventDefault, Shift resync to true); each verified by a mutation that now fails a test. Shared test script helper in `src/test-utils/keyScript.ts`.

## Next
- T6 Test screen, after T5 is reviewed and merged.

## Dependencies
- react, react-dom: UI.
- vite, @vitejs/plugin-react: dev server and build.
- typescript, @types/react, @types/react-dom, @types/node: types.
- vitest: unit tests.
- eslint, @eslint/js, typescript-eslint, eslint-plugin-react-hooks, globals: lint.
- @playwright/test: end-to-end tests.
- husky: pre-commit hook.

## Notes
- Dev server uses port 5273 (strict); 5173 was taken by another local process. Playwright never reuses an existing server.

## For the user to decide
- T4 gap (decided, easy to change): SPEC says auto-repeat is "ignored" (R7) but R13 says modifier/scored keydowns are prevented. I return kind ignored with preventDefault true for repeats of modifier/scored keys (stops Firefox quick find on a held `/`), and false for repeats of unscored keys.
- R2 (no timing) is satisfied by events carrying no timestamp; C8 is tested as S then L in sequence.
