# Tasks

Build in order. Every task must also pass `npm run check` (from T1 on) with CI green on its PR and reviewer agent approval before self-merge and branch deletion. "Autonomous" means it can be built without human judgement.

## T1. Scaffold, repo, tooling, CI

Vite + React + TypeScript app, private GitHub repo `neume-type`, ESLint, Vitest, Playwright (browsers installed in the project), Husky pre-commit (all four checks: type-check, lint, unit tests, Playwright e2e), GitHub Actions running all four checks, `PROGRESS.md`. One trivial test of each kind, including a Playwright test that presses a key and asserts on the page.

- **Done when:** `npm run check` passes locally, the repo is private (`gh repo view --json isPrivate`), a CI run on a PR is green with all four checks, and a commit containing a failing unit test is rejected by the hook (then discarded).
- **Verified by:** command output and CI run.
- **Autonomous:** yes. Needs `gh` signed in; if not, stop and ask.

## T2. Font and licence

Add `public/fonts/Neanes.otf` and `public/fonts/OFL.txt` from the sources in SPEC section 5, plus `@font-face`.

- **Done when:** both SHA-256 values match, and a Playwright test confirms every Appendix A code point renders from Neanes and not a fallback (criterion 7, written once T3 data exists; until then, test U+E000).
- **Verified by:** unit test hashing both files, Playwright.
- **Autonomous:** yes.

## T3. Keymap data

`src/data/keymap.ts` from Appendix A: id, name, modifiers, trigger, codePoints, status, plus the modifier list. Tests pin the Appendix A row count and spot-check entries.

- **Done when:** criterion 1 passes, with tests covering 61 entries, unique chords, no trigger in the modifier list, and exact checks on J, S + L, Shift + R + K, Shift + =. Extend T2's Playwright test to all 61.
- **Verified by:** Vitest, Playwright.
- **Autonomous:** yes. Transcribe, never infer. If a row seems wrong, stop and tell the user.

## T4. Chord tracker

`src/core/chord.ts`: takes plain key event objects, tracks the held set, returns ignored, held, or attempt, and whether to prevent default. Rules R1-R5, R6-R7, R9-R14 from SPEC.

- **Done when:** tracker-level examples among C1-C22 pass with no DOM.
- **Verified by:** Vitest.
- **Autonomous:** yes.

## T5. Session and scoring

`src/core/session.ts`: 20-neume sampling with injected random source, attempt handling, injected clock, results calculation, restart.

- **Done when:** all of C1-C22 pass end to end through tracker and session, and criteria 2, 3, 4 pass.
- **Verified by:** Vitest.
- **Autonomous:** yes.

## T6. Test screen

React shell with a window key listener wired to core, a row of neumes, current highlight, done and error states, and `data-neume-id` on the current neume so tests can read the target.

- **Done when:** Playwright enters plain, Shift, and modifier chords with real key events and sees the highlight advance or an error shown.
- **Verified by:** Playwright.
- **Autonomous:** yes.

## T7. Full-run end-to-end

Playwright reads each target, looks it up in the keymap, and types it with `keyboard.down`/`up` using `event.code` values.

- **Done when:** criteria 5 and 6 pass, plus held key auto-repeat not advancing (C13) and Meta+J not scoring (C17).
- **Verified by:** Playwright.
- **Autonomous:** yes.

## T8. Results and restart

Results view and a restart button that works during a test and after it. Blur the button after a click so Space does not re-trigger it.

- **Done when:** Playwright sees the time, rate and accuracy values after a full run, restart zeroes them (criterion 8), and keys on the results screen change nothing.
- **Verified by:** Playwright.
- **Autonomous:** yes.

## T9. Hint on error

Per SPEC decision D1 (skip this task if the user rejects it): after a wrong attempt, show the current neume's name and shortcut until it is entered.

- **Done when:** Playwright sees no hint at start, a hint after a wrong attempt, and none on the next neume.
- **Verified by:** Playwright.
- **Autonomous:** yes.

## T10. Monkeytype look

Apply SPEC section 6 styling. Stay within CSS; no new behaviour.

- **Done when:** all checks still pass, no glyph clips at the chosen size (Playwright screenshot attached to the PR), and no Monkeytype code or assets are present.
- **Verified by:** Playwright, screenshot, then user review.
- **Autonomous:** build yes; the likeness needs human judgement.

## T11. Human playtest

The user plays several full tests in a real browser on their own keyboard, compares glyphs with the guide's Symbol column, and judges whether it is fun. Three-key chords may hit keyboard rollover limits; note any that do.

- **Done when:** the user records criterion 11 and the fun verdict in `PROGRESS.md`.
- **Verified by:** the user.
- **Autonomous:** no.

## T12. Weighted neume draw

Replace the uniform draw with the weighted one in SPEC section 3a. Add `pitch` and `frequency` to every keymap entry, transcribed from `docs/neume-weights.md`; add `src/core/weights.ts`; make `sampleTargets` draw with the chances.

- **Done when:** SPEC criteria 12 to 14 pass, existing tests are as strict as before, and `npm run check` passes.
- **Verified by:** Vitest, Playwright, mutation checks (drop the floor, ignore the uncommon multiplier).
- **Autonomous:** yes.

## T13. Neume state colours

Owner request: typed neumes very bright, untyped neumes low contrast and close to the background. Done `#f2f1ea`, untyped `#4a4c50` on `#323437`. Current and error colours, labels and stats text unchanged. Low contrast is deliberate.

- **Done when:** a Playwright test asserts the computed colours of a done and an untyped neume and that the stats text keeps `#646669`; screenshots regenerated; `npm run check` passes.
- **Verified by:** Playwright, screenshot.
- **Autonomous:** yes.

