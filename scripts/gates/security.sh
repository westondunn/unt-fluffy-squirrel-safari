#!/usr/bin/env bash
# Quality Gate: Security Scanning
# npm audit, secrets detection, license compliance, supply chain, Electron SAST

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_lib.sh"

require_yq

AUDIT_LEVEL=$(manifest_get '.thresholds.security.npm_audit_level')
SECRETS_SCAN=$(manifest_get '.thresholds.security.secrets_scan')
LOCKFILE_INTEGRITY=$(manifest_get '.thresholds.security.supply_chain.lockfile_integrity')
PINNED_ACTIONS=$(manifest_get '.thresholds.security.supply_chain.pinned_actions')
ELECTRON_RULES=$(manifest_get '.thresholds.security.sast.electron_rules')

EXIT_CODE=0

# --- 1. npm audit ---
gate_info "Running npm audit (level: ${AUDIT_LEVEL})..."

set +e
npm audit --audit-level="${AUDIT_LEVEL}" 2>&1
AUDIT_EXIT=$?
set -e

if [[ $AUDIT_EXIT -ne 0 ]]; then
  gate_fail "npm audit found vulnerabilities at ${AUDIT_LEVEL}+ level"
  EXIT_CODE=1
else
  gate_pass "npm audit"
fi

# --- 2. Secrets detection ---
if [[ "$SECRETS_SCAN" == "true" ]]; then
  gate_info "Scanning for secrets..."

  if command -v gitleaks &>/dev/null; then
    set +e
    gitleaks detect --source="${REPO_ROOT}" --no-git 2>&1
    SECRETS_EXIT=$?
    set -e

    if [[ $SECRETS_EXIT -ne 0 ]]; then
      gate_fail "gitleaks found potential secrets"
      EXIT_CODE=1
    else
      gate_pass "No secrets detected (gitleaks)"
    fi
  else
    # Fallback: grep-based pattern matching for common secrets
    gate_info "gitleaks not installed — using pattern-based scan"

    PATTERNS=(
      'AKIA[0-9A-Z]{16}'                    # AWS access key
      '(?i)(api[_-]?key|apikey)\s*[:=]\s*["\x27][A-Za-z0-9_\-]{20,}'  # Generic API key
      '(?i)(secret|password|passwd|token)\s*[:=]\s*["\x27][^\s"'\'']{8,}'  # Secrets
      'ghp_[A-Za-z0-9_]{36}'                # GitHub personal access token
      'sk-[A-Za-z0-9]{48}'                  # OpenAI key
    )

    SECRETS_FOUND=false
    for pattern in "${PATTERNS[@]}"; do
      set +e
      MATCHES=$(grep -rPn "$pattern" "${REPO_ROOT}/src" "${REPO_ROOT}/scripts" --include='*.ts' --include='*.js' --include='*.tsx' --include='*.json' 2>/dev/null | grep -v 'node_modules' | grep -v '.git/' || true)
      set -e
      if [[ -n "$MATCHES" ]]; then
        gate_fail "Potential secret found matching pattern"
        echo "$MATCHES" | head -5
        SECRETS_FOUND=true
      fi
    done

    if [[ "$SECRETS_FOUND" == true ]]; then
      EXIT_CODE=1
    else
      gate_pass "No secrets detected (pattern scan)"
    fi
  fi
fi

# --- 3. License compliance ---
gate_info "Checking license compliance..."

LICENSE_DENY=$(manifest_list '.thresholds.security.license_deny[]')

if command -v npx &>/dev/null && npm ls license-checker &>/dev/null 2>&1; then
  DENY_LIST=""
  while IFS= read -r lic; do
    [[ -z "$lic" ]] && continue
    DENY_LIST="${DENY_LIST};${lic}"
  done <<< "$LICENSE_DENY"
  DENY_LIST="${DENY_LIST:1}" # remove leading ;

  set +e
  npx license-checker --failOn "$DENY_LIST" --summary 2>&1
  LICENSE_EXIT=$?
  set -e

  if [[ $LICENSE_EXIT -ne 0 ]]; then
    gate_fail "Denied licenses found: ${DENY_LIST}"
    EXIT_CODE=1
  else
    gate_pass "License compliance"
  fi
else
  gate_warn "license-checker not available — skipping license check"
  gate_info "Install with: npm install --save-dev license-checker"
