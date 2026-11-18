# Audit

Audited `main` at `5a1ddc4` on 2026-11-11. No code was changed. Every finding is confirmed by reading the code or running a command unless it is labelled **suspected**.

**Headline:** the codebase is small (about 1,000 lines of source, 1,500 of tests) and in good shape. All checks pass, and there are no critical or high findings. The 21 findings are four medium and seventeen low. The pattern behind most of them is the same: a later agent added something next to what an earlier agent built, instead of replacing or reusing it.

## 1. Architecture summary

A local-only single-page app with no backend, network calls, storage, environment variables or secrets.

| Layer | Files | Role |
|---|---|---|
| Data | `src/data/keymap.ts` | 61 keymap entries (chord, code point, pitch, frequency) and the `MODIFIERS` list. No logic. |
| Core | `src/core/chord.ts` | Turns plain key events into `ignored`, `held` or `attempt`; owns the held-key set. |
| | `src/core/session.ts` | Draws 20 targets, scores attempts, runs the clock, computes results, owns the hint flag. |
| | `src/core/weights.ts` | Weighted chances with a floor. |
| | `src/core/random.ts`, `format.ts`, `shortcut.ts`, `keyLabel.ts` | Seeded PRNG, result formatting, shortcut text, debug key label. |
| UI glue | `src/ui/store.ts` | Framework-free. Attaches `keydown`, `keyup`, `blur`, `visibilitychange` listeners, forwards to the session, publishes snapshots. |
| UI | `src/ui/App.tsx`, `src/main.tsx` | React view via `useSyncExternalStore`. `main.tsx` is the entry point and reads `?seed=N` and `?debug`. |
| Styles | `src/ui/fonts.css`, `src/ui/look.css` | Font face and look. |

**Data flow:** window key event → `store.ts` → `session.handle` → `chord.ts` tracker → attempt scored against `targets[index]` → `store` publishes a snapshot → `App` re-renders.

**Build, run, test:** Vite dev server on port 5273 (strict). Vitest runs `src/**/*.test.ts`. Playwright runs `e2e/` in Chromium against its own dev server. A Husky pre-commit hook runs `npm run check`. GitHub Actions runs type-check, lint, unit and e2e as four jobs.

**Where the code and the docs disagree**

- `SPEC.md` section 3 says a wrong attempt should "flash the error colour". The colour stays until the neume is entered correctly (A18).
- `CLAUDE.md` says the builder self-merges after approval. `ORCHESTRATION_LOG.md` records that the main session did every merge.
- `CLAUDE.md` lists neither `npm run build` nor `npm run screenshots`, and its layout omits `src/test-utils/`, `e2e-screenshots/` and `docs/` (A19).
- `CLAUDE.md` says core has no React or DOM imports. That is true today, but nothing enforces it (A17).
- There is no README.

## 2. Check results

| Check | Command | Result |
|---|---|---|
| Type-check | `npm run typecheck` | Pass |
| Lint | `npm run lint` | Pass, no warnings |
| Unit tests | `npm test` | Pass: 126 tests in 11 files |
| End-to-end | `npm run e2e` | Pass: 27 tests, 4.1 s |
| Build | `npm run build` | Pass (this created the git-ignored `dist/`) |
| End-to-end with `npm run dev` running | `npx playwright test` | **Fail**, see A1 |

Missing:

- `npm run build` is not part of `npm run check` or CI (A21).
- `e2e-screenshots/` is not type-checked (A9).
- `npm audit` was not run, because it needs the network.
- No skipped tests, `eslint-disable` comments or `@ts-ignore` exist.

## 3. Findings

### Medium

**A1. The pre-commit hook fails whenever the dev server is running** (medium, S)

- Where: `playwright.config.ts:5-9`, `vite.config.ts:6`, `.husky/pre-commit:1`
- What: Playwright starts its own server on port 5273 with `reuseExistingServer: false`, and Vite uses `strictPort: true` on the same port. With `npm run dev` open, every commit is rejected.
- How I know: with a dev server running, `npx playwright test e2e/keypress.spec.ts` exits 1 with `Error: http://localhost:5273 is already used`.
- Root cause: the T1 builder chose one port and a hermetic test server. Agents never keep a dev server open while they commit, so no agent hit it. A human will hit it at once.
- Fix: give Playwright its own port, for example `command: 'npm run dev -- --port 5274'` with matching `url` and `baseURL`.

