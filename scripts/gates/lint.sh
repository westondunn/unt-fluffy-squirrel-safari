#!/usr/bin/env bash
# Quality Gate: Lint & Format
# Runs ESLint and Prettier, optionally auto-fixes locally

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_lib.sh"

require_yq

FIX_ON_FAILURE=$(manifest_get '.thresholds.lint.fix_on_failure')
IS_CI="${CI:-false}"
EXIT_CODE=0

# --- ESLint ---
gate_info "Running ESLint..."

set +e
npx eslint . --max-warnings 0 2>&1
ESLINT_EXIT=$?
set -e

if [[ $ESLINT_EXIT -ne 0 ]]; then
  if [[ "$FIX_ON_FAILURE" == "true" && "$IS_CI" == "false" ]]; then
    gate_warn "ESLint failed — attempting auto-fix..."
    npx eslint . --fix 2>&1 || true

    # Re-check after fix
    set +e
    npx eslint . --max-warnings 0 2>&1
    ESLINT_EXIT=$?
    set -e

    if [[ $ESLINT_EXIT -eq 0 ]]; then
      gate_pass "ESLint passed after auto-fix (files modified — review staged changes)"
    else
      gate_fail "ESLint still has errors after auto-fix"
      EXIT_CODE=1
    fi
  else
    gate_fail "ESLint found errors"
    EXIT_CODE=1
  fi
else
  gate_pass "ESLint"
fi

# --- Prettier ---
gate_info "Running Prettier..."

set +e
npx prettier --check . 2>&1
PRETTIER_EXIT=$?
set -e

if [[ $PRETTIER_EXIT -ne 0 ]]; then
  if [[ "$FIX_ON_FAILURE" == "true" && "$IS_CI" == "false" ]]; then
    gate_warn "Prettier found formatting issues — attempting auto-fix..."
    npx prettier --write . 2>&1 || true

    set +e
    npx prettier --check . 2>&1
    PRETTIER_EXIT=$?
    set -e

    if [[ $PRETTIER_EXIT -eq 0 ]]; then
      gate_pass "Prettier passed after auto-fix (files modified — review staged changes)"
    else
      gate_fail "Prettier still has issues after auto-fix"
      EXIT_CODE=1
    fi
  else
    gate_fail "Prettier found formatting issues"
    EXIT_CODE=1
  fi
else
  gate_pass "Prettier"
fi

exit $EXIT_CODE
