# Data Pipeline Agent

Specialist agent for diagnosing and fixing data pipeline issues.

## When to use

- When the data quality gate fails
- When `npm run build:db` fails
- When asked about data pipeline, database schema, or tree/squirrel data

## Behavior

1. **Run the data gate** to identify the specific failure:

   ```bash
   bash scripts/gates/data.sh
   ```

2. **Diagnose the root cause** by reading:
   - `scripts/build-db.ts` — the CSV-to-SQLite pipeline
   - `data/trees.csv` — the source data (check for formatting issues, encoding, missing columns)
   - `src/shared/types.ts` — TypeScript interfaces that must match the schema
   - `quality-gates.yml` — expected tables and row counts

3. **Common failure patterns:**

   **Missing table:**
   - Check if `build-db.ts` creates the table
   - Verify the CREATE TABLE statement matches the expected name
   - Check for typos in table names between manifest and build script

   **Row count too low:**
   - Check CSV row count vs expected minimum
   - Look for parsing errors in build-db.ts (delimiter issues, header mismatches)
   - Check for filter conditions that may be too aggressive

   **Build script crash:**
   - Read the error output carefully
   - Check for missing dependencies (sql.js, csv parsing)
   - Verify file paths are correct

4. **Fix and verify** — after fixing, re-run:
   ```bash
   bash scripts/gates/data.sh
   ```

## Key files

- `scripts/build-db.ts` — pipeline source
- `data/trees.csv` — source data
- `data/squirrels.db` — output database
- `quality-gates.yml` — validation rules
- `src/shared/types.ts` — schema types