**A2. The lost-keyup wiring in the store has no test** (medium, S)

- Where: `src/ui/store.ts:75-82` (blur and `visibilitychange` listeners), `src/ui/store.ts:35-44` (`shiftKey` and `isComposing` forwarding)
- What: SPEC rule R14 is tested in core (`session.blur()`), but nothing tests that a window `blur` or a hidden page reaches it. Deleting lines 81-82 would leave all 153 tests green.
- How I know: `grep -rnE "blur|visibility|isComposing|shiftKey" src/ui/store.test.ts e2e` returns only the unrelated button-blur test. I did not run the mutation, because the audit may not change code.
- Root cause: C20 was specified as a core unit test, so the T6 builder satisfied it there and tested only the store paths its own task named.
- Fix: add store tests that dispatch `blur` and `visibilitychange` (with a fake document) between a modifier keydown and a trigger, and one that sends `isComposing: true`.

**A3. Two state fields track the same fact** (medium, S)

- Where: `lastWrong` in `src/ui/store.ts:7,54,60-66`; `hintVisible` in `src/core/session.ts:25,74,116,120`; both used in `src/ui/App.tsx:28,36`
- What: both become true on a wrong attempt and false on a correct attempt or restart. I traced every transition, including modifier presses and keys on the results screen, and they never differ. The store computes its copy by comparing `errors` before and after each key, because `session.handle` returns the chord result and not the outcome.
- Root cause: T6 put the flag in the store. T9 was built by a fresh agent, which correctly put the hint flag in core and did not notice the store already had the same thing.
- Fix: delete `lastWrong` and drive `data-error` from one core field (rename `hintVisible` to something neutral such as `lastAttemptWrong`).

**A4. The core model assumes one 61-entry set, 20 neumes, and that a modifier is never a trigger** (medium, L)

- Where: `src/core/chord.ts:82-92`; `src/core/session.ts:5,89,95-96,109,117`; `e2e/*.spec.ts` (`i < 20`, `toHaveCount(61)`)
- What: this is the main obstacle to the next features. Three parts:
  1. A modifier keydown returns `held` and can never be an attempt. SPEC R6 already notes that `B` alone is Haplē in Neanes. Qualitative characters cannot be added without changing this rule.
  2. `sampleTargets` takes a `count`, but the session decides "done" and accuracy from the constant `TEST_LENGTH`, not from `targets.length`. A different test length needs edits in four places.
  3. Tests hard-code 20 and 61 in many places.
- Root cause: the spec scoped the prototype to exactly this, and each builder implemented its task literally. No task asked for room to grow.
- Fix: this needs an owner decision on how a lone modifier is scored (for example on keyup with no trigger in between). Then derive length from `targets.length` and move 20 and 61 in tests to imported constants.

### Low

**A5. Key-name knowledge is written in five places and has drifted** (low, S)

- Where: `src/core/keyLabel.ts:1-4`; `src/core/shortcut.ts:3-15`; `src/test-utils/keyScript.ts:6-9`; `e2e/helpers.ts:6`; `e2e/test-screen.spec.ts:4`; `src/core/chord.ts:33`
- What: `keyLabel` and `shortcut.ts`'s private `keyName` both turn `KeyJ` into `J`, with the same regular expression. Only `keyName` knows punctuation: `keyLabel('Semicolon')` returns `Semicolon`, while the hint shows `;`. "Shift means ShiftLeft or ShiftRight" is encoded four times.
- Root cause: `keyLabel` came from T1's trivial test. T9's fresh builder wrote `keyName` without finding it, and kept it private so nobody else could reuse it.
- Fix: export one code-to-label function and one Shift mapping from core, and use them everywhere. If A13 removes the debug line, delete `keyLabel.ts`.

**A6. The key-script test helper silently invents key codes** (low, S)

