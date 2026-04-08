# Increase Test Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise backend test coverage from 43.7% to 70%+ lines/functions and increase quality gate thresholds.

**Architecture:** Three test suites target the three backend modules. `db.test.ts` uses an in-memory sql.js database with the real schema to test all 25 db functions. `game-engine.test.ts` and `ollama.test.ts` use `vi.mock` to stub db calls and `global.fetch` to test async handlers. Quality gate thresholds are raised last.

**Tech Stack:** Vitest 3.0.4, sql.js 1.14.1 (in-memory), vi.mock, vi.fn

**Spec:** `docs/superpowers/specs/2026-04-08-increase-test-coverage-design.md`

---

## File Structure

| Action | File                        | Responsibility                                        |
| ------ | --------------------------- | ----------------------------------------------------- |
| Create | `tests/db.test.ts`          | All 25 exported db functions against in-memory SQLite |
| Modify | `tests/game-engine.test.ts` | Add handler tests with mocked db                      |
| Modify | `tests/ollama.test.ts`      | Add async function tests with mocked db + fetch       |
| Modify | `quality-gates.yml:7-9`     | Raise coverage thresholds                             |

---

### Task 1: Create db.test.ts — Setup and Lifecycle Tests

**Files:**

- Create: `tests/db.test.ts`

- [ ] **Step 1: Create the test file with in-memory db setup**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';

// We need to mock fs and sql.js so initDB() creates an in-memory database
// instead of reading from disk.

let memDb: Database;

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(() => true),
    readFileSync: vi.fn(() => Buffer.alloc(0)),
    writeFileSync: vi.fn(),
  },
  existsSync: vi.fn(() => true),
  readFileSync: vi.fn(() => Buffer.alloc(0)),
  writeFileSync: vi.fn(),
}));

vi.mock('sql.js', async () => {
  const actual = await vi.importActual<typeof import('sql.js')>('sql.js');
  return {
    default: vi.fn(async () => {
      const SQL = await actual.default();
      return {
        Database: class {
          constructor() {
            // Create a fresh in-memory database
            memDb = new SQL.Database();
            // Copy all methods from the real database to this instance
            return memDb;
          }
        },
      };
    }),
  };
});

import {
  initDB,
  closeDB,
  saveDB,
  queryTrees,
  getAllHotspots,
  queryHotspots,
  getHotspotById,
  discoverZone,
  logSighting,
  getSightings,
  getBadges,
  earnBadge,
  getQuests,
  addQuest,
  completeQuest,
  getPlayer,
  addScore,
  incrementStat,
  updateLastSeen,
  getSetting,
  setSetting,
} from '../src/main/db';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS trees (
    id        INTEGER PRIMARY KEY,
    fid       INTEGER,
    unt_id    INTEGER,
    name_comn TEXT,
    memorial  TEXT,
    elevation REAL,
    lat       REAL NOT NULL,
    lon       REAL NOT NULL,
    global_id TEXT
  );
  CREATE TABLE IF NOT EXISTS hotspots (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT,
    lat         REAL NOT NULL,
    lon         REAL NOT NULL,
    radius_m    REAL DEFAULT 50,
    score       INTEGER DEFAULT 1,
    tree_count  INTEGER DEFAULT 0,
    nut_count   INTEGER DEFAULT 0,
    species     TEXT,
    notes       TEXT,
    discovered  INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS sightings (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    tree_id    INTEGER REFERENCES trees(id),
    hotspot_id INTEGER REFERENCES hotspots(id),
    timestamp  TEXT NOT NULL,
    notes      TEXT,
    photo_path TEXT,
    lat        REAL,
    lon        REAL
  );
  CREATE TABLE IF NOT EXISTS badges (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    name             TEXT UNIQUE NOT NULL,
    description      TEXT,
    condition_type   TEXT NOT NULL,
    condition_value  INTEGER NOT NULL,
    icon             TEXT
  );
  CREATE TABLE IF NOT EXISTS quest_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    quest_type  TEXT NOT NULL,
    target_id   INTEGER,
    status      TEXT DEFAULT 'active',
    started_at  TEXT NOT NULL,
    completed_at TEXT
  );
  CREATE TABLE IF NOT EXISTS player (
    id       INTEGER PRIMARY KEY DEFAULT 1,
    name     TEXT DEFAULT 'Explorer',
    level    INTEGER DEFAULT 1,
    xp       INTEGER DEFAULT 0,
    score    INTEGER DEFAULT 0,
    streak   INTEGER DEFAULT 0,
    last_seen TEXT
  );
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );
`;

function seedDB(): void {
  // Seed minimal data for testing
  for (const stmt of SCHEMA.split(';').filter((s) => s.trim())) {
    memDb.run(stmt);
  }

  // Seed a player row (required by getPlayer)
  memDb.run(
    "INSERT INTO player (id, name, level, xp, score, streak) VALUES (1, 'Tester', 1, 0, 0, 0)",
  );

  // Seed trees
  memDb.run(
    "INSERT INTO trees (id, fid, unt_id, name_comn, memorial, elevation, lat, lon, global_id) VALUES (1, 100, 200, 'Live Oak', 'N', 600, 33.210, -97.150, 'g1')",
  );
  memDb.run(
    "INSERT INTO trees (id, fid, unt_id, name_comn, memorial, elevation, lat, lon, global_id) VALUES (2, 101, 201, 'Pecan', 'N', 610, 33.215, -97.155, 'g2')",
  );
  memDb.run(
    "INSERT INTO trees (id, fid, unt_id, name_comn, memorial, elevation, lat, lon, global_id) VALUES (3, 102, 202, 'Cedar Elm', 'Y', 620, 33.300, -97.200, 'g3')",
  );

  // Seed hotspots
  memDb.run(
    "INSERT INTO hotspots (name, lat, lon, radius_m, score, tree_count, nut_count, species, notes, discovered) VALUES ('Oak Alley', 33.210, -97.150, 50, 4, 10, 8, 'Live Oak, Pecan', '10 trees', 0)",
  );
  memDb.run(
    "INSERT INTO hotspots (name, lat, lon, radius_m, score, tree_count, nut_count, species, notes, discovered) VALUES ('Pecan Grove', 33.215, -97.155, 50, 3, 5, 5, 'Pecan', '5 trees', 1)",
  );

  // Seed badges
  memDb.run(
    "INSERT INTO badges (name, description, condition_type, condition_value, icon) VALUES ('First Find', 'Discover your first hotspot', 'discover_count', 1, 'badge-first')",
  );
  memDb.run(
    "INSERT INTO badges (name, description, condition_type, condition_value, icon) VALUES ('Explorer', 'Discover 5 hotspots', 'discover_count', 5, 'badge-explorer')",
  );
}

beforeEach(async () => {
  await initDB();
  seedDB();
});

afterEach(() => {
  try {
    closeDB();
  } catch {
    // already closed in test
  }
});
```

