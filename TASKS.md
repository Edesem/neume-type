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