- Where: `src/test-utils/keyScript.ts:26`
- What: any single character not in `NAMES` becomes `Key<char>`. Running the real function gives `script(['↓.', "↓'", '↓5', '↓['])` → `Key.`, `Key'`, `Key5`, `Key[`. The tracker ignores these codes, so a test that expects "ignored" or "no match" would pass for the wrong reason.
- How I know: executed the module. No current test uses an affected key, so nothing is wrong today.
- Root cause: the helper was written for the keys in C1 to C22 only.
- Fix: accept only A to Z for the `Key` fallback, map the remaining punctuation and digits, and throw on anything unknown.

**A7. `e2e/test-screen.spec.ts` keeps its own copies of four shared helpers** (low, S)

- Where: `e2e/test-screen.spec.ts:4-22` duplicates `physical`, `currentTarget`, `currentIndex` and `typeChord` from `e2e/helpers.ts:6-35`
- What: the copies are still identical. The next change to one will not reach the other.
- Root cause: T8 extracted the helpers as a "pure refactor" for the files it was touching and left T6's file alone.
- Fix: import from `./helpers` and delete the local copies.

**A8. A test named for timing asserts only accuracy** (low, S)

- Where: `e2e/results.spec.ts:83-88`
- What: `a fresh run after restart is timed from its own first attempt` checks only that accuracy is `100.0%`. If restart stopped resetting the clock, this test would still pass. The clock reset is covered in unit tests only, as `ORCHESTRATION_LOG.md` admits.
- Root cause: the page shows no clock value the agent could assert on, so it asserted what was available and kept the intended name.
- Fix: assert that the second run's `result-time` is below the wall time measured since the restart click, or rename the test to what it checks.

**A9. `e2e-screenshots/` is not type-checked** (low, S)

- Where: `tsconfig.json:14`
- How I know: `npx tsc --noEmit --listFiles` lists every `e2e/` file and no `e2e-screenshots/` file. ESLint does cover it.
- Root cause: the directory was created during T10's review fix, and the builder did not revisit the config.
- Fix: add `e2e-screenshots` to `include`.

**A10. The screenshot script guards the wrong neume** (low, S)

- Where: `e2e-screenshots/capture.spec.ts:6,9,11-12`
- What: the seed is chosen so target 0 is not Ison, but the deliberately wrong `J` is pressed at target 3, after three correct chords. It works today only because seed 1's fourth target is `oligonElafronApostrofos`. If the draw changes and target 3 is Ison, `hint.png` will show no hint, and nothing will fail.
- Root cause: the predicate was copied from `e2e/hint.spec.ts`, where the wrong key is pressed at target 0.
- Fix: test `t[3]` in the predicate and assert the hint is visible before taking the screenshot.

**A11. Chances are indexed by pool position, but tests index them by keymap position** (low, S)

- Where: `src/core/weights.ts:46-48`; `src/core/session.ts:47-49`; `src/core/weights.test.ts:112-129,137-146,165-176`; `src/core/session.test.ts:7`
- What: `neumeChances` drops unverified entries and returns a shorter array. `sampleTargets` filters the same way before calling it, so the filter runs twice. Tests pair `chances[i]` with `keymap[i]`. That is right only because all 61 entries are verified (`src/data/weightsDoc.test.ts:60-62` pins this). `CLAUDE.md` requires unverifiable shortcuts to be marked `unverified`; the first one will shift every later index.
- Root cause: T12 added the filter to `neumeChances` defensively, without seeing that the only caller had already filtered.
- Fix: export one `drawPool(entries)` helper, make `neumeChances` take an already filtered pool, and have tests look chances up by entry.

**A12. Two impossible inputs give silent wrong answers** (low, S)

- Where: `src/core/weights.ts:24-43`; `src/core/session.ts:54-55`
- How I know: executed. `applyFloor(Array(401).fill(1))` returns chances that sum to 1.0025, because 401 × 0.25% is over 100%. `sampleTargets(() => 0.5, [], 2)` returns `[undefined, undefined]`.
- What: neither can happen with 61 verified entries. Both become reachable as the keymap grows or entries are marked unverified.
- Root cause: the spec named the edge cases to handle (`random()` of 0 and just below 1) and the builder handled exactly those.
- Fix: throw a clear error for an empty pool and when `count × floor > 1`.

**A13. Debug scaffolding from T1 runs on every key press** (low, S)

