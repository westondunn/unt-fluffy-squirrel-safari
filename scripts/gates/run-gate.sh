#!/usr/bin/env bash
# Quality Gate Orchestrator
# Reads quality-gates.yml and runs gate scripts in order
#
# Usage:
#   ./scripts/gates/run-gate.sh [--all] [--gate <name>] [--continue-on-failure]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_lib.sh"

require_yq

# Parse arguments
RUN_ALL=true
SINGLE_GATE=""
CONTINUE_ON_FAILURE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --all)
      RUN_ALL=true
      shift
      ;;
    --gate)
      RUN_ALL=false
      SINGLE_GATE="$2"
      shift 2
      ;;
    --continue-on-failure)
      CONTINUE_ON_FAILURE=true
      shift
      ;;
    *)
      echo "Unknown argument: $1"
      echo "Usage: run-gate.sh [--all] [--gate <name>] [--continue-on-failure]"
      exit 2
      ;;
  esac
done

echo -e "${BOLD}Quality Gate Orchestrator${RESET}"
echo -e "Manifest: ${MANIFEST}"
echo ""

# Get gate count
GATE_COUNT=$(yq eval '.gates | length' "$MANIFEST")

if [[ "$GATE_COUNT" -eq 0 ]]; then
  echo -e "${YELLOW}No gates defined in manifest.${RESET}"
  exit 0
fi

# Run gates
OVERALL_EXIT=0
TOTAL_START=$(timer_start)

for ((i = 0; i < GATE_COUNT; i++)); do
  GATE_NAME=$(yq eval ".gates[$i].name" "$MANIFEST")
  GATE_SCRIPT=$(yq eval ".gates[$i].script" "$MANIFEST")

  # If running a single gate, skip non-matching
  if [[ "$RUN_ALL" == false && "$GATE_NAME" != "$SINGLE_GATE" ]]; then
    continue
  fi

  GATE_PATH="${REPO_ROOT}/${GATE_SCRIPT}"

  if [[ ! -f "$GATE_PATH" ]]; then
    gate_header "$GATE_NAME"
    gate_fail "Script not found: ${GATE_SCRIPT}"
    gate_record "$GATE_NAME" "ERROR" "0"
    OVERALL_EXIT=1
    if [[ "$CONTINUE_ON_FAILURE" == false ]]; then
      break
    fi
    continue
  fi

  START=$(timer_start)
  gate_header "$GATE_NAME"

  set +e
  bash "$GATE_PATH"
  EXIT_CODE=$?
  set -e

  ELAPSED=$(timer_elapsed "$START")

  if [[ $EXIT_CODE -eq 0 ]]; then
    gate_record "$GATE_NAME" "PASS" "$ELAPSED"
  else
    gate_record "$GATE_NAME" "FAIL" "$ELAPSED"
    OVERALL_EXIT=1
    if [[ "$CONTINUE_ON_FAILURE" == false ]]; then
      break
    fi
  fi
done

TOTAL_ELAPSED=$(timer_elapsed "$TOTAL_START")
gate_info "Total duration: ${TOTAL_ELAPSED}s"

# Print summary (gate_summary returns 1 if any failed)
set +e
gate_summary
set -e

exit $OVERALL_EXIT
