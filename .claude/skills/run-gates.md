# Run Quality Gates

Invoke quality gates with AI-interpreted results.

## Usage

Run all gates or a specific gate, then interpret the results with context.

## Steps

1. Run the orchestrator:

   ```bash
   bash scripts/gates/run-gate.sh --all --continue-on-failure
   ```

2. Parse the output and present results as a summary table.

3. For any failures, provide:
   - What failed and why (in plain language)
   - The specific threshold or rule that was violated
   - A suggested fix with code/commands

4. If all gates pass, confirm with a brief summary.

## Arguments

- No arguments: run all gates
- Gate name (e.g., "lint", "test", "data", "security"): run only that gate
  ```bash
  bash scripts/gates/run-gate.sh --gate <name>
  ```
