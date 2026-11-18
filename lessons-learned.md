# Lessons learned

Read this before you write code in this repo. It works together with `CLAUDE.md` and does not replace it.

## 1. Purpose

Every line of this codebase was written by AI agents, one task at a time, with no human review. An audit on 2026-11-11 (`AUDIT.md`, findings A1 to A21) found no serious bugs. It found one repeated mistake: an agent adds something beside what an earlier agent built, instead of finding it, reusing it or replacing it. The rules below exist to stop that. Each rule cites the findings it came from.

## 2. Canonical patterns

Use these. Do not write a second version.

### State

- **Canonical:** `src/core/session.ts`. All game state lives in the session and is read through `session.state()`.
- `src/ui/store.ts` only forwards events and publishes snapshots. It must not hold a fact that the session already holds or could hold.
- If the UI needs a new fact, add a field to `SessionState` and unit-test it in `src/core/session.test.ts`.
- Do not add fields to the store snapshot, and do not compute outcomes in the store by comparing counts before and after an event. The snapshot is only `{ state }`.

```ts
// src/ui/App.tsx: read from the session state
{state.lastAttemptWrong && !state.done && <p className="hint">…</p>}
```

### Key events and chords

- **Canonical:** `src/core/chord.ts` (`createChordTracker`, `attemptMatches`). It takes plain `KeyEventLike` objects and uses `event.code` only.
- `src/ui/store.ts` is the only place that attaches DOM listeners. It is attached once, from `src/main.tsx`.
- Never read keys inside a React component.

### Key names

- **Canonical:** `keyName(code)` in `src/core/shortcut.ts` (throws on an unknown code) and `physicalCode(modifier)` in `src/core/chord.ts` (logical `Shift` to `ShiftLeft`). For display text call `shortcutText(entry)`. Do not write another `Key([A-Z])` regular expression, punctuation table or Shift mapping.

### Keymap data

- **Canonical:** `src/data/keymap.ts`. Data only, in SPEC Appendix A order.
- Each documented source has a test that compares it to the keymap: `src/data/keymap.test.ts` (against `SPEC.md`) and `src/data/weightsDoc.test.ts` (against `docs/neume-weights.md`). When you change data, change the document in the same commit.
- A new data column needs a new comparison test. The Weight, Chance and Shortcut columns of `docs/neume-weights.md` have none yet.

### Sampling and weights

- **Canonical:** `sampleTargets` in `src/core/session.ts`, and `drawPool` and `neumeChances` in `src/core/weights.ts`. `drawPool(entries)` is the only place that filters out `unverified` entries; `neumeChances` takes its result and throws on an unverified entry.
- Chances are in **pool order** (entries not marked `unverified`), not keymap order. Look a chance up by finding the entry in the pool, never by its keymap index.

### Randomness and time

- **Canonical:** inject them. `createSession({ random, now })`. Use `seededRandom` from `src/core/random.ts` for repeatable draws.
- Never call `Math.random`, `Date.now` or `performance.now` inside `src/core`. Only `src/main.tsx` supplies the real ones.

### Errors and impossible input

- **Canonical:** a function that receives input it cannot handle throws an `Error` with a clear message. It does not return `undefined`, a guessed value or a quietly wrong result.

```ts
if (pool.length === 0) throw new Error('drawPool: no verified entries');
```

### Validation and configuration

- The only external inputs are the URL parameters `?seed=N` and `?debug`. They are read in `src/main.tsx` and nowhere else.
- No environment variables or network calls. Browser storage only through `src/core/progress.ts` (schema) and `src/ui/progressStore.ts` (the only code that touches `localStorage`); stored data is untrusted, so it is parsed and validated and never throws (`CLAUDE.md` guardrail).
- The dev server port is set in `vite.config.ts`. The Playwright server is set in `playwright.config.ts`. Fixed (A1): dev uses 5273 and Playwright uses 5275 (`E2E_PORT`).

### Result formatting

- **Canonical:** `formatResults` and the `FormattedResults` type in `src/core/format.ts`. Import the type; do not retype its shape in a component.

### Styling

- **Canonical:** `src/ui/look.css` holds all rules and all colour variables. `src/ui/fonts.css` holds only `@font-face`.
- Select by class name or `data-state`. `data-testid` is for tests only; never use it in a CSS selector.
- Name a colour variable after its use (`--neume-done`, `--text-muted`, `--text-button`), and rename it when its use changes. `src/ui/styles.test.ts` checks these rules.

### Unit tests

- Tests sit beside the code they test: `src/core/x.ts` and `src/core/x.test.ts`.
- Tests that check repo files (docs, fonts) belong in `src/data/` and locate the file with `import.meta.url`, as `src/data/weightsDoc.test.ts` does.
- For key sequences use `script([...])` from `src/test-utils/keyScript.ts`. Do not build event arrays by hand.

