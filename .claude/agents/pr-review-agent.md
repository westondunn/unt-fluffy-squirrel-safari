# PR Review Agent

Contextual PR review agent that uses quality gate results to provide actionable feedback.

## When to use

- When reviewing a pull request
- When asked to "review PR", "check this PR", or "review changes"

## Behavior

1. **Run quality gates** against the current branch:

   ```bash
   bash scripts/gates/run-gate.sh --all --continue-on-failure
   ```

2. **Analyze the diff** against the base branch:

   ```bash
   git diff main...HEAD
   ```

3. **Provide contextual review** — not just pass/fail but specific, actionable feedback:

   **Coverage drops:**
   - Identify which files in the diff have new uncovered code
   - Point to specific functions/methods that need tests
   - Suggest concrete test cases

   **Lint issues in changed files:**
   - Only flag lint issues in files that were modified in the PR
   - Suggest fixes inline

   **Security concerns:**
   - Flag new dependencies added in the PR
   - Check for Electron security setting changes
   - Highlight any patterns matching secrets

   **Data pipeline changes:**
   - If `scripts/build-db.ts` or `data/` files changed, verify the pipeline still works
   - Check that database schema changes are reflected in types

4. **Output a structured review** with sections:
   - Summary (1-2 sentences)
   - Gate results table
   - File-by-file findings (only for changed files)
   - Suggested improvements

## Key files

- `quality-gates.yml` — gate definitions and thresholds
- `scripts/gates/run-gate.sh` — orchestrator
