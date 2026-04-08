# Increase Test Coverage — Design Spec

**Date**: 2026-04-08
**Goal**: Raise backend test coverage to 70%+ lines/functions, raise quality gate thresholds

## Current State

| Module                    | Lines     | Functions  | Branches   |
| ------------------------- | --------- | ---------- | ---------- |
| `scripts/build-db.ts`     | 74.03%    | 100%       | 81.81%     |
| `src/main/game-engine.ts` | 33.75%    | 28.57%     | 100%       |
| `src/main/ollama.ts`      | 16.23%    | 20%        | 100%       |
| `src/main/db.ts`          | 10.87%    | 0%         | 100%       |
| **Total**                 | **43.7%** | **20.93%** | **88.23%** |

Quality gate thresholds: 30% lines, 30% branches, 20% functions.

## Approach

**In-memory SQLite + vi.mock** (Approach A):

- `db.ts`: Mock `sql.js` and `fs` so `initDB()` creates an in-memory database with the real schema. Test all 25 exported functions against real SQL.
- `game-engine.ts`: `vi.mock('../src/main/db')` to stub db calls. Test the 5 untested functions (`buildStats`, `checkAndAwardBadges`, `handleDiscoverZone`, `handleLogSighting`, `handleCompleteQuest`).
- `ollama.ts`: `vi.mock('../src/main/db')` + mock `global.fetch`. Test the 4 untested functions (`checkOllamaStatus`, `chat`, `fallbackQuest`, `generateQuest`).
- Raise quality gate thresholds.

## Test Suite 1: `tests/db.test.ts` (~35-40 tests)

### Setup

- `vi.mock('sql.js')` to return an in-memory Database
- `vi.mock('fs')` to stub `existsSync` (returns true for dev path), `readFileSync` (returns empty buffer), `writeFileSync` (no-op)
- `beforeEach`: call `initDB()`, then run CREATE TABLE statements for all tables (`trees`, `hotspots`, `sightings`, `badges`, `quest_log`, `player`, `settings`), seed minimal data
- `afterEach`: call `closeDB()`

### Test Groups

**Lifecycle** (`initDB`, `closeDB`, `saveDB`):

- `initDB` sets up the database without throwing
- `closeDB` saves and closes (subsequent calls to getDB throw)
- `saveDB` throws when db not initialized

**Trees** (`queryTrees`):

- Returns trees within bounding box
- Returns empty array when no trees match
- Filters correctly on lat/lon boundaries

**Hotspots** (`getAllHotspots`, `queryHotspots`, `getHotspotById`, `discoverZone`):

- `getAllHotspots` returns all hotspots with `discovered` mapped to boolean
- `queryHotspots` filters by lat/lon radius
- `getHotspotById` returns matching hotspot or null
- `discoverZone` sets discovered=1 and returns updated hotspot

**Sightings** (`logSighting`, `getSightings`):

- `logSighting` inserts and returns the sighting with an id
- `getSightings` returns all sightings ordered by timestamp desc
- `getSightings(hotspotId)` filters by hotspot

**Badges** (`getBadges`, `earnBadge`):

- `getBadges` returns badges with `earned` as boolean, lazily adds columns
- `earnBadge` updates earned=1 and sets earned_at

**Quests** (`getQuests`, `addQuest`, `completeQuest`):

- `addQuest` inserts and returns quest with status='active'
- `getQuests` returns quests ordered by started_at desc
- `completeQuest` updates status and completed_at

**Player** (`getPlayer`, `addScore`, `incrementStat`, `updateLastSeen`):

- `getPlayer` returns the player row
- `addScore` increments score, xp, and recalculates level
- `incrementStat('streak')` increments streak by 1
- `updateLastSeen` sets last_seen to current timestamp

**Settings** (`getSetting`, `setSetting`):

- `setSetting` + `getSetting` round-trips a value
- `getSetting` returns undefined for missing key
- `setSetting` upserts (INSERT OR REPLACE)

## Test Suite 2: `tests/game-engine.test.ts` (expand, ~15-18 new tests)

### Setup

- `vi.mock('../src/main/db')` at top of file
- `beforeEach`: configure mock returns for `db.getPlayer()`, `db.getSightings()`, `db.getBadges()`, `db.getAllHotspots()`, `db.getQuests()`, `db.getSetting()`

### New Test Groups

**handleDiscoverZone**:

- Returns score + zone_discovered events on success
- Returns empty events when hotspot is null (not found)
- Detects level-up when score crosses 500 boundary
- Triggers badge award when criteria met

**handleLogSighting**:

- Returns score event with correct points (50)
- Detects level-up
- Calls `db.logSighting` with correct args

**handleCompleteQuest**:

- Returns score event with correct points (300)
- Detects level-up
- Calls `db.completeQuest` then awards points

**checkAndAwardBadges** (tested via handlers):

- Awards badge when criteria pass, skips already-earned
- Awards EARN_BADGE bonus points (200)
- Cascading level-up from badge bonus

## Test Suite 3: `tests/ollama.test.ts` (expand, ~15-18 new tests)

### Setup

- `vi.mock('../src/main/db')` at top of file
- Mock `global.fetch` via `vi.fn()`
- `beforeEach`: reset mocks, configure default db returns

### New Test Groups

**checkOllamaStatus**:

- Returns online=true when default URL responds OK
- Returns online=true with custom URL when configured
- Falls back to default URL when custom URL fails
- Returns online=false when all URLs fail
- Respects timeout (abort controller)

**chat**:

- Sends system prompt + user messages to correct URL
- Returns message content on success
- Throws on HTTP error status
- Throws on API error in response body
- Throws on empty response
- Increments chat_count in settings

**fallbackQuest**:

- Returns hotspot-specific text when name provided
- Returns generic text when name is null

**generateQuest**:

- Returns AI-generated quest when Ollama is online
- Saves quest to db via `addQuest`
- Falls back to fallback quest when Ollama is offline
- Falls back on fetch error, still saves to db

## Quality Gate Threshold Changes

Update `quality-gates.yml`:

```yaml
thresholds:
  test:
    pass_rate: 100
    coverage:
      lines: 60 # was 30
      branches: 60 # was 30
      functions: 50 # was 20
```

## Target State

| Module                    | Lines (target)  | Functions (target) |
| ------------------------- | --------------- | ------------------ |
| `src/main/db.ts`          | 75%+            | 80%+               |
| `src/main/game-engine.ts` | 75%+            | 85%+               |
| `src/main/ollama.ts`      | 70%+            | 80%+               |
| `scripts/build-db.ts`     | 74% (unchanged) | 100% (unchanged)   |
| **Total**                 | **70%+**        | **70%+**           |

## Files to Create/Modify

- **Create**: `tests/db.test.ts`
- **Modify**: `tests/game-engine.test.ts` (add handler tests)
- **Modify**: `tests/ollama.test.ts` (add async function tests)
- **Modify**: `quality-gates.yml` (raise thresholds)

## Out of Scope

- React component tests (would require @testing-library/react + jsdom)
- IPC handler tests (excluded from coverage config)
- Electron main process tests (excluded from coverage config)
- End-to-end tests
