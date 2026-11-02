# Orchestration note

- **Planner:** Opus 5.5, medium effort. Researches sources and writes the spec and task list, because mistakes there are the costliest.
- **Builder:** Sonnet 5.5, medium effort. Implements tasks in order from `TASKS.md`, which are small and checkable, so a cheaper model protects the usage window.
- **Reviewer:** Sonnet 5.5, medium effort. It approves each PR before the builder merges and deletes the branch. A fresh final reviewer, which has not seen the build, then judges the result against `SPEC.md` rather than the builder's reasoning.

The main session coordinates. It resumes one builder across tasks to avoid cold starts, passes findings between agents, brings decisions to the user, and logs each step to `ORCHESTRATION_LOG.md`.