- [ ] **Step 2: Add lifecycle tests**

Append to `tests/db.test.ts`:

```ts
// ── lifecycle ────────────────────────────────────────────────────────────────

describe('lifecycle', () => {
  it('initDB sets up the database without throwing', async () => {
    // initDB was already called in beforeEach — if we got here it succeeded
    expect(memDb).toBeDefined();
  });

  it('saveDB does not throw when db is initialized', () => {
    expect(() => saveDB()).not.toThrow();
  });

  it('closeDB saves and closes the database', () => {
    closeDB();
    // After close, operations should throw
    expect(() => saveDB()).toThrow('DB not initialized');
  });
});
```

- [ ] **Step 3: Run the tests to verify they pass**

Run: `npx vitest run tests/db.test.ts --reporter=verbose`

Expected: 3 passing tests in the lifecycle suite.

- [ ] **Step 4: Commit**

```bash
git add tests/db.test.ts
git commit -m "test: add db.test.ts with lifecycle tests and in-memory SQLite setup"
```

---

### Task 2: db.test.ts — Trees and Hotspots Tests

**Files:**

- Modify: `tests/db.test.ts`

- [ ] **Step 1: Add trees tests**

Append to `tests/db.test.ts`:

```ts
// ── trees ────────────────────────────────────────────────────────────────────

describe('queryTrees', () => {
  it('returns trees within bounding box', () => {
    const trees = queryTrees({ minLat: 33.0, maxLat: 33.22, minLon: -97.2, maxLon: -97.1 });
    expect(trees).toHaveLength(2);
    expect(trees[0].species).toBe('Live Oak');
  });

  it('returns empty array when no trees match', () => {
    const trees = queryTrees({ minLat: 40.0, maxLat: 41.0, minLon: -80.0, maxLon: -79.0 });
    expect(trees).toHaveLength(0);
  });

  it('filters correctly on lat/lon boundaries', () => {
    // Only tree 3 is at 33.300, -97.200
    const trees = queryTrees({ minLat: 33.25, maxLat: 33.35, minLon: -97.25, maxLon: -97.15 });
    expect(trees).toHaveLength(1);
    expect(trees[0].species).toBe('Cedar Elm');
  });
});
```

- [ ] **Step 2: Add hotspot tests**

Append to `tests/db.test.ts`:

