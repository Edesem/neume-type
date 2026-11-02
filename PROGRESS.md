# Progress

## Done
- T1 (merged): Vite + React + TS scaffold, ESLint, Vitest, Playwright (Chromium in `node_modules/playwright-core/.local-browsers`, via `PLAYWRIGHT_BROWSERS_PATH=0`), Husky pre-commit running `npm run check` (typecheck, lint, unit, e2e), GitHub Actions with four jobs, private repo `Edesem/neume-type`.

- T2 (merged): `public/fonts/Neanes.otf` and `OFL.txt` from neanes/sbmufl at pinned commit, SHA-256 verified by unit test; `@font-face` in `src/ui/fonts.css`; Playwright confirms via CDP that U+E000 renders from Neanes (probe glyph in App; extend to all 61 in T3).
- T3 (PR open): `src/data/keymap.ts` transcribed mechanically from SPEC Appendix A (61 entries, `MODIFIERS` list). Unit tests pin 61 rows, unique ids/chords/code points, no trigger in modifiers, exact checks (J, S+L, Shift+R+K, Shift+=, =), and compare every row to the SPEC table. Playwright font test now covers all 61 (App shows a temporary glyph row). Fallback proof: with U+E000 temporarily set to U+E7FF the e2e test failed ("code points drawn as .notdef", received 59391), then reverted. CDP alone did NOT catch it (Chrome reports Neanes for a missing glyph), so the test also compares canvas pixels to .notdef.

## Next
- T4 Chord tracker, after T3 is reviewed and merged.

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
- Nothing yet.