- Where: `src/ui/store.ts:8,63-70`; `src/core/keyLabel.ts`; `src/ui/App.tsx:55-59`; `e2e/keypress.spec.ts`
- What: the store updates `lastKey` and publishes a new snapshot on every keydown, including ignored keys and auto-repeats, which re-renders the app. The value is shown only with `?debug`, and its only consumer is T1's "trivial" Playwright test.
- Root cause: T1 needed one trivial e2e test. T6's review asked for the line to be hidden, so the builder hid it instead of removing it.
- Fix: remove `lastKey`, `keyLabel.ts` and `e2e/keypress.spec.ts` (`e2e/test-screen.spec.ts` covers key input). This deletes a test, so the owner must approve it first, as `CLAUDE.md` requires. Otherwise publish only when the session state changes.

**A14. Unused exports and options** (low, S)

- Where: `src/core/session.ts:127` (`Session` type, never imported); `src/core/session.ts:35` (`SessionOptions.entries`, never passed by any caller or test); `src/core/format.ts:3-7` (`FormattedResults`, while `src/ui/App.tsx:74` rewrites the same shape inline)
- How I know: grep across `src`, `e2e` and `e2e-screenshots`.
- Root cause: builders exported things "for later", and T8 typed the view's props by hand instead of importing the type it had just written.
- Fix: delete the two unused items and import `FormattedResults` in `App.tsx`.

**A15. Styling has no single convention** (low, M)

- Where: `src/ui/fonts.css:7-11`; `src/ui/look.css:4-5,43,50-57,74,79-86`
- What:
  - `.neume` is styled in two files (size and line height in `fonts.css`, box and colours in `look.css`).
  - `look.css` uses `data-testid` attributes (`row`, `hint`, `done`) as style selectors, so renaming a test id breaks the layout.
  - After T13, `--done` colours only buttons and `--untyped` colours only labels, while neume states use `--neume-done` and `--neume-todo`.
- Root cause: T10 was told "CSS only, markup unchanged", so it used the only hooks that existed. T13 added variables instead of renaming, to keep its diff small.
- Fix: add class names in `App.tsx`, keep only `@font-face` in `fonts.css`, and rename the variables by use (for example `--text-muted`, `--text-button`).

**A16. Tests that check repo files are placed and written inconsistently** (low, S)

- Where: `src/core/fontFiles.test.ts:9,15`; `src/data/keymap.test.ts:74`; `src/data/weightsDoc.test.ts:14`
- What: `fontFiles.test.ts` sits in `src/core` but tests nothing in core. It and `keymap.test.ts` read files relative to the working directory; `weightsDoc.test.ts` uses `import.meta.url`. The first two break if Vitest is started from another directory.
- Root cause: three tasks (T2, T3, T12) each solved "read a repo file in a test" on their own.
- Fix: move `fontFiles.test.ts` next to the data tests and use `import.meta.url` in all three.

**A17. The core boundary is kept by convention only** (low, S)

- Where: `tsconfig.json:4,12`; `eslint.config.js:10-15`
- What: one TypeScript config gives every file the DOM library and Node types, and no lint rule restricts imports. `src/core` and `src/data` are clean today (grep for `window`, `document`, `react` finds nothing outside tests), but a DOM or React import there would pass every check. This matters because the owner is weighing a Vue rewrite that depends on core being portable.
- Root cause: the rule lives only in `CLAUDE.md`, and reviewers checked it by reading.
- Fix: add an ESLint override for `src/core/**` and `src/data/**` with `no-restricted-imports` (react, react-dom, `../ui`) and `no-restricted-globals` (`window`, `document`).

**A18. The spec says "flash"; the error colour stays** (low, S)

- Where: `SPEC.md:20`; `src/ui/look.css:69-72`; `src/ui/App.tsx:28`
- What: the current neume stays red until it is entered correctly. There is no animation or transition in the CSS. The owner played this version and accepted it.
- Root cause: T6's task text said "error states", and the builder followed the task instead of the spec sentence.
- Fix: change the SPEC sentence to match, or add a short CSS animation. Owner's choice.

**A19. Docs have drifted from the repo** (low, S)

- Where: `CLAUDE.md` (commands table, layout, workflow); `PROGRESS.md:18-19`
- What: see the list in section 1. Also, `PROGRESS.md` records T11 under "Next" instead of "Done".
- Root cause: each task updated `PROGRESS.md` only. No task owned `CLAUDE.md`.
- Fix: add the two commands and three directories to `CLAUDE.md`, correct the merge rule to what happens, and move T11 to "Done".