```ts
// ── hotspots ─────────────────────────────────────────────────────────────────

describe('getAllHotspots', () => {
  it('returns all hotspots with discovered as boolean', () => {
    const hotspots = getAllHotspots();
    expect(hotspots).toHaveLength(2);
    expect(hotspots[0].discovered).toBe(false);
    expect(hotspots[1].discovered).toBe(true);
  });
});

describe('queryHotspots', () => {
  it('returns hotspots within radius', () => {
    // Oak Alley is at 33.210, -97.150
    const hotspots = queryHotspots(33.21, -97.15, 1);
    expect(hotspots.length).toBeGreaterThanOrEqual(1);
    expect(hotspots.some((h) => h.name === 'Oak Alley')).toBe(true);
  });

  it('returns empty when no hotspots in range', () => {
    const hotspots = queryHotspots(40.0, -80.0, 1);
    expect(hotspots).toHaveLength(0);
  });
});

describe('getHotspotById', () => {
  it('returns the matching hotspot', () => {
    const hotspot = getHotspotById(1);
    expect(hotspot).not.toBeNull();
    expect(hotspot!.name).toBe('Oak Alley');
  });

  it('returns null for non-existent id', () => {
    const hotspot = getHotspotById(999);
    expect(hotspot).toBeNull();
  });
});

describe('discoverZone', () => {
  it('sets discovered to 1 and returns the updated hotspot', () => {
    // Oak Alley starts as discovered=0
    const hotspot = discoverZone(1);
    expect(hotspot).not.toBeNull();
    // Verify in the database
    const all = getAllHotspots();
    const oakAlley = all.find((h) => h.id === 1);
    expect(oakAlley!.discovered).toBe(true);
  });

  it('returns null for non-existent hotspot', () => {
    const hotspot = discoverZone(999);
    // getHotspotById(999) returns null
    expect(hotspot).toBeNull();
  });
});
```

- [ ] **Step 3: Run the tests to verify they pass**

Run: `npx vitest run tests/db.test.ts --reporter=verbose`

Expected: All lifecycle + trees + hotspot tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/db.test.ts
git commit -m "test: add trees and hotspots tests to db.test.ts"
```

---

### Task 3: db.test.ts — Sightings, Badges, Quests Tests

**Files:**

- Modify: `tests/db.test.ts`

- [ ] **Step 1: Add sightings tests**

Append to `tests/db.test.ts`:

```ts
// ── sightings ────────────────────────────────────────────────────────────────

describe('logSighting', () => {
  it('inserts and returns the sighting with an id', () => {
    const sighting = logSighting({
      tree_id: 1,
      hotspot_id: 1,
      lat: 33.21,
      lon: -97.15,
      photo_path: null,
      notes: 'Saw a squirrel!',
      timestamp: '2026-04-08T12:00:00Z',
    });
    expect(sighting.id).toBeDefined();
    expect(sighting.notes).toBe('Saw a squirrel!');
  });

  it('handles null optional fields', () => {
    const sighting = logSighting({
      tree_id: null,
      hotspot_id: null,
      lat: 33.21,
      lon: -97.15,
      photo_path: null,
      notes: 'Quick sighting',
      timestamp: '2026-04-08T13:00:00Z',
    });
    expect(sighting.id).toBeDefined();
    expect(sighting.tree_id).toBeNull();
  });
});

describe('getSightings', () => {
  it('returns all sightings ordered by timestamp desc', () => {
    logSighting({
      tree_id: 1,
      hotspot_id: 1,
      lat: 33.21,
      lon: -97.15,
      photo_path: null,
      notes: 'First',
      timestamp: '2026-04-08T10:00:00Z',
    });
    logSighting({
      tree_id: 2,
      hotspot_id: 1,
      lat: 33.21,
      lon: -97.15,
      photo_path: '/photo.jpg',
      notes: 'Second',
      timestamp: '2026-04-08T11:00:00Z',
    });
    const sightings = getSightings();
    expect(sightings).toHaveLength(2);
    expect(sightings[0].notes).toBe('Second');
  });

  it('filters by hotspot_id when provided', () => {
    logSighting({
      tree_id: 1,
      hotspot_id: 1,
      lat: 33.21,
      lon: -97.15,
      photo_path: null,
      notes: 'Hotspot 1',
      timestamp: '2026-04-08T10:00:00Z',
    });
    logSighting({
      tree_id: 2,
      hotspot_id: 2,
      lat: 33.22,
      lon: -97.16,
      photo_path: null,
      notes: 'Hotspot 2',
      timestamp: '2026-04-08T11:00:00Z',
    });
    const sightings = getSightings(1);
    expect(sightings).toHaveLength(1);
    expect(sightings[0].notes).toBe('Hotspot 1');
  });
});
```

- [ ] **Step 2: Add badge tests**

Append to `tests/db.test.ts`:

```ts
// ── badges ───────────────────────────────────────────────────────────────────

