# Quality Gates Design Spec

**Date:** 2026-04-08
**Status:** Approved
**Branch:** `feat/quality-gates`

## Overview

A shared quality gate system consumed by three ecosystems: GitHub Actions, Claude Code, and Codex. A single YAML manifest (`quality-gates.yml`) defines all gates and thresholds. Shell scripts implement each gate. An orchestrator runs them in order. AI agents add triage, auto-fix, and PR review on top.

## Architecture

```
quality-gates.yml (source of truth)
        |
  scripts/gates/run-gate.sh (orchestrator)
        |
  +-----------+-----------+-----------+
  | lint.sh   | test.sh   | data.sh   | security.sh
  +-----------+-----------+-----------+
        |
  +-----+--------+--------+
  | .github/     | .claude/ | .codex/
  | workflows    | agents   | instructions
  +-----+--------+--------+
```

## Quality Gates

### 1. Lint & Format

- ESLint (flat config) + Prettier
- Auto-fix locally when `fix_on_failure: true`
- Zero warnings policy

### 2. Test & Coverage

- Vitest with `@vitest/coverage-v8`
- Thresholds: 80% lines, 70% branches, 80% functions
- 100% test pass rate

### 3. Data Pipeline Validation

- Runs `npm run build:db`
- Validates required tables exist: trees, hotspots, squirrel_species
- Validates minimum row counts per table
- Checks no nulls in primary key columns

### 4. Security Scanning

- `npm audit` at moderate+ level
- Secrets detection via gitleaks
- License compliance (deny GPL-3.0, AGPL-3.0)
- Supply chain: lockfile integrity, pinned GitHub Actions
- Electron SAST: nodeIntegration, contextIsolation, webSecurity checks

## Shared Manifest Schema

```yaml
version: 1
thresholds:
  test:
    pass_rate: 100
    coverage:
      lines: 80
      branches: 70
      functions: 80
  lint:
    fix_on_failure: true
  data:
    required_tables: [trees, hotspots, squirrel_species]
    min_rows:
      trees: 5000
      hotspots: 1
      squirrel_species: 1
  security:
    npm_audit_level: moderate
    secrets_scan: true
    license_deny: [GPL-3.0, AGPL-3.0]
    supply_chain:
      lockfile_integrity: true
      pinned_actions: true
    sast:
      electron_rules: true

gates:
  - name: lint
    script: scripts/gates/lint.sh
    order: 1
  - name: test
    script: scripts/gates/test.sh
    order: 2
  - name: data
    script: scripts/gates/data.sh
    order: 3
  - name: security
    script: scripts/gates/security.sh
    order: 4
```

## Gate Scripts

All scripts in `scripts/gates/`:

- `_lib.sh` — shared helpers: YAML parsing (yq wrappers), colored output, result formatting
- `run-gate.sh` — orchestrator: reads gates array, runs in order, supports `--gate <name>`, `--all`, `--continue-on-failure`
- `lint.sh` — ESLint + Prettier checks
- `test.sh` — Vitest + coverage threshold validation
- `data.sh` — build-db + SQLite validation via node script
- `security.sh` — npm audit, gitleaks, license-checker, supply chain, Electron SAST

Conventions:

- Exit codes: 0=pass, 1=fail, 2=error
- Cross-platform: Linux (CI) and Windows (Git Bash)
- All scripts source `_lib.sh`

## GitHub Actions Integration

- `ci.yml` refactored to call `run-gate.sh --all`
- New `quality-gate.yml` reusable workflow (`workflow_call`)
- `release.yml` adds gate prerequisite job before build
- `bump-version-and-release.yml` adds gate prerequisite before tagging
- Gate summary posted as PR comment

## Claude Code Integration

### Agents (`.claude/agents/`)

- `quality-gate-agent.md` — local enforcement + intelligent triage
- `pr-review-agent.md` — contextual PR review using gate results
- `data-agent.md` — data pipeline specialist

### Skills (`.claude/skills/`)

- `run-gates.md` — invoke gates with AI-interpreted results
- `security-review.md` — security-focused scan + remediation

### Hooks

- Pre-commit hook config triggering quality-gate-agent

## Codex Integration

- `.codex/instructions.md` — gate enforcement instructions
- `.codex/agents.md` — agent definitions
- `.codex/setup.sh` — environment bootstrap (yq, npm ci, chmod)

## New Dependencies

**Dev dependencies:**

- eslint, @eslint/js, typescript-eslint
- prettier, eslint-config-prettier
- @vitest/coverage-v8
- license-checker

**External tools (CI/setup):**

- yq (YAML parser)
- gitleaks (secrets detection)

**Config files:**

- eslint.config.mjs
- .prettierrc
- .gitleaks.toml (optional)

## File Tree

16 new files, 4 modified files, 0 deleted.
