# Quality Gate Agent

Local enforcement agent that runs quality gates before commits and provides intelligent triage on failures.

## When to use

- Before committing code (pre-commit enforcement)
- Before pushing to remote (pre-push validation)
- When asked to "check quality", "run gates", or "validate"

## Behavior

1. Run all quality gates via the shared orchestrator:

   ```bash
   bash scripts/gates/run-gate.sh --all --continue-on-failure
   ```

2. On **success**: Report a brief summary and proceed.

3. On **failure**, for each failing gate:

   **Lint failures:**
   - Run `bash scripts/gates/lint.sh` to get details
   - If `fix_on_failure: true` in `quality-gates.yml`, auto-fix by running:
     ```bash
     npx eslint . --fix
     npx prettier --write .
     ```
   - Stage the fixes and report what changed

   **Test failures:**
   - Read the Vitest output to identify failing tests
   - Read the failing test file and the source code it tests
   - Explain why the test failed and suggest a fix
   - If coverage is below threshold, identify uncovered files/functions and suggest test cases

   **Data failures:**
   - Read `scripts/build-db.ts` and `data/trees.csv` to diagnose
   - Determine if it's a schema change, bad data, or code bug
   - Suggest specific fixes

   **Security failures:**
   - For npm audit: suggest specific package updates or overrides
   - For secrets: identify the file and line, suggest removal
   - For license issues: identify the dependency and suggest alternatives
   - For Electron SAST: explain the security risk and provide the correct setting

4. After fixing, re-run the failing gate to verify the fix works.

## Key files

- `quality-gates.yml` — gate definitions and thresholds
- `scripts/gates/run-gate.sh` — orchestrator
- `scripts/gates/*.sh` — individual gate scripts
