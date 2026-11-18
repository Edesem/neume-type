# Neume Type

Neume Type is a Monkeytype-style typing drill for Byzantine neumes using Neanes shortcuts. It began as a prototype; the owner playtested it on 2026-11-03 and decided to develop it further. `SPEC.md` defines behaviour, `TASKS.md` defines build order, `goals.md` lists post-MVP goals. Read `lessons-learned.md` before writing code.

## Stack

Vite, React, TypeScript, Vitest, Playwright, ESLint, Husky, GitHub Actions. Local only.

UI framework decision (2026-11-18): stay on React; no Vue rewrite (G7).

## Commands

| Purpose | Command |
|---|---|
| Run | `npm run dev` |
| Type-check | `npm run typecheck` |
| Lint | `npm run lint` |
| Unit tests | `npm test` |
| End-to-end tests | `npm run e2e` |
| All checks | `npm run check` (typecheck, lint, unit tests, build, e2e) |
| Production build | `npm run build` |
| Regenerate screenshots | `npm run screenshots` (rewrites `docs/screenshots/`; not part of `check`) |

Dev uses port 5273 and Playwright uses port 5275, so a running dev server does not block commits.

Install Playwright browsers inside the project with `PLAYWRIGHT_BROWSERS_PATH=0` set, so nothing lands in the global cache.

## Layout

- `src/data/keymap.ts`: keymap data only, with no logic. Every entry that could not be verified against the source is marked `unverified`. Never guess shortcuts.
- `src/core/`: chord detection, scoring and sampling. Plain TypeScript with no React or DOM imports (enforced by ESLint, `eslint.config.js`).
- `src/ui/`: thin React layer.
- `public/fonts/`: `Neanes.otf` and `OFL.txt`.
- `e2e/`: Playwright tests that send real key events to the running page.
- `src/test-utils/`: unit test helpers.
- `e2e-screenshots/`: capture script for `npm run screenshots`.
- `docs/`: owner-checked tables and screenshots.
- A new top-level TypeScript directory must also go into `tsconfig.json` `include`.

## Workflow

- Use TDD: write a failing test first, then the code. Use the `test-driven-development` skill.
- Use a structured git workflow: one branch and PR per task, conventional commits. Use the `structured-git-workflow` skill.
- A task is done only when all checks pass (`npm run check`) and its done-condition in `TASKS.md` is met.
- Update `PROGRESS.md` when finishing a task.
- Every PR needs reviewer agent approval, recorded as a PR comment starting `REVIEW: APPROVED`. The builder opens the PR and stops. After the reviewer's approval comment and green CI, the PR is squash-merged and its branch deleted (in practice by the orchestrating main session; see `ORCHESTRATION_LOG.md`).
- Scratch files go in the git-ignored `.scratch/`, never outside the project.

## Guardrails

- Never delete, skip or weaken a test, or disable a lint rule, to pass a check. If a test seems wrong, stop and tell the user.
- Chord detection, scoring and keymap logic are plain code with no UI dependency, with unit tests. The UI is a thin layer.
- Add a dependency only when it clearly saves time, and list each one in `PROGRESS.md`.
- No accounts, backend, server-side database, network calls or analytics.
- Saved history and per-neume stats are allowed, stored only in the browser (`localStorage`) and never sent anywhere.
- Static hosting of the built site is allowed. Keep `OFL.txt` beside the font in the deployed files.
- Don't touch anything outside the project directory.
- Stop and ask before installing global tools or doing anything irreversible.
- If blocked more than 3 attempts on a task, write down what was tried in `PROGRESS.md` and move on.

## Licensing

- Neanes and Monkeytype are GPL-3.0. Never copy their source code or assets.
- Reading the published Neanes shortcut table and SBMuFL docs is fine. Do not read Neanes application source to derive behaviour.
- The Neanes font and its OFL 1.1 licence file are the only third-party files allowed. Keep `OFL.txt` beside the font and do not modify the font.
