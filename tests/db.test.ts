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

import { initDB, closeDB, saveDB } from '../src/main/db';

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