## Post-MVP (goals.md)

Tasks T14 to T26 come from the post-MVP plan (units U3 to U15). Each is one branch and PR.

## T14. Tooling: Playwright port, type-check screenshots, build in check and CI

Playwright uses its own port (5275) so a running dev server (5273) no longer blocks commits. `tsconfig.json` includes `e2e-screenshots` and config files. `npm run check` includes `npm run build`. CI gets a fifth `build` job that also checks `dist/fonts/Neanes.otf` and `dist/fonts/OFL.txt` exist.

- **Done when:** `npm run check` passes and includes a build; with `npm run dev` running in another shell, `npm run e2e` passes; `npx tsc --noEmit --listFiles | grep e2e-screenshots` lists `capture.spec.ts`; CI shows five green jobs.

## T15. Enforce the core boundary

A lint rule keeps React, the DOM and `src/ui` out of `src/core` and `src/data`.

- **Done when:** `npm run check` passes and CI is green.

## T16. Store state, debug scaffolding, store listener tests

One error flag in the store, remove the debug last-key label and `keyLabel.ts` (owner-approved deletion of `e2e/keypress.spec.ts` and the last-key assertions), and add store listener tests.

- **Done when:** `npm run check` passes and CI is green; `grep -rn "lastWrong\|lastKey\|keyLabel\|hintVisible" src e2e e2e-screenshots` returns nothing.

## T17. Core helpers: key names, draw pool, guards, unused exports

One key-name map, one draw pool, and a throw on impossible input.

- **Done when:** `npm run check` passes and CI is green; `grep -rn "Key(\[A-Z\])" src e2e` finds exactly one regex, in `shortcut.ts`; `grep -rn "'ShiftLeft'" src e2e` finds only `chord.ts`, `keyScript.ts`'s NAMES and tests; `grep -rn "status !== 'unverified'" src` finds only `drawPool`.

## T18. Tidy the tests

Shared e2e helpers, an honest restart timing test, repo-file paths.

- **Done when:** `npm run check` passes and CI is green; `grep -n "const physical\|function typeChord" e2e/*.spec.ts` returns nothing; `npm run screenshots` passes.

## T19. Styling convention

Class-based styling and colour variables named by use.

- **Done when:** `npm run check` passes and CI is green; `npm run screenshots` output is visually unchanged (do not commit identical PNGs).

## T20. Derive test length from the targets

`createSession` takes an optional `length` (default `TEST_LENGTH`); hard-coded 20 and 61 in tests become imported constants.

- **Done when:** `npm run check` passes and CI is green; `grep -rnE "\b(20|19|61)\b" e2e src/core src/ui --include=*.ts --include=*.tsx` shows only the justified literals.

## T21. A lone modifier scores on release

A modifier key pressed alone scores on release when no other key was pressed between its keydown and keyup. It counts as one attempt for that key's own neume.

- **Done when:** `npm run check` passes and CI is green; all of C1 to C22 are unchanged and pass.

## T22. Practice mode, drills by modifier key, per-neume stats

Show-shortcuts option, drills grouped by modifier key (all, plain, R, S, D, F, B, then V, T), per-neume stats for the run.

- **Done when:** `npm run check` passes and CI is green; the feature is reachable without `?debug`; `npm run screenshots` is regenerated with a `practice.png`.

## T23. Saved progress in the browser

Personal bests and weakest neumes in `localStorage`, through `src/core/progress.ts` (schema) and `src/ui/progressStore.ts` (the only place that touches storage).

- **Done when:** `npm run check` passes and CI is green; the feature is reachable without `?debug`; screenshots regenerated (results with best and hardest).

## T24. Qualitative characters and fthoras

Add the Quality and Fthora tables from the published Neanes shortcut table; anything not verified is marked `unverified`. V and T drills.

- **Done when:** `npm run check` passes and CI is green; every seeded e2e from before still passes with seeds unchanged; V and T drills are reachable without `?debug`; a human glyph check against the guide's Symbol column is recorded as pending in `PROGRESS.md`.

## T25. Test length 10, 20 or 50

Player-chosen test length.

- **Done when:** `npm run check` passes and CI is green; the feature is reachable; screenshots updated if the settings bar changed.

## T26. macOS stuck-modifier defence

Clear letter modifiers on any keydown with `metaKey` set (macOS drops keyups while Cmd is down). Shift is kept.

- **Done when:** `npm run check` passes and CI is green; the open item (manual macOS check by the owner) is recorded in `PROGRESS.md`.

## T27. No back-to-back repeats

Owner request: an *avoid repeats* option, off by default, so the same neume never appears twice in a row. When on, each later position is drawn from the drill pool minus the previous id with the chances renormalised, using one `random()` per neume; off is today's draw exactly. Saved with the other settings (merged, absent or invalid means off) and toggling restarts the test. Bests keep the `drill:length` key.

- **Done when:** `npm run check` passes and CI is green; every existing seeded unit and e2e test passes unchanged; the toggle is reachable without `?debug`, persists across reload and restarts the test; SPEC sections 3, 3b, 3c and criterion 19 are updated; screenshots regenerated.

## T28. Verify row 82 (T + M)

Owner decision 2026-11-19: U+E19B is the guide's "Soft Chromatic Ga fthora" (the glyph can be read on Ga or Ke; use Ga). Mark it verified, keep the guide's name and the SBMuFL-derived id, note the difference in SPEC Appendix B. It joins the T drill.

- **Done when:** `npm run check` passes and CI is green; the keymap has no unverified entry; the T drill has 18 entries including row 82 and can draw it; the quality e2e types T + M; SPEC criterion 18 updated.