**A20. Suspected: a letter modifier can stick after a Cmd shortcut on macOS** (low, S, suspected)

- Where: `src/core/chord.ts:70-80`
- What: macOS browsers do not send `keyup` for other keys released while Cmd is held. The sequence hold `S`, press Cmd, release `S`, release Cmd would leave `KeyS` in the held set, so every later attempt is judged as `S + key` until the window loses focus. Shift is resynced from `event.shiftKey` on each keydown; letter modifiers have no such resync.
- How I know: by reading the code against known macOS behaviour. Not reproduced: Playwright sends synthetic events and cannot show this.
- Root cause: R14 in the spec lists blur, visibility and Shift, and the builder implemented that list.
- Fix: reproduce by hand first. If real, clear the non-Shift held keys on any keydown that has `metaKey` set.

**A21. The production build is in no check** (low, S)

- Where: `package.json:8,13`; `.github/workflows/ci.yml`; `.husky/pre-commit:1`
- What: `npm run check` runs type-check, lint, unit and e2e. `npm run build` is run by nothing, so a change that breaks only `vite build` would reach `main`.
- How I know: read the scripts and the workflow. The build passes today.
- Root cause: the brief listed four checks, and the e2e tests run against the dev server, so no task ever needed the build.
- Fix: add `npm run build` to `check` and add a CI job for it.

## 4. Checked and found sound

- All 61 keymap rows match SPEC Appendix A (unit test), and the font and licence hashes match.
- The Weight, Chance and Shortcut columns of `docs/neume-weights.md` are not covered by a test. I recomputed all 61 rows from the real code: 0 differences, and 22 entries at the floor as documented.
- Security: no secrets, network calls, storage, HTML injection or environment variables. The only external inputs are `?seed` (passed through `Number`; junk becomes seed 0) and `?debug` (presence only).
- Every dependency in `package.json` is used and is listed in `PROGRESS.md`.
- The store attaches listeners once, outside React, so StrictMode cannot double-count keys.

## 5. Fix plan

The four chunks in step 2 own separate files, apart from the one overlap noted below the table, and can run in parallel after chunk 1.

| Step | Chunk | Findings | Files owned |
|---|---|---|---|
| 1 | Tooling | A1, A9, A21 | `playwright.config.ts`, `tsconfig.json`, `package.json`, `.github/workflows/ci.yml` |
| 2 | Store and view state | A2, A3, A13, A5 (the `keyLabel` half), A14 (the `App.tsx` half) | `src/ui/store.ts`, `src/ui/store.test.ts`, `src/ui/App.tsx`, `src/core/keyLabel*.ts`, `e2e/keypress.spec.ts`; the `hintVisible` rename in `src/core/session.ts` |
| 2 | End-to-end tests | A7, A8, A10 | `e2e/test-screen.spec.ts`, `e2e/results.spec.ts`, `e2e/helpers.ts`, `e2e-screenshots/capture.spec.ts` |
| 2 | Core helpers | A6, A11, A12, A14 (the `session.ts` half), A5 (export `keyName` and the Shift mapping) | `src/core/weights*.ts`, `src/core/shortcut*.ts`, `src/test-utils/keyScript.ts`, and in `src/core/session.ts` only `sampleTargets`, `SessionOptions` and the `Session` export |
| 2 | Docs and guard rails | A16, A17, A18, A19 | `CLAUDE.md`, `SPEC.md`, `PROGRESS.md`, `eslint.config.js`, `src/core/fontFiles.test.ts`, `src/data/*.test.ts` |
| 3 | Styling | A15 | `src/ui/*.css`, class names in `src/ui/App.tsx` (after the store chunk) |
| 4 | Growth, after an owner decision | A4, A20 | `src/core/chord.ts`, `src/core/session.ts` and their tests |

Two chunks edit `src/core/session.ts` in step 2: the store chunk renames one field, and the core chunk changes sampling and exports. Merge the store chunk first.

Owner decisions needed before work starts: deleting `e2e/keypress.spec.ts` (A13), flash or steady error colour (A18), and how a lone modifier should score (A4).
