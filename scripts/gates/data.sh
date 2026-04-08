#!/usr/bin/env bash
# Quality Gate: Data Pipeline Validation
# Runs build-db and validates the output database

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_lib.sh"

require_yq

EXIT_CODE=0

# --- Run build-db ---
gate_info "Running data pipeline (npm run build:db)..."

set +e
npm run build:db 2>&1
BUILD_EXIT=$?
set -e

if [[ $BUILD_EXIT -ne 0 ]]; then
  gate_fail "build:db failed (exit code: ${BUILD_EXIT})"
  exit 1
fi

gate_pass "build:db completed"

# --- Validate database ---
DB_PATH="${REPO_ROOT}/data/squirrels.db"

if [[ ! -f "$DB_PATH" ]]; then
  gate_fail "Database file not found: data/squirrels.db"
  exit 1
fi

gate_info "Validating database: data/squirrels.db"

# Use node + sql.js to validate (cross-platform, no sqlite3 binary needed)
VALIDATION_RESULT=$(node -e "
const fs = require('fs');
const path = require('path');

async function validate() {
  // sql.js is a project dependency
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  const dbPath = path.resolve('${DB_PATH//\\/\/}');
  const buf = fs.readFileSync(dbPath);
  const db = new SQL.Database(buf);

  const errors = [];
  const manifest = require('child_process')
    .execSync('yq eval -o=json . \"${MANIFEST//\\/\/}\"')
    .toString();
  const config = JSON.parse(manifest);
  const dataConfig = config.thresholds.data;

  // Check required tables
  const tablesResult = db.exec(\"SELECT name FROM sqlite_master WHERE type='table'\");
  const tables = tablesResult.length > 0 ? tablesResult[0].values.map(r => r[0]) : [];

  for (const table of dataConfig.required_tables) {
    if (tables.includes(table)) {
      console.log('PASS:table_exists:' + table);
    } else {
      console.log('FAIL:table_missing:' + table);
      errors.push('Missing table: ' + table);
    }
  }

  // Check min rows
  if (dataConfig.min_rows) {
    for (const [table, minRows] of Object.entries(dataConfig.min_rows)) {
      if (!tables.includes(table)) continue;
      const countResult = db.exec('SELECT COUNT(*) FROM ' + table);
      const count = countResult[0].values[0][0];
      if (count >= minRows) {
        console.log('PASS:row_count:' + table + ':' + count + '>=' + minRows);
      } else {
        console.log('FAIL:row_count:' + table + ':' + count + '<' + minRows);
        errors.push(table + ' has ' + count + ' rows, need ' + minRows);
      }
    }
  }

  db.close();

  if (errors.length > 0) {
    process.exit(1);
  }
}

validate().catch(e => {
  console.error('FAIL:validation_error:' + e.message);
  process.exit(1);
});
" 2>&1)

# Parse validation output
while IFS= read -r line; do
  if [[ "$line" == PASS:* ]]; then
    local_msg="${line#PASS:}"
    gate_pass "$local_msg"
  elif [[ "$line" == FAIL:* ]]; then
    local_msg="${line#FAIL:}"
    gate_fail "$local_msg"
    EXIT_CODE=1
  fi
done <<< "$VALIDATION_RESULT"

if [[ $EXIT_CODE -eq 0 ]]; then
  gate_pass "Data pipeline validation complete"
fi

exit $EXIT_CODE