describe('getBadges', () => {
  it('returns badges with earned as boolean', () => {
    const badges = getBadges();
    expect(badges).toHaveLength(2);
    expect(badges[0].earned).toBe(false);
    expect(badges[0].name).toBe('First Find');
  });

  it('lazily adds earned/earned_at columns', () => {
    // getBadges internally calls ensureBadgeColumns — just verify no errors
    const badges = getBadges();
    expect(badges.every((b) => 'earned' in b && 'earned_at' in b)).toBe(true);
  });
});

describe('earnBadge', () => {
  it('sets earned to true and records earned_at', () => {
    earnBadge(1);
    const badges = getBadges();
    const first = badges.find((b) => b.id === 1)!;
    expect(first.earned).toBe(true);
    expect(first.earned_at).not.toBeNull();
  });
});
```

- [ ] **Step 3: Add quest tests**

Append to `tests/db.test.ts`:

```ts
// ── quests ───────────────────────────────────────────────────────────────────

describe('addQuest', () => {
  it('inserts and returns a quest with status active', () => {
    const quest = addQuest('Explore the campus', 1);
    expect(quest.id).toBeDefined();
    expect(quest.status).toBe('active');
    expect(quest.quest_type).toBe('Explore the campus');
    expect(quest.target_id).toBe(1);
  });

  it('handles null target_id', () => {
    const quest = addQuest('General quest', null);
    expect(quest.target_id).toBeNull();
  });
});

describe('getQuests', () => {
  it('returns quests ordered by started_at desc', () => {
    addQuest('Quest A', null);
    addQuest('Quest B', null);
    const quests = getQuests();
    expect(quests).toHaveLength(2);
    // Both have same timestamp precision so just verify count
  });
});

describe('completeQuest', () => {
  it('updates status to completed and sets completed_at', () => {
    const quest = addQuest('Find squirrels', 1);
    completeQuest(quest.id);
    const quests = getQuests();
    const completed = quests.find((q) => q.id === quest.id)!;
    expect(completed.status).toBe('completed');
    expect(completed.completed_at).not.toBeNull();
  });
});
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/db.test.ts --reporter=verbose`

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/db.test.ts
git commit -m "test: add sightings, badges, and quests tests to db.test.ts"
```

---

### Task 4: db.test.ts — Player and Settings Tests

**Files:**

- Modify: `tests/db.test.ts`

- [ ] **Step 1: Add player tests**

Append to `tests/db.test.ts`:

```ts
// ── player ───────────────────────────────────────────────────────────────────

describe('getPlayer', () => {
  it('returns the player row', () => {
    const player = getPlayer();
    expect(player.id).toBe(1);
    expect(player.name).toBe('Tester');
    expect(player.level).toBe(1);
    expect(player.score).toBe(0);
  });
});

describe('addScore', () => {
  it('increments score and xp', () => {
    const player = addScore(100);
    expect(player.score).toBe(100);
    expect(player.xp).toBe(100);
  });

  it('recalculates level based on new score', () => {
    const player = addScore(500);
    // level = floor((0 + 500) / 500) + 1 = 2
    expect(player.level).toBe(2);
  });

  it('accumulates across multiple calls', () => {
    addScore(300);
    const player = addScore(300);
    expect(player.score).toBe(600);
    // level = floor(600 / 500) + 1 = 2
    expect(player.level).toBe(2);
  });
});

describe('incrementStat', () => {
  it('increments streak by 1', () => {
    incrementStat('streak');
    const player = getPlayer();
    expect(player.streak).toBe(1);
  });

  it('increments multiple times', () => {
    incrementStat('streak');
    incrementStat('streak');
    incrementStat('streak');
    const player = getPlayer();
    expect(player.streak).toBe(3);
  });
});

describe('updateLastSeen', () => {
  it('sets last_seen to a timestamp', () => {
    updateLastSeen();
    const player = getPlayer();
    expect(player.last_seen).not.toBeNull();
    // Should be a valid ISO string
    expect(new Date(player.last_seen!).getTime()).not.toBeNaN();
  });
});
```

- [ ] **Step 2: Add settings tests**

Append to `tests/db.test.ts`:

```ts
// ── settings ─────────────────────────────────────────────────────────────────

describe('getSetting / setSetting', () => {
  it('returns undefined for missing key', () => {
    expect(getSetting('nonexistent')).toBeUndefined();
  });

  it('round-trips a value', () => {
    setSetting('theme', 'dark');
    expect(getSetting('theme')).toBe('dark');
  });

  it('upserts on duplicate key', () => {
    setSetting('theme', 'dark');
    setSetting('theme', 'light');
    expect(getSetting('theme')).toBe('light');
  });
});
```

- [ ] **Step 3: Run the full db test suite**

Run: `npx vitest run tests/db.test.ts --reporter=verbose`

