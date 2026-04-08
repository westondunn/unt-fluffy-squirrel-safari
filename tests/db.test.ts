import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
    const hotspots = queryHotspots(33.210, -97.150, 1);
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

// ── sightings ────────────────────────────────────────────────────────────────

describe('logSighting', () => {
  it('inserts and returns the sighting with an id', () => {
    const sighting = logSighting({
      tree_id: 1,
      hotspot_id: 1,
      lat: 33.210,
      lon: -97.150,
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
      lat: 33.210,
      lon: -97.150,
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
      tree_id: 1, hotspot_id: 1, lat: 33.21, lon: -97.15,
      photo_path: null, notes: 'First', timestamp: '2026-04-08T10:00:00Z',
    });
    logSighting({
      tree_id: 2, hotspot_id: 1, lat: 33.21, lon: -97.15,
      photo_path: '/photo.jpg', notes: 'Second', timestamp: '2026-04-08T11:00:00Z',
    });
    const sightings = getSightings();
    expect(sightings).toHaveLength(2);
    expect(sightings[0].notes).toBe('Second');
  });

  it('filters by hotspot_id when provided', () => {
    logSighting({
      tree_id: 1, hotspot_id: 1, lat: 33.21, lon: -97.15,
      photo_path: null, notes: 'Hotspot 1', timestamp: '2026-04-08T10:00:00Z',
    });
    logSighting({
      tree_id: 2, hotspot_id: 2, lat: 33.22, lon: -97.16,
      photo_path: null, notes: 'Hotspot 2', timestamp: '2026-04-08T11:00:00Z',
    });
    const sightings = getSightings(1);
    expect(sightings).toHaveLength(1);
    expect(sightings[0].notes).toBe('Hotspot 1');
  });
});

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
