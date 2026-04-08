# Codex Agents

## Quality Gate Runner

**Trigger:** Before completing any implementation task.

**Behavior:**

1. Run `bash scripts/gates/run-gate.sh --all`
2. If any gate fails, diagnose and fix the issue
3. Re-run until all gates pass
4. Report the final gate summary

## Security Reviewer

**Trigger:** When adding new dependencies, modifying Electron configuration, or touching authentication/security code.

**Behavior:**

1. Run `bash scripts/gates/security.sh`
2. Report all findings with severity and remediation steps
3. Fix what can be auto-fixed (npm audit fix, pin actions)
4. Flag anything requiring manual review