```ts
const text = readFileSync(new URL('../../docs/neume-weights.md', import.meta.url), 'utf8');
```

### End-to-end tests

- **Canonical:** `e2e/helpers.ts` (`typeChord`, `currentTarget`, `currentIndex`, `advanceTo`, `counts`, `findSeed`, `targetsFor`; use `physicalCode` from `src/core/chord.ts`). Import them. Never copy them into a spec file.
- To get a specific neume, use `findSeed(predicate)` and load `/?seed=N`.

```ts
const seed = findSeed((t) => t[0].id === 'oligonKentimaMiddle');
await page.goto(`/?seed=${seed}`);
```

### Folder layout

- `src/data/`: data and data tests. `src/core/`: logic, with no DOM or React. `src/ui/`: the store and React view. `src/test-utils/`: helpers for unit tests. `e2e/`: Playwright specs and helpers. `e2e-screenshots/`: the capture script run by `npm run screenshots`. `docs/`: owner-checked source tables and screenshots.
- A new top-level directory must be added to `tsconfig.json` `include` and to the layout section of `CLAUDE.md` in the same PR.

## 3. Rules

### Reuse and duplication

1. Before you write a helper, search `src/core`, `src/test-utils` and `e2e/helpers.ts` for one that does the job. *Reason: five key-name mappings and two copies of the e2e helpers exist because agents did not search.* (A5, A7)
2. Export a helper that another layer could need. Do not hide a general function as a private `const` in one module. *Reason: the private `keyName` could not be reused, so a second version was kept.* (A5)
3. When you extract shared code, update every caller in the repo, not only the files your task touches. *Reason: `e2e/test-screen.spec.ts` was left with stale copies after a "pure refactor".* (A7)
4. When your task makes older code redundant, delete the older code in the same PR, or record it in `PROGRESS.md` under "For the user to decide". *Reason: `hintVisible` was added while `lastWrong` stayed; a debug line was hidden when it should have been removed.* (A3, A13)
5. Do not filter, validate or normalise the same thing in both the caller and the callee. Choose one place and document it on the function. *Reason: the unverified filter runs twice and the two layers disagree on array indexes.* (A11)

### State and layering

6. Put every game fact in `src/core/session.ts`. The store and components hold no game state of their own. *Reason: duplicate state in two layers.* (A3)
7. Do not import `react`, `react-dom` or anything from `src/ui` into `src/core` or `src/data`, and do not use `window` or `document` there. An ESLint rule in `eslint.config.js` enforces this (also bans `Math.random` and `Date.now` there), tested in `src/core/boundary.test.ts`. *Reason: the boundary is unenforced and the core must stay framework-free.* (A17)
8. Do not do work on every key press that only a debug view uses. *Reason: `lastKey` re-renders the app on every keydown, including ignored keys.* (A13)
9. Read sizes from the data (`targets.length`, `keymap.length`, `TEST_LENGTH`). Do not type `20` or `61` into new logic or new tests. *Reason: the test length was once typed into the session and most spec files; the session now derives it from `targets.length`.* (A4)
10. A key in `MODIFIERS` can now score on its own (it fires on release, see SPEC R6 and `SOLO_TRIGGERS` in `src/core/chord.ts`), but adding a keymap entry whose trigger is a modifier still needs the owner's approval, because SPEC criterion 1 says no entry does. *Reason: A4.* (A4)

### Tests

11. A test's name must state what its assertions check. If you cannot assert the named behaviour, change the code so you can, or rename the test. *Reason: a test named for timing asserts only accuracy.* (A8)
12. When you add a listener or pass a new event field through `src/ui/store.ts`, add a store test that dispatches that event. A core test does not cover the wiring. *Reason: the blur and visibility wiring has no test.* (A2)
13. A test helper must throw on input it does not understand. *Reason: `script(['↓.'])` produces the code `Key.`, which the tracker ignores, so a negative test can pass for the wrong reason.* (A6)
14. Before each wrong key press in a spec, make sure the key is wrong for the neume that is current at that moment, not for neume 0. Assert the visible effect before you rely on it. *Reason: the screenshot script guards neume 0 and presses the key at neume 3.* (A10)
15. Do not shape assertions around array positions that hold only because every entry is `verified`. *Reason: `chances[i]` paired with `keymap[i]`.* (A11)
16. Never delete or weaken a test, even a trivial one, without the owner's approval. Report it. *Reason: removing the leftover `e2e/keypress.spec.ts` needs a decision.* (A13)

### Errors and edge cases