Expected: All ~35 tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/db.test.ts
git commit -m "test: add player and settings tests to db.test.ts"
```

---

### Task 5: Expand game-engine.test.ts — Handler Tests

**Files:**

- Modify: `tests/game-engine.test.ts`

- [ ] **Step 1: Add vi.mock setup and imports at the top of the file**

Add these imports and mock setup at the top of `tests/game-engine.test.ts`, after the existing imports:

```ts
import { vi, beforeEach } from 'vitest';
import {
  handleDiscoverZone,
  handleLogSighting,
  handleCompleteQuest,
  POINTS,
} from '../src/main/game-engine';
import type { Player, Hotspot, Sighting, Badge, Quest } from '../src/shared/types';

vi.mock('../src/main/db', () => ({
  discoverZone: vi.fn(),
  getPlayer: vi.fn(),
  addScore: vi.fn(),
  updateLastSeen: vi.fn(),
  getSightings: vi.fn(),
  getBadges: vi.fn(),
  getAllHotspots: vi.fn(),
  getQuests: vi.fn(),
  getSetting: vi.fn(),
  logSighting: vi.fn(),
  completeQuest: vi.fn(),
  earnBadge: vi.fn(),
}));

import * as db from '../src/main/db';

const mockedDb = vi.mocked(db);

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 1,
    name: 'Tester',
    level: 1,
    xp: 0,
    score: 0,
    streak: 0,
    last_seen: null,
    ...overrides,
  };
}

function makeBadge(id: number, overrides: Partial<Badge> = {}): Badge {
  return {
    id,
    name: `Badge ${id}`,
    description: 'test',
    icon: 'icon',
    condition_type: 'discover_count',
    condition_value: 99,
    earned: false,
    earned_at: null,
    ...overrides,
  };
}

function setupDefaultMocks(): void {
  mockedDb.getPlayer.mockReturnValue(makePlayer());
  mockedDb.getSightings.mockReturnValue([]);
  mockedDb.getBadges.mockReturnValue([]);
  mockedDb.getAllHotspots.mockReturnValue([]);
  mockedDb.getQuests.mockReturnValue([]);
  mockedDb.getSetting.mockReturnValue(undefined);
  mockedDb.addScore.mockReturnValue(makePlayer());
  mockedDb.logSighting.mockReturnValue({
    id: 1,
    tree_id: null,
    hotspot_id: null,
    lat: 33.21,
    lon: -97.15,
    photo_path: null,
    notes: '',
    timestamp: '2026-04-08T00:00:00Z',
  } as Sighting);
}

beforeEach(() => {
  vi.clearAllMocks();
  setupDefaultMocks();
});
```

- [ ] **Step 2: Add handleDiscoverZone tests**

Append to `tests/game-engine.test.ts`:

```ts
// ── handleDiscoverZone ───────────────────────────────────────────────────────

describe('handleDiscoverZone', () => {
  it('returns score and zone_discovered events on success', () => {
    mockedDb.discoverZone.mockReturnValue({
      id: 1,
      name: 'Oak Alley',
      lat: 33.21,
      lon: -97.15,
      radius_m: 50,
      score: 4,
      tree_count: 10,
      nut_count: 8,
      species: 'Live Oak',
      notes: '',
      discovered: true,
    } as Hotspot);
    const updated = makePlayer({ score: 100 });
    mockedDb.getPlayer
      .mockReturnValueOnce(makePlayer({ score: 0, level: 1 }))
      .mockReturnValueOnce(updated);
    mockedDb.addScore.mockReturnValue(updated);

    const events = handleDiscoverZone(1);

    expect(events.some((e) => e.type === 'score')).toBe(true);
    expect(events.some((e) => e.type === 'zone_discovered')).toBe(true);
    const scoreEvt = events.find((e) => e.type === 'score')!;
    expect(scoreEvt.payload).toEqual({ points: POINTS.DISCOVER_ZONE, total: 100 });
  });

  it('returns empty events when hotspot not found', () => {
    mockedDb.discoverZone.mockReturnValue(null);
    const events = handleDiscoverZone(999);
    expect(events).toHaveLength(0);
  });

  it('detects level-up when score crosses 500 boundary', () => {
    mockedDb.discoverZone.mockReturnValue({
      id: 1,
      name: 'Oak Alley',
      lat: 33.21,
      lon: -97.15,
      radius_m: 50,
      score: 4,
      tree_count: 10,
      nut_count: 8,
      species: 'Live Oak',
      notes: '',
      discovered: true,
    } as Hotspot);
    mockedDb.getPlayer
      .mockReturnValueOnce(makePlayer({ score: 450, level: 1 }))
      .mockReturnValueOnce(makePlayer({ score: 550, level: 2 }));
    mockedDb.addScore.mockReturnValue(makePlayer({ score: 550, level: 2 }));

    const events = handleDiscoverZone(1);
    expect(events.some((e) => e.type === 'level_up')).toBe(true);
  });

  it('triggers badge award when criteria met', () => {
    mockedDb.discoverZone.mockReturnValue({
      id: 1,
      name: 'Oak Alley',
      lat: 33.21,
      lon: -97.15,
      radius_m: 50,
      score: 4,
      tree_count: 10,
      nut_count: 8,
      species: 'Live Oak',
      notes: '',
      discovered: true,
    } as Hotspot);
    const player = makePlayer({ score: 100, level: 1 });
    mockedDb.getPlayer.mockReturnValue(player);
    mockedDb.addScore.mockReturnValue(player);
    // Badge with discover_count=1, currently at 0 discoveries but handler increments
    mockedDb.getBadges.mockReturnValue([
      makeBadge(1, { condition_type: 'discover_count', condition_value: 1 }),
    ]);

    const events = handleDiscoverZone(1);
    expect(events.some((e) => e.type === 'badge_earned')).toBe(true);
  });
});
```

- [ ] **Step 3: Add handleLogSighting tests**

Append to `tests/game-engine.test.ts`:

```ts
// ── handleLogSighting ────────────────────────────────────────────────────────

