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

- **T1, builder (Sonnet 5.5, medium):** PR #1 open, reports all four CI checks green. About 50k tokens, 8 minutes. The first combined init command hung, so it ran the steps one at a time. Moved the dev port to 5273 because 5173 was in use.
- **T1, PR reviewer (Sonnet 5.5, medium):** posted `REVIEW: APPROVED`. Caveat: the hook's rejection of a failing commit is only documented in the PR description, not visible in the diff.
- **Stuck:** the builder's `gh pr merge 1 --squash --delete-branch` was denied by the auto-mode permission classifier as "Merge Without Review". The builder's first brief said not to merge, and the classifier did not accept the coordinator's later message as authorisation. Main session did not retry the merge itself, because that would sidestep the denial. Raised with the user. PR #1 still open, T2 not started.
- **Stuck again:** the user said to allow `gh pr merge`, and main session added `Bash(gh pr merge:*)` to `.claude/settings.local.json`. The builder's retry was still denied as "Merge Without Review". The allow rule did not get the builder's merge through the classifier; the exact reason is unconfirmed. Main session did not run the merge in the builder's place. Raised with the user again.
- **Resolved:** the user chose to have the main session merge. Main session checks the approval comment and CI, then runs the merge; PR #1 merged that way. Process from T2 on: builder opens PR and stops, reviewer approves, main session merges. This differs from the user's "builder self-merges".
- **T2:** PR #2 approved and merged. The reviewer judged from the code that the font test would fail on a fallback font.
- **T3, reviewer error caught:** main session asked the builder to actually test that claim. The T2 check passed on a missing glyph, because Chrome reports Neanes anyway, so the reviewer's T2 judgement was wrong. Builder added a canvas pixel comparison against `.notdef`, which fails correctly. Lesson: code-reading review does not replace running a negative test.
- **T4:** PR #4 approved and merged. Builder flagged R7 versus R13 on repeats; main session decided repeats score nothing but still preventDefault. Reviewer's 17 mutations left three test gaps, closed in T5.
- **T5:** PR #5 approved and merged. Non-blocking gaps (rate rounding, zero duration) carried to T8.
- **T6:** PR #6 got changes requested: the debug glyph row and last-key line were visible to players. Builder moved them behind `?debug`; approved on re-review and merged. The builder had noticed them but kept them, and only the main session's explicit question to the reviewer forced a ruling.
- **T7:** PR #7 approved and merged. The 95.2% display assertion deferred to T8 by main session.
- **T8:** PR #8 review interrupted when the user accidentally stopped the reviewer. A stopped agent cannot be resumed, so main session started a new reviewer at the user's request; it approved, and PR #8 merged. Non-blocking gap: clock reset on restart is unit-tested only. Agents' context is growing (builder about 130k tokens by T8), so a fresh builder may be cheaper for what remains.
- **User-requested pause after T8.** T9, T10, T11, final review and report not started.
- **Ambiguity found:** the user's approval allowed self-merge, but nothing in the permission settings reflects it, and the comment-based approval is not a GitHub review.
