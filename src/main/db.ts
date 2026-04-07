import initSqlJs, { Database, QueryExecResult } from 'sql.js';
import fs from 'fs';
import path from 'path';
import type { Tree, Hotspot, Sighting, Badge, Quest, Player, BoundingBox } from '../shared/types';

let db: Database | null = null;
let dbPath: string = '';

// ── helpers ──────────────────────────────────────────────────────────────────

export function saveDB(): void {
  if (!db) throw new Error('DB not initialized');
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

/** Convert db.exec() results to an array of typed objects */
function execToRows<T>(results: QueryExecResult[]): T[] {
  if (!results.length) return [];
  const { columns, values } = results[0];
  return values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as T;
  });
}

// ── lifecycle ─────────────────────────────────────────────────────────────────

export async function initDB(): Promise<void> {
  const isDev = process.env.NODE_ENV === 'development';
  dbPath = isDev
    ? path.resolve(__dirname, '..', '..', 'data', 'squirrels.db')
    : path.join(process.resourcesPath, 'squirrels.db');

  const SQL = await initSqlJs();
  const buf = fs.readFileSync(dbPath);
  db = new SQL.Database(buf);
}

export function closeDB(): void {
  if (db) {
    saveDB();
    db.close();
    db = null;
  }
}

function getDB(): Database {
  if (!db) throw new Error('DB not initialized — call initDB() first');
  return db;
}

// ── trees ─────────────────────────────────────────────────────────────────────

export function queryTrees(bounds: BoundingBox): Tree[] {
  const d = getDB();
  const results = d.exec(
    `SELECT id, fid, unt_id, name_comn AS species, memorial, elevation, lat, lon, global_id
     FROM trees
     WHERE lat >= ? AND lat <= ? AND lon >= ? AND lon <= ?`,
    [bounds.minLat, bounds.maxLat, bounds.minLon, bounds.maxLon],
  );
  return execToRows<Tree>(results);
}

// ── hotspots ──────────────────────────────────────────────────────────────────

export function getAllHotspots(): Hotspot[] {
  const d = getDB();
  const results = d.exec(
    'SELECT id, name, lat, lon, radius_m, score, tree_count, nut_count, species, notes FROM hotspots',
  );
  return execToRows<Hotspot>(results);
}

export function queryHotspots(lat: number, lon: number, radiusKm: number): Hotspot[] {
  const d = getDB();
  const deg = radiusKm / 111;
  const results = d.exec(
    `SELECT id, name, lat, lon, radius_m, score, tree_count, nut_count, species, notes
     FROM hotspots
     WHERE lat >= ? AND lat <= ? AND lon >= ? AND lon <= ?`,
    [lat - deg, lat + deg, lon - deg, lon + deg],
  );
  return execToRows<Hotspot>(results);
}

export function getHotspotById(hotspotId: number): Hotspot | null {
  const d = getDB();
  const stmt = d.prepare(
    'SELECT id, name, lat, lon, radius_m, score, tree_count, nut_count, species, notes FROM hotspots WHERE id = ?',
  );
  stmt.bind([hotspotId]);
  const hasRow = stmt.step();
  if (!hasRow) {
    stmt.free();
    return null;
  }
  const row = stmt.getAsObject() as unknown as Hotspot;
  stmt.free();
  return row;
}

// ── sightings ─────────────────────────────────────────────────────────────────

export function logSighting(sighting: Omit<Sighting, 'id'>): Sighting {
  const d = getDB();
  d.run(
    'INSERT INTO sightings (tree_id, hotspot_id, lat, lon, photo_path, notes, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      sighting.tree_id ?? null,
      sighting.hotspot_id ?? null,
      sighting.lat,
      sighting.lon,
      sighting.photo_path ?? null,
      sighting.notes,
      sighting.timestamp,
    ],
  );
  saveDB();

  const stmt = d.prepare(
    'SELECT id, tree_id, hotspot_id, lat, lon, photo_path, notes, timestamp FROM sightings WHERE rowid = last_insert_rowid()',
  );
  stmt.step();
  const row = stmt.getAsObject() as unknown as Sighting;
  stmt.free();
  return row;
}

export function getSightings(hotspotId?: number): Sighting[] {
  const d = getDB();
  let results: QueryExecResult[];
  if (hotspotId !== undefined) {
    results = d.exec(
      'SELECT id, tree_id, hotspot_id, lat, lon, photo_path, notes, timestamp FROM sightings WHERE hotspot_id = ? ORDER BY timestamp DESC',
      [hotspotId],
    );
  } else {
    results = d.exec(
      'SELECT id, tree_id, hotspot_id, lat, lon, photo_path, notes, timestamp FROM sightings ORDER BY timestamp DESC',
    );
  }
  return execToRows<Sighting>(results);
}