describe('handleLogSighting', () => {
  it('returns score event with correct points', () => {
    const updated = makePlayer({ score: 50 });
    mockedDb.getPlayer.mockReturnValueOnce(makePlayer()).mockReturnValueOnce(updated);
    mockedDb.addScore.mockReturnValue(updated);

    const events = handleLogSighting({
      tree_id: 1,
      hotspot_id: 1,
      lat: 33.21,
      lon: -97.15,
      photo_path: null,
      notes: 'test',
      timestamp: '2026-04-08T00:00:00Z',
    });

    const scoreEvt = events.find((e) => e.type === 'score')!;
    expect(scoreEvt.payload).toEqual({ points: POINTS.LOG_SIGHTING, total: 50 });
  });

  it('calls db.logSighting with the sighting data', () => {
    const sighting = {
      tree_id: 1,
      hotspot_id: 1,
      lat: 33.21,
      lon: -97.15,
      photo_path: null,
      notes: 'test',
      timestamp: '2026-04-08T00:00:00Z',
    };
    handleLogSighting(sighting);
    expect(mockedDb.logSighting).toHaveBeenCalledWith(sighting);
  });

  it('detects level-up', () => {
    mockedDb.getPlayer
      .mockReturnValueOnce(makePlayer({ score: 480, level: 1 }))
      .mockReturnValueOnce(makePlayer({ score: 530, level: 2 }));
    mockedDb.addScore.mockReturnValue(makePlayer({ score: 530, level: 2 }));

    const events = handleLogSighting({
      tree_id: 1,
      hotspot_id: 1,
      lat: 33.21,
      lon: -97.15,
      photo_path: null,
      notes: 'test',
      timestamp: '2026-04-08T00:00:00Z',
    });

    expect(events.some((e) => e.type === 'level_up')).toBe(true);
  });
});
```

- [ ] **Step 4: Add handleCompleteQuest tests**

Append to `tests/game-engine.test.ts`:

```ts
// ── handleCompleteQuest ──────────────────────────────────────────────────────

describe('handleCompleteQuest', () => {
  it('returns score event with correct points', () => {
    const updated = makePlayer({ score: 300 });
    mockedDb.getPlayer.mockReturnValueOnce(makePlayer()).mockReturnValueOnce(updated);
    mockedDb.addScore.mockReturnValue(updated);

    const events = handleCompleteQuest(1);

    const scoreEvt = events.find((e) => e.type === 'score')!;
    expect(scoreEvt.payload).toEqual({ points: POINTS.COMPLETE_QUEST, total: 300 });
  });

  it('calls db.completeQuest with the quest id', () => {
    handleCompleteQuest(42);
    expect(mockedDb.completeQuest).toHaveBeenCalledWith(42);
  });

  it('detects level-up from quest points', () => {
    mockedDb.getPlayer
      .mockReturnValueOnce(makePlayer({ score: 400, level: 1 }))
      .mockReturnValueOnce(makePlayer({ score: 700, level: 2 }));
    mockedDb.addScore.mockReturnValue(makePlayer({ score: 700, level: 2 }));

    const events = handleCompleteQuest(1);
    expect(events.some((e) => e.type === 'level_up')).toBe(true);
  });
});
```

- [ ] **Step 5: Run the full game-engine test suite**

Run: `npx vitest run tests/game-engine.test.ts --reporter=verbose`

Expected: All existing tests + new handler tests pass.

- [ ] **Step 6: Commit**

```bash
git add tests/game-engine.test.ts
git commit -m "test: add handler tests for handleDiscoverZone, handleLogSighting, handleCompleteQuest"
```

---

### Task 6: Expand ollama.test.ts — Async Function Tests

**Files:**

- Modify: `tests/ollama.test.ts`

- [ ] **Step 1: Add vi.mock setup and imports at the top of the file**

Add these imports and mock setup at the top of `tests/ollama.test.ts`, after the existing imports:

```ts
import { vi, beforeEach, afterEach } from 'vitest';
import { checkOllamaStatus, chat, generateQuest } from '../src/main/ollama';
import type { Player } from '../src/shared/types';

