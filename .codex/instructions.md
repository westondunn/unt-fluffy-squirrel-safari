# Codex Instructions

## Quality Gates

This project uses a shared quality gate system. All gates are defined in `quality-gates.yml` at the repo root and executed via shell scripts in `scripts/gates/`.

### Before completing any task

Run all quality gates:

```bash
bash scripts/gates/run-gate.sh --all
```

### On gate failure

1. **Lint failures:** Run `npx eslint . --fix && npx prettier --write .` then re-check.
2. **Test failures:** Read the failing test, understand what it expects, fix the source code or test as appropriate, and re-run.
3. **Coverage below threshold:** Add tests for uncovered code. Check `quality-gates.yml` for current thresholds (lines: 80%, branches: 70%, functions: 80%).
4. **Data pipeline failures:** Check `scripts/build-db.ts` and `data/trees.csv`. Required tables and minimum row counts are in `quality-gates.yml`.
5. **Security failures:** Run `npm audit fix` for vulnerabilities. For other security issues, read the gate output for specific guidance.

### Gate scripts

| Gate     | Script                      | What it checks                                            |
| -------- | --------------------------- | --------------------------------------------------------- |
| lint     | `scripts/gates/lint.sh`     | ESLint + Prettier                                         |
| test     | `scripts/gates/test.sh`     | Vitest + coverage thresholds                              |
| data     | `scripts/gates/data.sh`     | build-db pipeline + database validation                   |
| security | `scripts/gates/security.sh` | npm audit, secrets, licenses, supply chain, Electron SAST |

### Run a single gate

```bash
bash scripts/gates/run-gate.sh --gate <name>
```

### Thresholds

All thresholds are read from `quality-gates.yml`. Do not hardcode threshold values — the manifest is the source of truth.
