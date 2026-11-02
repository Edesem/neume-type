# Progress

## Done
- T1 (merged): Vite + React + TS scaffold, ESLint, Vitest, Playwright (Chromium in `node_modules/playwright-core/.local-browsers`, via `PLAYWRIGHT_BROWSERS_PATH=0`), Husky pre-commit running `npm run check` (typecheck, lint, unit, e2e), GitHub Actions with four jobs, private repo `Edesem/neume-type`.

- T2 (PR open): `public/fonts/Neanes.otf` and `OFL.txt` from neanes/sbmufl at pinned commit, SHA-256 verified by unit test; `@font-face` in `src/ui/fonts.css`; Playwright confirms via CDP that U+E000 renders from Neanes (probe glyph in App; extend to all 61 in T3).

## Next
- T3 Keymap data, after T2 is reviewed and merged.

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