vi.mock('../src/main/db', () => ({
  getSetting: vi.fn(),
  getPlayer: vi.fn(),
  getAllHotspots: vi.fn(),
  setSetting: vi.fn(),
  addQuest: vi.fn(),
}));

import * as db from '../src/main/db';

const mockedDb = vi.mocked(db);

const originalFetch = global.fetch;

function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }): void {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({}),
    ...response,
  }) as unknown as typeof fetch;
}

function mockFetchReject(error: Error): void {
  global.fetch = vi.fn().mockRejectedValue(error) as unknown as typeof fetch;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedDb.getSetting.mockReturnValue(undefined);
  mockedDb.getPlayer.mockReturnValue({
    id: 1,
    name: 'Tester',
    level: 1,
    xp: 0,
    score: 0,
    streak: 0,
    last_seen: null,
  } as Player);
  mockedDb.getAllHotspots.mockReturnValue([]);
});

afterEach(() => {
  global.fetch = originalFetch;
});
```

- [ ] **Step 2: Add checkOllamaStatus tests**

Append to `tests/ollama.test.ts`:

```ts
// ── checkOllamaStatus ────────────────────────────────────────────────────────

describe('checkOllamaStatus', () => {
  it('returns online=true when default URL responds OK', async () => {
    mockFetch({ ok: true });
    const status = await checkOllamaStatus();
    expect(status.online).toBe(true);
    expect(status.url).toBe('http://localhost:11434');
  });

  it('returns online=true with custom URL when configured', async () => {
    mockedDb.getSetting.mockReturnValue('http://custom:11434');
    mockFetch({ ok: true });
    const status = await checkOllamaStatus();
    expect(status.online).toBe(true);
    expect(status.url).toBe('http://custom:11434');
  });

  it('falls back to default URL when custom URL fails', async () => {
    mockedDb.getSetting.mockReturnValue('http://custom:11434');
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.reject(new Error('fail'));
      return Promise.resolve({ ok: true });
    }) as unknown as typeof fetch;

    const status = await checkOllamaStatus();
    expect(status.online).toBe(true);
    expect(status.url).toBe('http://localhost:11434');
  });

  it('returns online=false when all URLs fail', async () => {
    mockFetchReject(new Error('network error'));
    const status = await checkOllamaStatus();
    expect(status.online).toBe(false);
  });
});
```

- [ ] **Step 3: Add chat tests**

Append to `tests/ollama.test.ts`:

```ts
// ── chat ─────────────────────────────────────────────────────────────────────

