# Orchestration log

## Phase 1: Clarify (main session)

- Asked one round of two questions: what counts as a bare neume, and the spending limit.
- User answers: combination and stacked neumes are included; no spending limit, but don't exhaust the 5-hour usage window.
- Ambiguous instructions:
  - "Bare neumes" with combinations versus "single standalone glyph only". These conflicted.
  - "Spending beyond a limit" named no limit.
  - The required checks did not list lint, though the guardrails mention it. Main session added ESLint.

## Phase 2: Plan

**Planner (Opus 5.5, medium):** wrote `SPEC.md`, `CLAUDE.md`, `TASKS.md`, `ORCHESTRATION_NOTE.md`. About 79k tokens, 14 tool uses, 4 minutes.

Planner's reported interpretations:
- "S + L (Side)" in the brief is plain "Oligon with Kentēma" in the guide. Used the guide's name.
- "First input" means first attempt, so modifier presses alone don't start the clock.
- 20 neumes are drawn with replacement.
- It added hints after a wrong attempt (D1), an addition to scope, for the user to decide.
- Rest, Cross and Breath are in the guide's quantity table but outside SBMuFL's quantity range (D2), for the user to decide.

**Where it went wrong:** the planner wrote research files outside the project, against its brief: `/tmp/neume-research/`, `/tmp/neume-kb.py`, `/tmp/neume-appendix.py`. Its cleanup hit a permission prompt, so the files remain. Main session did not delete them and raised them with the user. Likely cause: the brief forbade writing outside the directory but gave no place for scratch files.

**Main session review:**
- Compared all 61 Appendix A shortcuts and names by eye against the live guide: they match. Code points, font hashes and the 15-modifier list were not independently rechecked; T2 and T3 tests cover the hashes and data.
- Corrected `TASKS.md` T1: the pre-commit hook left out e2e, which the brief includes.
- Changed the orchestration note to resume one builder across tasks, to protect the usage window.

**User approval (2026-11-02):** approved hints on error, including Rest/Cross/Breath (61 entries), and builder self-merge, with one change: the builder must wait for reviewer agent approval on each PR, then may self-merge and delete the branch.

Interpretation by main session: GitHub blocks approving your own PR and all agents share one account, so the PR reviewer records approval as a PR comment starting `REVIEW: APPROVED`. PR reviews are separate from the Phase 4 final reviewer, which is a fresh agent. Scratch files go in the git-ignored `.scratch/`.

## Phase 3: Build
