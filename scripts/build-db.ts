import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import initSqlJs from 'sql.js';

// ─── Coordinate conversion ────────────────────────────────────────────────────
export function mercatorToLatLon(x: number, y: number): { lat: number; lon: number } {
  const lon = (x / 20037508.34) * 180;
  const lat = (Math.atan(Math.exp((y / 20037508.34) * Math.PI)) * 360) / Math.PI - 90;
  return { lat, lon };
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface TreeRow {
  fid: number;
  northing: number;
  easting: number;
  elevation: number;
  notes: string;
  unt_id: number;
  name_comn: string;
  memorial: string;
  memorial_t: string;
  global_id: string;
  x: number;
  y: number;
  lat: number;
  lon: number;
}

interface Cluster {
  trees: TreeRow[];
  nutCount: number;
  species: Set<string>;
  score: number;
  centerLat: number;
  centerLon: number;
}

// ─── Nut-producing species ────────────────────────────────────────────────────
export const NUT_SPECIES = new Set([
  'live oak',
  'post oak',
  'red oak',
  'bur oak',
  'oak',
  'pecan',
  'hackberry',
  'cedar elm',
  'sweetgum',
  'mesquite',
]);

export function isNutTree(name: string): boolean {
  const lower = name.toLowerCase().trim();
  for (const nut of NUT_SPECIES) {
    if (lower.includes(nut)) return true;
  }
  return false;
}

// ─── Haversine distance in metres ────────────────────────────────────────────
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── BFS clustering ──────────────────────────────────────────────────────────
export function clusterTrees(trees: TreeRow[], radiusMeters = 50, minClusterSize = 3): Cluster[] {
  const nutTrees = trees.filter((t) => isNutTree(t.name_comn));
  const visited = new Set<number>();
  const clusters: Cluster[] = [];

  for (let i = 0; i < nutTrees.length; i++) {
    if (visited.has(i)) continue;
    visited.add(i);

    const queue: number[] = [i];
    const members: number[] = [i];

    let head = 0;
    while (head < queue.length) {
      const curr = queue[head++];
      for (let j = 0; j < nutTrees.length; j++) {
        if (visited.has(j)) continue;
        const d = haversineMeters(
          nutTrees[curr].lat,
          nutTrees[curr].lon,
          nutTrees[j].lat,
          nutTrees[j].lon,
        );
        if (d <= radiusMeters) {
          visited.add(j);
          queue.push(j);
          members.push(j);
        }
      }
    }

    if (members.length < minClusterSize) continue;

    const clusterTrees = members.map((idx) => nutTrees[idx]);
    const nutCount = clusterTrees.filter((t) => isNutTree(t.name_comn)).length;
    const species = new Set(clusterTrees.map((t) => t.name_comn.toLowerCase().trim()));
    const centerLat = clusterTrees.reduce((s, t) => s + t.lat, 0) / clusterTrees.length;
    const centerLon = clusterTrees.reduce((s, t) => s + t.lon, 0) / clusterTrees.length;

    // Score 1-5: count weight 40%, nut ratio weight 30%, diversity weight 30%
    const countScore = Math.min(clusterTrees.length / 20, 1); // saturates at 20 trees
    const nutRatio = nutCount / clusterTrees.length;
    const diversityScore = Math.min(species.size / 5, 1); // saturates at 5 species
    const rawScore = countScore * 0.4 + nutRatio * 0.3 + diversityScore * 0.3;
    const score = Math.max(1, Math.min(5, Math.round(rawScore * 5)));

    clusters.push({ trees: clusterTrees, nutCount, species, score, centerLat, centerLon });
  }

  return clusters;
}

// ─── CSV parser ───────────────────────────────────────────────────────────────
async function parseCsv(filePath: string): Promise<TreeRow[]> {
  const rows: TreeRow[] = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let lineNum = 0;
  for await (const line of rl) {
    if (lineNum === 0) { lineNum++; continue; } // skip header
    lineNum++;
    // Remove BOM if present
    const clean = line.replace(/^\uFEFF/, '');
    if (!clean.trim()) continue;

    const cols = clean.split(',');
    // FID,Northing,Easting,ELEVATION,NOTES,UNT_ID,NAME_COMN,MEMORIAL,MEMORIAL_T,GlobalID,x,y
    const fid = parseInt(cols[0], 10);
    const northing = parseFloat(cols[1]);
    const easting = parseFloat(cols[2]);
    const elevation = parseFloat(cols[3]);
    const notes = cols[4]?.trim() ?? '';
    const unt_id = parseInt(cols[5], 10);
    const name_comn = cols[6]?.trim() ?? '';
    const memorial = cols[7]?.trim() ?? '';
    const memorial_t = cols[8]?.trim() ?? '';
    const global_id = cols[9]?.trim() ?? '';
    const x = parseFloat(cols[10]);
    const y = parseFloat(cols[11]);

    if (isNaN(x) || isNaN(y)) continue;

    const { lat, lon } = mercatorToLatLon(x, y);
    rows.push({ fid, northing, easting, elevation, notes, unt_id, name_comn, memorial, memorial_t, global_id, x, y, lat, lon });
  }

  return rows;
}

// ─── Badge definitions ────────────────────────────────────────────────────────
const BADGES = [
  { name: 'First Steps', description: 'Discover your first tree', condition_type: 'discover_count', condition_value: 1, icon: '🌱' },
  { name: 'Nut Detective', description: 'Discover 5 trees', condition_type: 'discover_count', condition_value: 5, icon: '🔍' },
  { name: 'Tree Hugger', description: 'Discover 10 trees', condition_type: 'discover_count', condition_value: 10, icon: '🌳' },
  { name: 'Campus Mapper', description: 'Discover 50% of trees', condition_type: 'discover_percent', condition_value: 50, icon: '🗺️' },
  { name: 'Full Safari', description: 'Discover 100% of trees', condition_type: 'discover_percent', condition_value: 100, icon: '🏆' },
  { name: 'Sharp Eye', description: 'Log your first sighting', condition_type: 'sighting_count', condition_value: 1, icon: '👁️' },
  { name: 'Social Squirrel', description: 'Log 25 sightings', condition_type: 'sighting_count', condition_value: 25, icon: '🐿️' },
  { name: 'Shutterburg', description: 'Take 10 photos', condition_type: 'photo_count', condition_value: 10, icon: '📸' },
  { name: 'Photo Album', description: 'Take 25 photos', condition_type: 'photo_count', condition_value: 25, icon: '📷' },
  { name: 'Squirrel Whisperer', description: 'Chat 25 times', condition_type: 'chat_count', condition_value: 25, icon: '💬' },
  { name: "Scout's Friend", description: 'Chat 50 times', condition_type: 'chat_count', condition_value: 50, icon: '🤝' },
  { name: 'Questmaster', description: 'Complete 10 quests', condition_type: 'quest_count', condition_value: 10, icon: '⚔️' },
  { name: 'Early Bird', description: 'Visit before 8am', condition_type: 'time_before', condition_value: 8, icon: '🌅' },
  { name: 'Night Owl', description: 'Visit after 9pm', condition_type: 'time_after', condition_value: 21, icon: '🦉' },
  { name: 'Speed Runner', description: 'Discover 5 trees in one day', condition_type: 'daily_discover', condition_value: 5, icon: '⚡' },
  { name: 'Dedicated Explorer', description: '7-day streak', condition_type: 'streak', condition_value: 7, icon: '🔥' },
  { name: 'Oak Explorer', description: 'Visit all oak zones', condition_type: 'oak_zones', condition_value: 100, icon: '🌰' },
  { name: 'Pecan Pro', description: 'Visit all pecan zones', condition_type: 'pecan_zones', condition_value: 100, icon: '🥜' },
  { name: 'Memorial Hunter', description: 'Visit a memorial zone', condition_type: 'memorial_zone', condition_value: 1, icon: '🏛️' },
  { name: 'Diversity Spotter', description: 'Visit a diverse species zone', condition_type: 'diverse_zone', condition_value: 1, icon: '🌈' },
  { name: 'Elevation Expert', description: 'Visit 5 elevation zones', condition_type: 'elevation_count', condition_value: 5, icon: '⛰️' },
  { name: 'Century Club', description: 'Reach 10,000 score', condition_type: 'score', condition_value: 10000, icon: '💯' },
  { name: 'Legend', description: 'Reach level 20', condition_type: 'level', condition_value: 20, icon: '⭐' },
  { name: 'Completionist', description: 'Earn 23 other badges', condition_type: 'all_badges', condition_value: 23, icon: '🎖️' },
];

// ─── Default settings ─────────────────────────────────────────────────────────
const SETTINGS = [
  { key: 'ollama_url', value: 'http://localhost:11434' },
  { key: 'ollama_model', value: 'llama3.2' },
  { key: 'geolocation_enabled', value: 'false' },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const dataDir = path.resolve(process.cwd(), 'data');
  const csvPath = path.join(dataDir, 'trees.csv');
  const dbPath = path.join(dataDir, 'squirrels.db');

  console.log('Parsing CSV...');
  const trees = await parseCsv(csvPath);
  console.log(`  Parsed ${trees.length} trees`);

  console.log('Initializing sql.js...');
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // ─── Schema ─────────────────────────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS trees (
      id        INTEGER PRIMARY KEY,
      fid       INTEGER,
      unt_id    INTEGER,
      name_comn TEXT,
      memorial  TEXT,
      memorial_t TEXT,
      notes     TEXT,
      elevation REAL,
      lat       REAL NOT NULL,
      lon       REAL NOT NULL,
      x         REAL,
      y         REAL,
      global_id TEXT
    );
  `);

  db.run(`
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
      notes       TEXT
    );
  `);

  db.run(`
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
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS badges (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      name             TEXT UNIQUE NOT NULL,
      description      TEXT,
      condition_type   TEXT NOT NULL,
      condition_value  INTEGER NOT NULL,
      icon             TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS quest_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      quest_type  TEXT NOT NULL,
      target_id   INTEGER,
      status      TEXT DEFAULT 'active',
      started_at  TEXT NOT NULL,
      completed_at TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS player (
      id       INTEGER PRIMARY KEY DEFAULT 1,
      name     TEXT DEFAULT 'Explorer',
      level    INTEGER DEFAULT 1,
      xp       INTEGER DEFAULT 0,
      score    INTEGER DEFAULT 0,
      streak   INTEGER DEFAULT 0,
      last_seen TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // ─── Insert trees ─────────────────────────────────────────────────────────
  console.log('Inserting trees...');
  db.run('BEGIN TRANSACTION;');
  const treeStmt = db.prepare(`
    INSERT INTO trees (id, fid, unt_id, name_comn, memorial, memorial_t, notes, elevation, lat, lon, x, y, global_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const t of trees) {
    treeStmt.run([t.fid, t.fid, t.unt_id, t.name_comn, t.memorial, t.memorial_t, t.notes, t.elevation, t.lat, t.lon, t.x, t.y, t.global_id]);
  }
  treeStmt.free();
  db.run('COMMIT;');
  console.log(`  Inserted ${trees.length} trees`);

  // ─── Cluster & hotspots ───────────────────────────────────────────────────
  console.log('Clustering nut trees...');
  const clusters = clusterTrees(trees);
  console.log(`  Found ${clusters.length} clusters (≥3 nut trees within 50m)`);

  // Sort by score desc, take top 30
  clusters.sort((a, b) => b.score - a.score || b.trees.length - a.trees.length);
  const topClusters = clusters.slice(0, 30);

  console.log('Inserting hotspots...');
  db.run('BEGIN TRANSACTION;');
  const hotspotStmt = db.prepare(`
    INSERT INTO hotspots (name, lat, lon, radius_m, score, tree_count, nut_count, species, notes)
    VALUES (?, ?, ?, 50, ?, ?, ?, ?, ?)
  `);
  for (let i = 0; i < topClusters.length; i++) {
    const c = topClusters[i];
    const name = `Hotspot ${i + 1}`;
    const speciesStr = Array.from(c.species).join(', ');
    const notes = `${c.trees.length} trees, ${c.species.size} species`;
    hotspotStmt.run([name, c.centerLat, c.centerLon, c.score, c.trees.length, c.nutCount, speciesStr, notes]);
  }
  hotspotStmt.free();
  db.run('COMMIT;');
  console.log(`  Inserted ${topClusters.length} hotspots`);

  // ─── Default player ───────────────────────────────────────────────────────
  db.run(`INSERT OR IGNORE INTO player (id) VALUES (1);`);

  // ─── Badges ───────────────────────────────────────────────────────────────
  console.log('Seeding badges...');
  db.run('BEGIN TRANSACTION;');
  const badgeStmt = db.prepare(`
    INSERT OR IGNORE INTO badges (name, description, condition_type, condition_value, icon)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const b of BADGES) {
    badgeStmt.run([b.name, b.description, b.condition_type, b.condition_value, b.icon]);
  }
  badgeStmt.free();
  db.run('COMMIT;');
  console.log(`  Inserted ${BADGES.length} badges`);

  // ─── Settings ─────────────────────────────────────────────────────────────
  console.log('Seeding settings...');
  db.run('BEGIN TRANSACTION;');
  const settingStmt = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`);
  for (const s of SETTINGS) {
    settingStmt.run([s.key, s.value]);
  }
  settingStmt.free();
  db.run('COMMIT;');

  // ─── Save DB ──────────────────────────────────────────────────────────────
  console.log('Saving database...');
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  console.log(`  Saved to ${dbPath}`);

  // ─── Verify ───────────────────────────────────────────────────────────────
  const treeCount = db.exec('SELECT COUNT(*) FROM trees')[0].values[0][0];
  const hotspotCount = db.exec('SELECT COUNT(*) FROM hotspots')[0].values[0][0];
  const badgeCount = db.exec('SELECT COUNT(*) FROM badges')[0].values[0][0];

  console.log('\n=== Database Stats ===');
  console.log(`  Trees:    ${treeCount}`);
  console.log(`  Hotspots: ${hotspotCount}`);
  console.log(`  Badges:   ${badgeCount}`);

  db.close();
  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