describe('chat', () => {
  it('returns message content on success', async () => {
    mockFetch({
      ok: true,
      json: async () => ({ message: { content: 'Hello from Squirrel Scout!' } }),
    });

    const result = await chat([{ role: 'user', content: 'Hi' }]);
    expect(result).toBe('Hello from Squirrel Scout!');
  });

  it('sends system prompt and user messages to correct URL', async () => {
    mockFetch({
      ok: true,
      json: async () => ({ message: { content: 'response' } }),
    });

    await chat([{ role: 'user', content: 'test' }]);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/chat',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws on HTTP error status', async () => {
    mockFetch({ ok: false, status: 500, statusText: 'Internal Server Error' });
    await expect(chat([{ role: 'user', content: 'test' }])).rejects.toThrow(
      'Ollama request failed',
    );
  });

  it('throws on API error in response body', async () => {
    mockFetch({
      ok: true,
      json: async () => ({ error: 'model not found' }),
    });
    await expect(chat([{ role: 'user', content: 'test' }])).rejects.toThrow('model not found');
  });

  it('throws on empty response', async () => {
    mockFetch({
      ok: true,
      json: async () => ({ message: {} }),
    });
    await expect(chat([{ role: 'user', content: 'test' }])).rejects.toThrow('Empty response');
  });

  it('increments chat_count in settings', async () => {
    mockedDb.getSetting.mockImplementation((key: string) => {
      if (key === 'chat_count') return '5';
      return undefined;
    });
    mockFetch({
      ok: true,
      json: async () => ({ message: { content: 'response' } }),
    });

    await chat([{ role: 'user', content: 'test' }]);
    expect(mockedDb.setSetting).toHaveBeenCalledWith('chat_count', '6');
  });
});
```

- [ ] **Step 4: Add fallbackQuest and generateQuest tests**

Append to `tests/ollama.test.ts`:

```ts
// ── generateQuest ────────────────────────────────────────────────────────────

describe('generateQuest', () => {
  it('returns AI-generated quest when Ollama is online', async () => {
    mockedDb.getAllHotspots.mockReturnValue([
      {
        id: 1,
        name: 'Oak Alley',
        lat: 33.21,
        lon: -97.15,
        radius_m: 50,
        score: 4,
        tree_count: 10,
        nut_count: 8,
        species: 'Live Oak',
        notes: '',
        discovered: false,
      },
    ]);

    // First fetch = checkOllamaStatus (tags endpoint), second = quest generation
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // checkOllamaStatus call
        return Promise.resolve({ ok: true });
      }
      // quest generation call
      return Promise.resolve({
        ok: true,
        json: async () => ({ message: { content: 'Go find squirrels at Oak Alley!' } }),
      });
    }) as unknown as typeof fetch;

    const quest = await generateQuest();
    expect(quest).toBe('Go find squirrels at Oak Alley!');
    expect(mockedDb.addQuest).toHaveBeenCalled();
  });

  it('uses fallback quest when Ollama is offline', async () => {
    mockedDb.getAllHotspots.mockReturnValue([
      {
        id: 1,
        name: 'Oak Alley',
        lat: 33.21,
        lon: -97.15,
        radius_m: 50,
        score: 4,
        tree_count: 10,
        nut_count: 8,
        species: 'Live Oak',
        notes: '',
        discovered: false,
      },
    ]);
    mockFetchReject(new Error('offline'));

    const quest = await generateQuest();
    expect(quest).toContain('Oak Alley');
    expect(mockedDb.addQuest).toHaveBeenCalled();
  });

  it('uses generic fallback when no hotspots exist and offline', async () => {
    mockedDb.getAllHotspots.mockReturnValue([]);
    mockFetchReject(new Error('offline'));

    const quest = await generateQuest();
    expect(quest).toContain('Explore');
    expect(mockedDb.addQuest).toHaveBeenCalled();
  });

  it('falls back on fetch error during quest generation', async () => {
    mockedDb.getAllHotspots.mockReturnValue([
      {
        id: 1,
        name: 'Oak Alley',
        lat: 33.21,
        lon: -97.15,
        radius_m: 50,
        score: 4,
        tree_count: 10,
        nut_count: 8,
        species: 'Live Oak',
        notes: '',
        discovered: false,
      },
    ]);

    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ ok: true }); // status check passes
      return Promise.reject(new Error('timeout')); // quest gen fails
    }) as unknown as typeof fetch;

    const quest = await generateQuest();
    expect(quest).toContain('Oak Alley');
    expect(mockedDb.addQuest).toHaveBeenCalled();
  });
});
```

- [ ] **Step 5: Run the full ollama test suite**

Run: `npx vitest run tests/ollama.test.ts --reporter=verbose`

Expected: All existing buildSystemPrompt tests + new async tests pass.

- [ ] **Step 6: Commit**

```bash
git add tests/ollama.test.ts
git commit -m "test: add checkOllamaStatus, chat, and generateQuest tests to ollama.test.ts"
```

---

### Task 7: Raise Quality Gate Thresholds

**Files:**

- Modify: `quality-gates.yml:7-9`

- [ ] **Step 1: Run full coverage to verify current numbers**

Run: `npx vitest run --coverage`

Expected: All tests pass. Coverage should be well above 60% lines, 60% branches, 50% functions.

- [ ] **Step 2: Update quality gate thresholds**

In `quality-gates.yml`, change lines 7-9:

```yaml
coverage:
  lines: 60
  branches: 60
  functions: 50
```

- [ ] **Step 3: Run the test quality gate to verify it passes**

Run: `npm run gates:test`

Expected: Gate passes with the new thresholds.

- [ ] **Step 4: Commit**

```bash
git add quality-gates.yml
git commit -m "chore: raise coverage thresholds to 60% lines, 60% branches, 50% functions"
```

---

### Task 8: Final Verification

- [ ] **Step 1: Run the full test suite with coverage**

Run: `npx vitest run --coverage --reporter=verbose`

Expected: All tests pass. Coverage report shows 70%+ overall lines and functions.

- [ ] **Step 2: Run all quality gates**

Run: `npm run gates`

Expected: All gates (lint, test, data, security) pass.

- [ ] **Step 3: Verify no regressions**

Run: `npx tsc --noEmit`

Expected: No TypeScript errors.
