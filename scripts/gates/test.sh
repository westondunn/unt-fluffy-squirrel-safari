#!/usr/bin/env bash
# Quality Gate: Test & Coverage
# Runs Vitest with coverage and validates thresholds from manifest

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_lib.sh"

require_yq

COVERAGE_LINES=$(manifest_get '.thresholds.test.coverage.lines')
COVERAGE_BRANCHES=$(manifest_get '.thresholds.test.coverage.branches')
COVERAGE_FUNCTIONS=$(manifest_get '.thresholds.test.coverage.functions')

EXIT_CODE=0

# --- Run tests with coverage ---
gate_info "Running Vitest with coverage..."
gate_info "Thresholds: lines=${COVERAGE_LINES}% branches=${COVERAGE_BRANCHES}% functions=${COVERAGE_FUNCTIONS}%"

set +e
npx vitest run --coverage --coverage.reporter=json-summary --coverage.reporter=text 2>&1
TEST_EXIT=$?
set -e

if [[ $TEST_EXIT -ne 0 ]]; then
  gate_fail "Tests failed (exit code: ${TEST_EXIT})"
  EXIT_CODE=1
fi

# --- Validate coverage thresholds ---
COVERAGE_FILE="${REPO_ROOT}/coverage/coverage-summary.json"

if [[ -f "$COVERAGE_FILE" ]]; then
  gate_info "Checking coverage thresholds..."

  # Parse coverage from JSON summary using node (cross-platform)
  ACTUAL=$(node -e "
    const c = require('${COVERAGE_FILE//\\/\/}');
    const t = c.total;
    console.log(JSON.stringify({
      lines: t.lines.pct,
      branches: t.branches.pct,
      functions: t.functions.pct
    }));
  ")

  ACTUAL_LINES=$(echo "$ACTUAL" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(0,'utf8')).lines))")
  ACTUAL_BRANCHES=$(echo "$ACTUAL" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(0,'utf8')).branches))")
  ACTUAL_FUNCTIONS=$(echo "$ACTUAL" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(0,'utf8')).functions))")

  check_threshold() {
    local name="$1" actual="$2" threshold="$3"
    local pass
    pass=$(node -e "process.stdout.write(Number($actual) >= Number($threshold) ? 'true' : 'false')")
    if [[ "$pass" == "true" ]]; then
      gate_pass "${name}: ${actual}% >= ${threshold}%"
    else
      gate_fail "${name}: ${actual}% < ${threshold}% (required)"
      EXIT_CODE=1
    fi
  }

  check_threshold "Lines" "$ACTUAL_LINES" "$COVERAGE_LINES"
  check_threshold "Branches" "$ACTUAL_BRANCHES" "$COVERAGE_BRANCHES"
  check_threshold "Functions" "$ACTUAL_FUNCTIONS" "$COVERAGE_FUNCTIONS"
else
  if [[ $TEST_EXIT -eq 0 ]]; then
    gate_warn "Coverage file not found — tests passed but coverage could not be validated"
    gate_warn "Expected: ${COVERAGE_FILE}"
  fi
fi

exit $EXIT_CODE