// ── badges ────────────────────────────────────────────────────────────────────

export function getBadges(): Badge[] {
  const d = getDB();
  // badges table doesn't have earned/earned_at columns — we track via player_badges or just
  // store in settings. For simplicity, we add optional columns lazily.
  ensureBadgeColumns(d);
  const results = d.exec(
    'SELECT id, name, description, icon, condition_type, condition_value, COALESCE(earned, 0) AS earned, earned_at FROM badges',
  );
  return execToRows<Badge>(results).map((b) => ({
    ...b,
    earned: Boolean(b.earned),
  }));
}

let badgeColumnsChecked = false;
function ensureBadgeColumns(d: Database): void {
  if (badgeColumnsChecked) return;
  const info = d.exec("PRAGMA table_info(badges)");
  if (!info.length) return;
  const cols = info[0].values.map((r) => r[1] as string);
  if (!cols.includes('earned')) {
    d.run('ALTER TABLE badges ADD COLUMN earned INTEGER NOT NULL DEFAULT 0');
  }
  if (!cols.includes('earned_at')) {
    d.run('ALTER TABLE badges ADD COLUMN earned_at TEXT');
  }
  badgeColumnsChecked = true;
}

export function earnBadge(badgeId: number): void {
  const d = getDB();
  ensureBadgeColumns(d);
  d.run('UPDATE badges SET earned = 1, earned_at = ? WHERE id = ?', [
    new Date().toISOString(),
    badgeId,
  ]);
  saveDB();
}

// ── quests ────────────────────────────────────────────────────────────────────

export function getQuests(): Quest[] {
  const d = getDB();
  const results = d.exec(
    'SELECT id, quest_type, target_id, status, started_at, completed_at FROM quest_log ORDER BY started_at DESC',
  );
  return execToRows<Quest>(results);
}

export function addQuest(questType: string, targetId: number | null): Quest {
  const d = getDB();
  const now = new Date().toISOString();
  d.run(
    'INSERT INTO quest_log (quest_type, target_id, status, started_at, completed_at) VALUES (?, ?, ?, ?, NULL)',
    [questType, targetId ?? null, 'active', now],
  );
  saveDB();

  const stmt = d.prepare(
    'SELECT id, quest_type, target_id, status, started_at, completed_at FROM quest_log WHERE rowid = last_insert_rowid()',
  );
  stmt.step();
  const row = stmt.getAsObject() as unknown as Quest;
  stmt.free();
  return row;
}

export function completeQuest(questId: number): void {
  const d = getDB();
  d.run('UPDATE quest_log SET status = ?, completed_at = ? WHERE id = ?', [
    'completed',
    new Date().toISOString(),
    questId,
  ]);
  saveDB();
}

// ── player ────────────────────────────────────────────────────────────────────

export function getPlayer(): Player {
  const d = getDB();
  const stmt = d.prepare(
    'SELECT id, name, level, xp, score, streak, last_seen FROM player WHERE id = 1',
  );
  stmt.step();
  const row = stmt.getAsObject() as unknown as Player;
  stmt.free();
  return row;
}

export function addScore(points: number): Player {
  const d = getDB();
  // level = floor((score + points) / 500) + 1
  d.run(
    'UPDATE player SET score = score + ?, xp = xp + ?, level = ((score + ?) / 500) + 1 WHERE id = 1',
    [points, points, points],
  );
  saveDB();
  return getPlayer();
}

export function incrementStat(
  stat: 'streak',
): void {
  const d = getDB();
  d.run(`UPDATE player SET ${stat} = ${stat} + 1 WHERE id = 1`);
  saveDB();
}

export function updateLastSeen(): void {
  const d = getDB();
  d.run('UPDATE player SET last_seen = ? WHERE id = 1', [new Date().toISOString()]);
  saveDB();
}

// ── settings ──────────────────────────────────────────────────────────────────

export function getSetting(key: string): string | undefined {
  const d = getDB();
  const stmt = d.prepare('SELECT value FROM settings WHERE key = ?');
  stmt.bind([key]);
  const hasRow = stmt.step();
  if (!hasRow) {
    stmt.free();
    return undefined;
  }
  const row = stmt.getAsObject() as { value: string };
  stmt.free();
  return row.value;
}

export function setSetting(key: string, value: string): void {
  const d = getDB();
  d.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  saveDB();
}
