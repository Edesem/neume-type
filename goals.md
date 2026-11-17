# Goals

Next steps after the MVP. On 2026-11-03 the owner playtested it and judged it fun and worth turning into a more serious project (`PROGRESS.md`, T11). Finding numbers (A1 to A21) refer to `AUDIT.md`.

Work through the goals in order. Goals marked **Owner decision** need the owner's answer before any work starts.

## Housekeeping

### G1. Commit the audit files
Commit `AUDIT.md` and `lessons-learned.md`. They are untracked on `main`, so nothing protects them yet.

### G2. Retire the "throwaway prototype" framing (owner decision)
Update `CLAUDE.md` and `SPEC.md`. Decide which guardrails still apply now that this is a real project: no saved history, no per-neume stats, and local only.

## Pay down the cheap debt

The audit's fix plan, steps 1 to 3. All of these are small (S) except A15, which is medium (M).

### G3. Tooling fixes (A1, A9, A21)
- A1: give Playwright its own port, so that the pre-commit hook works while `npm run dev` is running.
- A9: type-check `e2e-screenshots/`.
- A21: add `npm run build` to `check` and to CI.

### G4. Enforce the core boundary (A17)
Add a lint rule that keeps React, `window` and `document` out of `src/core` and `src/data`. A Vue port depends on this boundary.

### G5. Remove duplication and add guards (A2, A3, A5, A6, A7, A8, A10, A11, A12, A14, A16, A19)
- A3: remove the duplicated state.
- A5: keep one key-name mapping.
- A7: keep one set of e2e helpers.
- A11: keep one `drawPool`.
- A6, A12: throw on impossible input.
- A2: add store tests for the blur and visibility listeners.
- A8, A10: fix the test that is misnamed and the screenshot script that guards the wrong neume.
- A14, A16, A19: remove unused exports, tidy the tests that read repo files, and update the docs.

### G6. Styling convention (A15)
Add class names instead of `data-testid` selectors, keep only `@font-face` in `fonts.css`, and rename the colour variables by use.

## Decisions

### G7. Vue or React (owner decision)
Decide before the feature work starts. Today only about 110 lines (`src/ui/App.tsx`, `src/main.tsx`) import React, and every feature added makes a rewrite cost more.

### G8. Scoring a modifier key pressed alone (owner decision, A4)
Decide how a key that is also a modifier scores when it is pressed alone. In Neanes, `B` alone is Haplē. The answer is needed before qualitative characters or fthoras can be added. One option is to score it on key release when no other key was pressed in between. Then derive the test length from `targets.length` and replace the hard-coded `20` and `61` in the tests.

### G9. Error colour: flash or steady (owner decision, A18)
Either change `SPEC.md` to match the steady colour, or add a short flash.

### G10. Delete `e2e/keypress.spec.ts` (owner decision, A13)
Remove the debug scaffolding left over from T1 (`lastKey`, `keyLabel.ts` and this test). Deleting a test needs the owner's approval.

## Features

### G11. Practice mode and per-neume stats
Show the shortcut before the first attempt, or drill one family of neumes, and track error rates per neume. This adds the most value for a learner.

### G12. Saved progress
Keep personal bests and the weakest neumes in the browser. This needs browser storage, which first needs the guardrail decision in G2.

### G13. Qualitative characters and fthoras
Extend the keymap beyond the Characters of Quantity table. This depends on G8.

### G14. Test length options
Offer 10, 20 or 50 neumes. This depends on the length clean-up in G8.

### G15. macOS stuck-modifier check (A20)
Check by hand on a Mac: hold a letter modifier, press Cmd, release the letter, then release Cmd. If the letter stays held, fix it, for example by clearing letter modifiers on any keydown that has `metaKey` set.

## Validation

### G16. Playtest with other people
Have two or three chanters who use Neanes play it before investing heavily, because the "fun" verdict so far comes from the owner alone. If it is hosted as a static site, keep `OFL.txt` beside the font.