fi

# --- 4. Supply chain: lockfile integrity ---
if [[ "$LOCKFILE_INTEGRITY" == "true" ]]; then
  gate_info "Verifying lockfile integrity..."

  set +e
  npm ci --ignore-scripts --dry-run 2>&1
  LOCK_EXIT=$?
  set -e

  if [[ $LOCK_EXIT -ne 0 ]]; then
    gate_fail "Lockfile integrity check failed (package-lock.json out of sync)"
    EXIT_CODE=1
  else
    gate_pass "Lockfile integrity"
  fi
fi

# --- 5. Supply chain: pinned GitHub Actions ---
if [[ "$PINNED_ACTIONS" == "true" ]]; then
  gate_info "Checking GitHub Actions pinning..."

  WORKFLOWS_DIR="${REPO_ROOT}/.github/workflows"
  UNPINNED=false

  if [[ -d "$WORKFLOWS_DIR" ]]; then
    # Find uses: lines that reference third-party actions without a SHA
    # Allow actions/* (first-party) at any ref, but third-party must use @sha or @vN
    while IFS= read -r file; do
      while IFS= read -r line; do
        # Extract action reference (owner/repo@ref)
        if [[ "$line" =~ uses:[[:space:]]*([^[:space:]]+)@([^[:space:]]+) ]]; then
          ACTION="${BASH_REMATCH[1]}"
          REF="${BASH_REMATCH[2]}"

          # Skip first-party GitHub actions
          if [[ "$ACTION" == actions/* ]]; then
            continue
          fi

          # Check if ref is a SHA (40 hex chars) or semver tag
          if [[ ! "$REF" =~ ^[0-9a-f]{40}$ && ! "$REF" =~ ^v[0-9]+(\.[0-9]+)*$ ]]; then
            gate_warn "Unpinned action: ${ACTION}@${REF} in $(basename "$file")"
            UNPINNED=true
          fi
        fi
      done < "$file"
    done < <(find "$WORKFLOWS_DIR" -name '*.yml' -o -name '*.yaml')

    if [[ "$UNPINNED" == true ]]; then
      gate_fail "Found unpinned third-party GitHub Actions"
      EXIT_CODE=1
    else
      gate_pass "All third-party GitHub Actions are pinned"
    fi
  else
    gate_warn "No .github/workflows directory found"
  fi
fi

# --- 6. Electron SAST ---
if [[ "$ELECTRON_RULES" == "true" ]]; then
  gate_info "Running Electron security checks..."

  MAIN_DIR="${REPO_ROOT}/src/main"
  PRELOAD_DIR="${REPO_ROOT}/src/preload"
  ELECTRON_ISSUES=false

  # Check for dangerous Electron settings
  for dir in "$MAIN_DIR" "$PRELOAD_DIR"; do
    [[ ! -d "$dir" ]] && continue

    # nodeIntegration should be false
    set +e
    NI_MATCHES=$(grep -rn 'nodeIntegration\s*:\s*true' "$dir" 2>/dev/null || true)
    set -e
    if [[ -n "$NI_MATCHES" ]]; then
      gate_fail "nodeIntegration: true found (should be false)"
      echo "$NI_MATCHES"
      ELECTRON_ISSUES=true
    fi

    # contextIsolation should be true
    set +e
    CI_MATCHES=$(grep -rn 'contextIsolation\s*:\s*false' "$dir" 2>/dev/null || true)
    set -e
    if [[ -n "$CI_MATCHES" ]]; then
      gate_fail "contextIsolation: false found (should be true)"
      echo "$CI_MATCHES"
      ELECTRON_ISSUES=true
    fi

    # webSecurity should not be disabled
    set +e
    WS_MATCHES=$(grep -rn 'webSecurity\s*:\s*false' "$dir" 2>/dev/null || true)
    set -e
    if [[ -n "$WS_MATCHES" ]]; then
      gate_fail "webSecurity: false found (should not be disabled)"
      echo "$WS_MATCHES"
      ELECTRON_ISSUES=true
    fi
  done

  if [[ "$ELECTRON_ISSUES" == true ]]; then
    EXIT_CODE=1
  else
    gate_pass "Electron security settings"
  fi
fi

exit $EXIT_CODE