17. For every function you write, decide what happens with an empty list and with a count larger than the design assumed. Throw if the answer would be wrong. *Reason: an empty pool yields `undefined` targets; more than 400 entries yields chances that sum above 1.* (A12)
18. For key-state code, consider the events the browser may never send. The spec's list (blur, hidden page, Shift) may be incomplete. Label an untested platform case in `PROGRESS.md`. *Reason: a suspected stuck modifier after Cmd shortcuts on macOS.* (A20) The tracker now clears every held non-Shift key on a keydown with `metaKey` (SPEC R14, C30); the real-Mac check passed on 2026-11-18 (owner).

### Tooling and configuration

19. `npm run check` now includes the build, and CI has a `build` job. *Fixed (A21).*
20. After you add a directory that holds TypeScript, run `npx tsc --noEmit --listFiles | grep <dir>` and confirm it is listed. *Reason: `e2e-screenshots/` is linted but not type-checked.* (A9)
21. Do not set `reuseExistingServer: true`. *Fixed (A1): Playwright uses port 5275, so a running dev server on 5273 no longer blocks commits.*
22. Export only what another file imports now. Add an option only when a caller passes it. *Reason: an unused type export and an unused `entries` option.* (A14)

### Styling

23. Add a class name in `App.tsx` when you need a style hook. Do not target `data-testid`. *Reason: renaming a test id would break the layout.* (A15)
24. Keep all rules for one element in `src/ui/look.css`. *Reason: `.neume` is styled in two files.* (A15)

### Docs and spec

25. Build what `SPEC.md` says. If `TASKS.md` and `SPEC.md` differ, or you choose to differ, write the difference in `PROGRESS.md` under "For the user to decide". *Reason: the spec says the error colour flashes; it stays.* (A18)
26. When you add an npm script, a directory or a workflow change, update `CLAUDE.md` in the same PR. *Reason: `CLAUDE.md` lacks two scripts and three directories, and describes a merge step that never happened.* (A19)

## 4. Workflow rules for agents

### Before you write code

- Read `SPEC.md` for the behaviour and the section 2 pattern for the concern you are about to touch.
- Search for an existing implementation: `grep -rn "<name or idea>" src e2e`. Open `src/core/`, `src/test-utils/keyScript.ts` and `e2e/helpers.ts` and read their exports.
- Check whether an earlier task already stores the fact or draws the thing you need (rules 1, 4, 6).
- Read the root-cause lines in `AUDIT.md` for any finding that touches your files.

### While you work

- Stay inside the files your task or fix chunk owns. If you must change a file outside it, say so in the PR description.
- Do not create scratch files outside the git-ignored `.scratch/`, and remove yours when you finish.
- Drive end-to-end tests through the real page with real key events. Do not stub the session, the store or the keymap to make a test pass.
- When you replace something, remove the old version in the same PR (rule 4).
- If a task instruction conflicts with `SPEC.md` or with this file, stop and report it. Do not pick one silently.

### Before you say a task is done

- `npm run check` passes and `npm run build` passes, with no dev server running.
- The feature is reachable in the running app without `?debug`, and you have seen it there, in a Playwright test or the browser.
- Every new export is imported somewhere, and every new listener or forwarded field has a test.
- `grep` shows no second copy of anything you added.
- `PROGRESS.md` and, where rule 26 applies, `CLAUDE.md` are updated.
- `git status` shows only files you meant to change.

## 5. Pre-commit checklist

Answer each with yes before you finish. A "no" means you are not done.

1. Did I search for an existing helper before writing each new function? (rule 1)
2. Does every game fact I added live in `src/core/session.ts` and nowhere else? (rule 6)
3. Is `src/core` and `src/data` free of `react`, `window` and `document` in my diff? (rule 7)
4. If my change made older code redundant, did I delete it or record it in `PROGRESS.md`? (rule 4)
5. If I extracted a helper, did I update every caller in the repo? (rule 3)
6. Does every test name match what its assertions check? (rule 11)
7. Does every new listener or forwarded event field in `src/ui/store.ts` have a store test? (rule 12)
8. Do my new functions and test helpers throw on empty or unknown input? (rules 13, 17)
9. Did I avoid typing `20` or `61` into new logic and tests? (rule 9)
10. Do my CSS selectors use classes or `data-state`, and not `data-testid`? (rule 23)
11. Is every new export imported, and every new option passed, by some file? (rule 22)
12. If I added a directory, does `tsc --listFiles` include it and does `CLAUDE.md` list it? (rules 20, 26)
13. Do `npm run check` and `npm run build` both pass with no dev server running? (rules 19, 21)
14. Does the behaviour match `SPEC.md`, or is the difference written in `PROGRESS.md`? (rule 25)
15. Does `git status` show only intended files, with no scratch files left? (workflow)
