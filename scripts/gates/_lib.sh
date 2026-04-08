#!/usr/bin/env bash
# Shared helpers for quality gate scripts
# Provides YAML parsing (yq), colored output, and result formatting

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MANIFEST="${REPO_ROOT}/quality-gates.yml"

# Colors (disabled if no tty)
if [[ -t 1 ]]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  BLUE='\033[0;34m'
  BOLD='\033[1m'
  RESET='\033[0m'
else
  RED='' GREEN='' YELLOW='' BLUE='' BOLD='' RESET=''
fi

# Check yq is available
require_yq() {
  if ! command -v yq &>/dev/null; then
    echo -e "${RED}Error: yq is required but not installed.${RESET}"
    echo "Install: https://github.com/mikefarah/yq#install"
    echo "  brew install yq  |  choco install yq  |  go install github.com/mikefarah/yq/v4@latest"
    exit 2
  fi
}

# Read a value from the manifest
# Usage: manifest_get '.thresholds.test.pass_rate'
manifest_get() {
  yq eval "$1" "$MANIFEST"
}

# Read a list from the manifest as newline-separated values
# Usage: manifest_list '.thresholds.data.required_tables[]'
manifest_list() {
  yq eval "$1" "$MANIFEST"
}

# Print gate header
gate_header() {
  local name="$1"
  echo ""
  echo -e "${BOLD}${BLUE}=== Quality Gate: ${name} ===${RESET}"
  echo ""
}

# Print pass result
gate_pass() {
  local msg="${1:-Gate passed}"
  echo -e "  ${GREEN}PASS${RESET} ${msg}"
}

# Print fail result
gate_fail() {
  local msg="${1:-Gate failed}"
  echo -e "  ${RED}FAIL${RESET} ${msg}"
}

# Print warning
gate_warn() {
  local msg="${1:-Warning}"
  echo -e "  ${YELLOW}WARN${RESET} ${msg}"
}

# Print info
gate_info() {
  local msg="${1:-}"
  echo -e "  ${BLUE}INFO${RESET} ${msg}"
}

# Track gate results for summary
declare -a GATE_RESULTS=()
declare -a GATE_NAMES=()
declare -a GATE_DURATIONS=()

gate_record() {
  local name="$1" result="$2" duration="$3"
  GATE_NAMES+=("$name")
  GATE_RESULTS+=("$result")
  GATE_DURATIONS+=("$duration")
}

# Print summary table
gate_summary() {
  echo ""
  echo -e "${BOLD}=== Quality Gate Summary ===${RESET}"
  echo ""
  printf "  %-15s %-8s %s\n" "GATE" "STATUS" "DURATION"
  printf "  %-15s %-8s %s\n" "----" "------" "--------"

  local any_failed=0
  for i in "${!GATE_NAMES[@]}"; do
    local status_color="${GREEN}"
    if [[ "${GATE_RESULTS[$i]}" != "PASS" ]]; then
      status_color="${RED}"
      any_failed=1
    fi
    printf "  %-15s ${status_color}%-8s${RESET} %s\n" \
      "${GATE_NAMES[$i]}" "${GATE_RESULTS[$i]}" "${GATE_DURATIONS[$i]}s"
  done
  echo ""

  if [[ $any_failed -eq 1 ]]; then
    echo -e "${RED}${BOLD}Quality gates FAILED${RESET}"
    return 1
  else
    echo -e "${GREEN}${BOLD}All quality gates PASSED${RESET}"
    return 0
  fi
}

# Timer helpers
timer_start() {
  date +%s
}

timer_elapsed() {
  local start="$1"
  local end
  end=$(date +%s)
  echo $((end - start))
}
