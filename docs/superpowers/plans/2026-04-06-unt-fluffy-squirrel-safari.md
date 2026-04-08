# UNT Fluffy Squirrel Safari Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a retro-arcade Electron app that maps 5,053 UNT campus trees, scores squirrel hotspots, and gamifies squirrel-finding with an Ollama AI "Squirrel Scout" assistant.

**Architecture:** Monolith Electron app. Main process handles SQLite (better-sqlite3), Ollama HTTP client, and game logic. Renderer is React 18 + MapLibre GL JS + retro arcade UI. IPC bridge connects them. Build-time data pipeline converts CSV → SQLite with pre-computed hotspot clusters.

**Tech Stack:** Electron, React 18, TypeScript, Vite, MapLibre GL JS, better-sqlite3, Vitest

---

## File Structure

```
unt-fluffy-squirrel-safari/
├── package.json
├── vite.config.ts
├── electron-builder.json5
├── tsconfig.json
├── tsconfig.node.json
├── data/
│   └── trees.csv                          # Source CSV (copied from downloads)
├── scripts/
│   └── build-db.ts                        # Data pipeline: CSV → SQLite
├── src/
│   ├── shared/
│   │   └── types.ts                       # Types shared between main + renderer
│   ├── main/
│   │   ├── index.ts                       # Electron main entry
│   │   ├── db.ts                          # SQLite database layer
│   │   ├── ipc.ts                         # IPC handler registration
│   │   ├── ollama.ts                      # Ollama HTTP client
│   │   └── game-engine.ts                 # Scoring, badges, quests
│   ├── preload/
│   │   └── index.ts                       # contextBridge API
│   └── renderer/
│       ├── index.html                     # HTML shell
│       ├── main.tsx                        # React entry
│       ├── App.tsx                         # Root layout
│       ├── global.css                      # Retro theme
│       ├── components/
│       │   ├── TopBar.tsx
│       │   ├── MapView.tsx
│       │   ├── Sidebar.tsx
│       │   ├── ChatTab.tsx
│       │   ├── FieldGuideTab.tsx
│       │   ├── BadgesTab.tsx
│       │   ├── QuestOverlay.tsx
│       │   └── Toast.tsx
│       ├── hooks/
│       │   ├── useGameState.ts
│       │   └── useOllama.ts
│       └── lib/
│           └── api.ts                      # IPC invoke wrappers
├── tests/
│   ├── build-db.test.ts
│   ├── db.test.ts
│   ├── game-engine.test.ts
│   └── ollama.test.ts
└── resources/
    └── icon.png                           # App icon
```

---

## Task 1: Project Scaffolding

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `electron-builder.json5`
- Create: `src/main/index.ts`
- Create: `src/preload/index.ts`
- Create: `src/renderer/index.html`
- Create: `src/renderer/main.tsx`
- Create: `src/renderer/App.tsx`
- Create: `src/shared/types.ts`

- [ ] **Step 1: Initialize package.json**

```json
{
  "name": "unt-fluffy-squirrel-safari",
  "version": "0.1.0",
  "description": "Find squirrels on UNT campus",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "build:main": "tsc -p tsconfig.node.json",
    "build:db": "tsx scripts/build-db.ts",
    "electron:dev": "concurrently \"vite\" \"tsc -p tsconfig.node.json --watch\" \"electron .\"",
    "start": "npm run build && npm run build:main && electron .",
    "test": "vitest run",
    "test:watch": "vitest",
    "package": "npm run build && npm run build:main && electron-builder"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.12",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "concurrently": "^9.1.2",
    "electron": "^33.3.1",
    "electron-builder": "^25.1.8",
    "typescript": "^5.7.3",
    "vite": "^6.0.7",
    "vitest": "^3.0.4",
    "tsx": "^4.19.2"
  },
  "dependencies": {
    "better-sqlite3": "^11.7.0",
    "maplibre-gl": "^5.1.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
```

- [ ] **Step 2: Create tsconfig.json (renderer)**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src/renderer", "src/shared"]
}
```

- [ ] **Step 3: Create tsconfig.node.json (main + preload)**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true
  },
  "include": ["src/main", "src/preload", "src/shared"]
}
```

- [ ] **Step 4: Create vite.config.ts**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  server: {
    port: 5173,
  },
});
```

- [ ] **Step 5: Create electron-builder.json5**

```json5
{
  appId: 'edu.unt.fluffysquirrelsafari',
  productName: 'UNT Fluffy Squirrel Safari',
  directories: {
    output: 'release',
  },
  files: ['dist/**/*', 'data/squirrels.db'],
  extraResources: [{ from: 'data/squirrels.db', to: 'squirrels.db' }],
  win: {
    target: 'nsis',
  },
}
```

- [ ] **Step 6: Create shared types**

Create `src/shared/types.ts`:

```ts
export interface Tree {
  id: number;
  unt_id: number;
  lat: number;
  lon: number;
  elevation: number;
  species: string;
  memorial: boolean;
  global_id: string;
}

export interface Hotspot {
  id: number;
  name: string;
  center_lat: number;
  center_lon: number;
  radius_m: number;
  tree_count: number;
  nut_tree_count: number;
  squirrel_score: number;
  discovered: boolean;
}

export interface Sighting {
  id: number;
  hotspot_id: number | null;
  lat: number;
  lon: number;
  photo_path: string | null;
  notes: string;
  timestamp: string;
}

export interface Badge {
  id: number;
  name: string;
  description: string;
  icon: string;
  criteria_type: string;
  criteria_value: number;
  earned: boolean;
  earned_at: string | null;
}

export interface Quest {
  id: number;
  quest_text: string;
  target_hotspot_id: number | null;
  status: 'active' | 'completed' | 'expired';
  generated_at: string;
  completed_at: string | null;
}

export interface Player {
  score: number;
  level: number;
  total_discoveries: number;
  total_sightings: number;
  total_quests_completed: number;
}

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}
```

- [ ] **Step 7: Create Electron main entry**

Create `src/main/index.ts`:

```ts
import { app, BrowserWindow } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'UNT Fluffy Squirrel Safari',
    webPreferences: {
      preload: path.join(__dirname, 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});
```

- [ ] **Step 8: Create preload script**

Create `src/preload/index.ts`:

```ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  queryTrees: (bounds: any) => ipcRenderer.invoke('db:query-trees', bounds),
  queryHotspots: (lat: number, lon: number, radiusKm: number) =>
    ipcRenderer.invoke('db:query-hotspots', lat, lon, radiusKm),
  getAllHotspots: () => ipcRenderer.invoke('db:all-hotspots'),

  ollamaChat: (messages: any[]) => ipcRenderer.invoke('ollama:chat', messages),
  ollamaStatus: () => ipcRenderer.invoke('ollama:status'),
  ollamaGenerateQuest: () => ipcRenderer.invoke('ollama:generate-quest'),

  logSighting: (sighting: any) => ipcRenderer.invoke('game:log-sighting', sighting),
  discoverZone: (hotspotId: number) => ipcRenderer.invoke('game:discover-zone', hotspotId),
  getBadges: () => ipcRenderer.invoke('game:get-badges'),
  getPlayer: () => ipcRenderer.invoke('game:get-player'),
  getQuests: () => ipcRenderer.invoke('game:get-quests'),
  getSightings: (hotspotId?: number) => ipcRenderer.invoke('game:get-sightings', hotspotId),
  getSetting: (key: string) => ipcRenderer.invoke('db:get-setting', key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('db:set-setting', key, value),
});
```

- [ ] **Step 9: Create renderer HTML shell**

Create `src/renderer/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>UNT Fluffy Squirrel Safari</title>
    <link href="https://unpkg.com/maplibre-gl@5.1.0/dist/maplibre-gl.css" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 10: Create React entry and placeholder App**

Create `src/renderer/main.tsx`:

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './global.css';

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

Create `src/renderer/App.tsx`:

```tsx
export default function App() {
  return (
    <div
      style={{
        background: '#1a1a2e',
        color: '#eee',
        fontFamily: '"Courier New", monospace',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <h1 style={{ color: '#e94560' }}>UNT FLUFFY SQUIRREL SAFARI</h1>
    </div>
  );
}
```

Create `src/renderer/global.css`:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
html,
body,
#root {
  height: 100%;
  width: 100%;
  overflow: hidden;
}
body {
  background: #1a1a2e;
  color: #eeeeee;
  font-family: 'Courier New', monospace;
}
```

- [ ] **Step 11: Install dependencies and verify Electron launches**

Run:

```bash
npm install
npm run build:main
npx electron .
```

Expected: Electron window opens showing "UNT FLUFFY SQUIRREL SAFARI" in hot pink on dark navy background.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: scaffold Electron + React + Vite + TypeScript project"
```

---

## Task 2: Data Pipeline — CSV to SQLite

**Files:**

- Create: `scripts/build-db.ts`
- Create: `tests/build-db.test.ts`
- Copy: source CSV to `data/trees.csv`

**Important:** The CSV x/y columns are Web Mercator (EPSG:3857), not lat/lon. The pipeline must convert to WGS84 (EPSG:4326).

- [ ] **Step 1: Copy source CSV into project**

```bash
cp "C:/Users/westo/Downloads/Tree_-6539065284196097948.csv" data/trees.csv
```

- [ ] **Step 2: Write failing test for coordinate conversion**

Create `tests/build-db.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

// Web Mercator (EPSG:3857) to WGS84 (EPSG:4326)
function mercatorToLatLon(x: number, y: number): { lat: number; lon: number } {
  const lon = (x / 20037508.34) * 180;
  const latRad = Math.atan(Math.exp((y / 20037508.34) * Math.PI));
  const lat = (latRad * 360) / Math.PI - 90;
  return { lat, lon };
}

describe('mercatorToLatLon', () => {
  it('converts UNT campus coordinates correctly', () => {
    // First tree in CSV: x=-10815949.5025006, y=3922709.44719577
    const result = mercatorToLatLon(-10815949.5025006, 3922709.44719577);
    expect(result.lon).toBeCloseTo(-97.15, 1);
    expect(result.lat).toBeCloseTo(33.21, 1);
  });
});

describe('hotspot clustering', () => {
  it('clusters trees within 50m of each other', () => {
    // Placeholder — will be filled in step 5
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it passes (conversion is pure math)**

Run: `npx vitest run tests/build-db.test.ts`
Expected: PASS

- [ ] **Step 4: Write failing test for hotspot clustering**

Replace the placeholder test in `tests/build-db.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

function mercatorToLatLon(x: number, y: number): { lat: number; lon: number } {
  const lon = (x / 20037508.34) * 180;
  const latRad = Math.atan(Math.exp((y / 20037508.34) * Math.PI));
  const lat = (latRad * 360) / Math.PI - 90;
  return { lat, lon };
}

interface TreeForClustering {
  id: number;
  lat: number;
  lon: number;
  species: string;
  isNutTree: boolean;
}

interface Cluster {
  trees: TreeForClustering[];
  center_lat: number;
  center_lon: number;
  radius_m: number;
  nut_tree_count: number;
  squirrel_score: number;
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function clusterTrees(trees: TreeForClustering[], maxDistM: number): Cluster[] {
  const visited = new Set<number>();
  const clusters: Cluster[] = [];

  for (const tree of trees) {
    if (visited.has(tree.id)) continue;
    const group: TreeForClustering[] = [tree];
    visited.add(tree.id);

    // BFS: find all trees within maxDistM of any tree in the group
    let i = 0;
    while (i < group.length) {
      const current = group[i];
      for (const candidate of trees) {
        if (visited.has(candidate.id)) continue;
        if (haversineMeters(current.lat, current.lon, candidate.lat, candidate.lon) <= maxDistM) {
          group.push(candidate);
          visited.add(candidate.id);
        }
      }
      i++;
    }

    if (group.length < 3) continue; // Skip tiny clusters

    const center_lat = group.reduce((s, t) => s + t.lat, 0) / group.length;
    const center_lon = group.reduce((s, t) => s + t.lon, 0) / group.length;
    const radius_m = Math.max(
      ...group.map((t) => haversineMeters(center_lat, center_lon, t.lat, t.lon)),
    );
    const nut_tree_count = group.filter((t) => t.isNutTree).length;
    const uniqueSpecies = new Set(group.map((t) => t.species)).size;

    // Score 1-5 based on tree count, nut ratio, species diversity
    let score = 1;
    if (group.length >= 5) score++;
    if (group.length >= 15) score++;
    if (nut_tree_count / group.length >= 0.3) score++;
    if (uniqueSpecies >= 3) score++;

    clusters.push({
      trees: group,
      center_lat,
      center_lon,
      radius_m,
      nut_tree_count,
      squirrel_score: Math.min(score, 5),
    });
  }

  return clusters.sort((a, b) => b.squirrel_score - a.squirrel_score);
}

describe('mercatorToLatLon', () => {
  it('converts UNT campus coordinates correctly', () => {
    const result = mercatorToLatLon(-10815949.5025006, 3922709.44719577);
    expect(result.lon).toBeCloseTo(-97.15, 1);
    expect(result.lat).toBeCloseTo(33.21, 1);
  });
});

describe('clusterTrees', () => {
  it('groups nearby nut trees into clusters', () => {
    const trees: TreeForClustering[] = [
      { id: 1, lat: 33.21, lon: -97.152, species: 'Pecan', isNutTree: true },
      { id: 2, lat: 33.2101, lon: -97.1521, species: 'Live Oak', isNutTree: true },
      { id: 3, lat: 33.2102, lon: -97.1519, species: 'Post Oak', isNutTree: true },
      { id: 4, lat: 33.23, lon: -97.17, species: 'Pecan', isNutTree: true }, // far away
    ];
    const clusters = clusterTrees(trees, 50);
    expect(clusters.length).toBe(1); // Only one cluster of 3, tree 4 is alone
    expect(clusters[0].trees.length).toBe(3);
    expect(clusters[0].nut_tree_count).toBe(3);
  });

  it('skips clusters with fewer than 3 trees', () => {
    const trees: TreeForClustering[] = [
      { id: 1, lat: 33.21, lon: -97.152, species: 'Pecan', isNutTree: true },
      { id: 2, lat: 33.2101, lon: -97.1521, species: 'Live Oak', isNutTree: true },
    ];
    const clusters = clusterTrees(trees, 50);
    expect(clusters.length).toBe(0);
  });

  it('scores higher for more nut trees and species diversity', () => {
    const trees: TreeForClustering[] = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      lat: 33.21 + i * 0.0001,
      lon: -97.152,
      species: ['Pecan', 'Live Oak', 'Post Oak', 'Hackberry'][i % 4],
      isNutTree: true,
    }));
    const clusters = clusterTrees(trees, 50);
    expect(clusters.length).toBeGreaterThan(0);
    expect(clusters[0].squirrel_score).toBeGreaterThanOrEqual(4);
  });
});
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/build-db.test.ts`
Expected: All PASS

- [ ] **Step 6: Write the build-db script**

Create `scripts/build-db.ts`:

```ts
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const NUT_SPECIES = new Set([
  'Live Oak',
  'Post Oak',
  'Red Oak',
  'Bur Oak',
  'Oak',
  'Pecan',
  'Hackberry',
  'Cedar Elm',
  'Sweetgum',
  'Mesquite',
]);

function mercatorToLatLon(x: number, y: number) {
  const lon = (x / 20037508.34) * 180;
  const latRad = Math.atan(Math.exp((y / 20037508.34) * Math.PI));
  const lat = (latRad * 360) / Math.PI - 90;
  return { lat, lon };
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface ParsedTree {
  fid: number;
  unt_id: number;
  lat: number;
  lon: number;
  elevation: number;
  species: string;
  memorial: boolean;
  global_id: string;
  isNutTree: boolean;
}

function parseCSV(csvPath: string): ParsedTree[] {
  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.split('\n').filter((l) => l.trim());
  const trees: ParsedTree[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 12) continue;
    const x = parseFloat(cols[10]); // x column
    const y = parseFloat(cols[11]); // y column
    if (isNaN(x) || isNaN(y)) continue;
    const { lat, lon } = mercatorToLatLon(x, y);
    const species = cols[6]?.trim() || 'Unknown';
    const elevation = parseFloat(cols[3]) || 0;
    trees.push({
      fid: parseInt(cols[0]) || i,
      unt_id: parseInt(cols[5]) || 0,
      lat,
      lon,
      elevation: elevation === -99 ? 0 : elevation,
      species,
      memorial: cols[7]?.trim() === 'Y',
      global_id: cols[9]?.trim() || '',
      isNutTree: NUT_SPECIES.has(species),
    });
  }
  return trees;
}

interface Cluster {
  trees: ParsedTree[];
  center_lat: number;
  center_lon: number;
  radius_m: number;
  nut_tree_count: number;
  squirrel_score: number;
  name: string;
}

function clusterNutTrees(trees: ParsedTree[], maxDistM: number): Cluster[] {
  const nutTrees = trees.filter((t) => t.isNutTree);
  const visited = new Set<number>();
  const clusters: Cluster[] = [];

  for (const tree of nutTrees) {
    if (visited.has(tree.fid)) continue;
    const group: ParsedTree[] = [tree];
    visited.add(tree.fid);

    let idx = 0;
    while (idx < group.length) {
      const current = group[idx];
      for (const candidate of nutTrees) {
        if (visited.has(candidate.fid)) continue;
        if (haversineMeters(current.lat, current.lon, candidate.lat, candidate.lon) <= maxDistM) {
          group.push(candidate);
          visited.add(candidate.fid);
        }
      }
      idx++;
    }

    if (group.length < 3) continue;

    const center_lat = group.reduce((s, t) => s + t.lat, 0) / group.length;
    const center_lon = group.reduce((s, t) => s + t.lon, 0) / group.length;
    const radius_m = Math.max(
      15,
      Math.max(...group.map((t) => haversineMeters(center_lat, center_lon, t.lat, t.lon))),
    );
    const nut_tree_count = group.filter((t) => t.isNutTree).length;
    const uniqueSpecies = new Set(group.map((t) => t.species));

    let score = 1;
    if (group.length >= 5) score++;
    if (group.length >= 15) score++;
    if (nut_tree_count / group.length >= 0.3) score++;
    if (uniqueSpecies.size >= 3) score++;

    // Auto-name: dominant species + direction hint
    const speciesCounts = new Map<string, number>();
    for (const t of group) {
      speciesCounts.set(t.species, (speciesCounts.get(t.species) || 0) + 1);
    }
    const dominant = [...speciesCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const name = `${dominant} Grove`;

    clusters.push({
      trees: group,
      center_lat,
      center_lon,
      radius_m,
      nut_tree_count,
      squirrel_score: Math.min(score, 5),
      name,
    });
  }

  // Sort by score descending, take top 30
  return clusters.sort((a, b) => b.squirrel_score - a.squirrel_score).slice(0, 30);
}

const BADGES = [
  {
    name: 'First Steps',
    description: 'Discover your first zone',
    icon: '👣',
    criteria_type: 'discover_count',
    criteria_value: 1,
  },
  {
    name: 'Nut Detective',
    description: 'Visit 5 pecan/oak clusters',
    icon: '🔍',
    criteria_type: 'discover_count',
    criteria_value: 5,
  },
  {
    name: 'Tree Hugger',
    description: 'Discover 10 zones',
    icon: '🌳',
    criteria_type: 'discover_count',
    criteria_value: 10,
  },
  {
    name: 'Campus Mapper',
    description: 'Discover 50% of all zones',
    icon: '🗺️',
    criteria_type: 'discover_percent',
    criteria_value: 50,
  },
  {
    name: 'Full Safari',
    description: 'Discover all zones',
    icon: '🏆',
    criteria_type: 'discover_percent',
    criteria_value: 100,
  },
  {
    name: 'Sharp Eye',
    description: 'Log your first sighting',
    icon: '👁️',
    criteria_type: 'sighting_count',
    criteria_value: 1,
  },
  {
    name: 'Shutterburg',
    description: 'Log 10 sightings with photos',
    icon: '📸',
    criteria_type: 'photo_count',
    criteria_value: 10,
  },
  {
    name: 'Social Squirrel',
    description: 'Log 25 sightings',
    icon: '🐿️',
    criteria_type: 'sighting_count',
    criteria_value: 25,
  },
  {
    name: 'Photo Album',
    description: 'Log 25 sightings with photos',
    icon: '🖼️',
    criteria_type: 'photo_count',
    criteria_value: 25,
  },
  {
    name: 'Squirrel Whisperer',
    description: 'Ask Scout 25 questions',
    icon: '💬',
    criteria_type: 'chat_count',
    criteria_value: 25,
  },
  {
    name: "Scout's Friend",
    description: 'Ask Scout 50 questions',
    icon: '🤝',
    criteria_type: 'chat_count',
    criteria_value: 50,
  },
  {
    name: 'Questmaster',
    description: 'Complete 10 quests',
    icon: '⚔️',
    criteria_type: 'quest_count',
    criteria_value: 10,
  },
  {
    name: 'Early Bird',
    description: 'Log a sighting before 8am',
    icon: '🌅',
    criteria_type: 'time_before',
    criteria_value: 8,
  },
  {
    name: 'Night Owl',
    description: 'Log a sighting after 9pm',
    icon: '🦉',
    criteria_type: 'time_after',
    criteria_value: 21,
  },
  {
    name: 'Speed Runner',
    description: 'Discover 5 zones in one day',
    icon: '⚡',
    criteria_type: 'daily_discover',
    criteria_value: 5,
  },
  {
    name: 'Dedicated Explorer',
    description: 'Use the app 7 days in a row',
    icon: '📅',
    criteria_type: 'streak',
    criteria_value: 7,
  },
  {
    name: 'Oak Explorer',
    description: 'Discover all oak-heavy zones',
    icon: '🌿',
    criteria_type: 'oak_zones',
    criteria_value: 100,
  },
  {
    name: 'Pecan Pro',
    description: 'Visit all pecan clusters',
    icon: '🥜',
    criteria_type: 'pecan_zones',
    criteria_value: 100,
  },
  {
    name: 'Memorial Hunter',
    description: 'Discover a zone with memorial trees',
    icon: '🪦',
    criteria_type: 'memorial_zone',
    criteria_value: 1,
  },
  {
    name: 'Diversity Spotter',
    description: 'Visit zones with 5+ species',
    icon: '🌈',
    criteria_type: 'diverse_zone',
    criteria_value: 1,
  },
  {
    name: 'Elevation Expert',
    description: 'Visit zones at 5 different elevations',
    icon: '⛰️',
    criteria_type: 'elevation_count',
    criteria_value: 5,
  },
  {
    name: 'Century Club',
    description: 'Reach 10,000 points',
    icon: '💯',
    criteria_type: 'score',
    criteria_value: 10000,
  },
  {
    name: 'Legend',
    description: 'Reach level 20',
    icon: '⭐',
    criteria_type: 'level',
    criteria_value: 20,
  },
  {
    name: 'Completionist',
    description: 'Earn all other badges',
    icon: '👑',
    criteria_type: 'all_badges',
    criteria_value: 23,
  },
];

function buildDatabase(csvPath: string, dbPath: string) {
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE trees (
      id INTEGER PRIMARY KEY,
      unt_id INTEGER,
      lat REAL,
      lon REAL,
      elevation REAL,
      species TEXT,
      memorial BOOLEAN,
      global_id TEXT
    );
    CREATE INDEX idx_trees_latlon ON trees(lat, lon);

    CREATE TABLE hotspots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      center_lat REAL,
      center_lon REAL,
      radius_m REAL,
      tree_count INTEGER,
      nut_tree_count INTEGER,
      squirrel_score INTEGER,
      discovered BOOLEAN DEFAULT 0
    );

    CREATE TABLE sightings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hotspot_id INTEGER,
      lat REAL,
      lon REAL,
      photo_path TEXT,
      notes TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (hotspot_id) REFERENCES hotspots(id)
    );

    CREATE TABLE badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      icon TEXT,
      criteria_type TEXT,
      criteria_value INTEGER,
      earned BOOLEAN DEFAULT 0,
      earned_at DATETIME
    );

    CREATE TABLE quest_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quest_text TEXT,
      target_hotspot_id INTEGER,
      status TEXT DEFAULT 'active',
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (target_hotspot_id) REFERENCES hotspots(id)
    );

    CREATE TABLE player (
      id INTEGER PRIMARY KEY DEFAULT 1,
      score INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      total_discoveries INTEGER DEFAULT 0,
      total_sightings INTEGER DEFAULT 0,
      total_quests_completed INTEGER DEFAULT 0
    );
    INSERT INTO player (id) VALUES (1);

    CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    INSERT INTO settings (key, value) VALUES ('ollama_url', 'http://localhost:11434');
    INSERT INTO settings (key, value) VALUES ('ollama_model', 'llama3.2');
    INSERT INTO settings (key, value) VALUES ('geolocation_enabled', 'false');
  `);

  // Insert trees
  const trees = parseCSV(csvPath);
  const insertTree = db.prepare(
    'INSERT INTO trees (id, unt_id, lat, lon, elevation, species, memorial, global_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  );
  const insertMany = db.transaction((items: ParsedTree[]) => {
    for (const t of items) {
      insertTree.run(
        t.fid,
        t.unt_id,
        t.lat,
        t.lon,
        t.elevation,
        t.species,
        t.memorial ? 1 : 0,
        t.global_id,
      );
    }
  });
  insertMany(trees);
  console.log(`Inserted ${trees.length} trees`);

  // Cluster and insert hotspots
  const clusters = clusterNutTrees(trees, 50);
  // Deduplicate names by appending a number
  const nameCount = new Map<string, number>();
  for (const c of clusters) {
    const count = nameCount.get(c.name) || 0;
    nameCount.set(c.name, count + 1);
    if (count > 0) c.name = `${c.name} ${count + 1}`;
  }

  const insertHotspot = db.prepare(
    'INSERT INTO hotspots (name, center_lat, center_lon, radius_m, tree_count, nut_tree_count, squirrel_score) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  for (const c of clusters) {
    insertHotspot.run(
      c.name,
      c.center_lat,
      c.center_lon,
      c.radius_m,
      c.trees.length,
      c.nut_tree_count,
      c.squirrel_score,
    );
  }
  console.log(`Created ${clusters.length} hotspot zones`);

  // Insert badges
  const insertBadge = db.prepare(
    'INSERT INTO badges (name, description, icon, criteria_type, criteria_value) VALUES (?, ?, ?, ?, ?)',
  );
  for (const b of BADGES) {
    insertBadge.run(b.name, b.description, b.icon, b.criteria_type, b.criteria_value);
  }
  console.log(`Seeded ${BADGES.length} badges`);

  db.close();
  console.log(`Database built: ${dbPath}`);
}

// Run
const csvPath = path.resolve(__dirname, '..', 'data', 'trees.csv');
const dbPath = path.resolve(__dirname, '..', 'data', 'squirrels.db');
buildDatabase(csvPath, dbPath);
```

- [ ] **Step 7: Run the build-db script**

Run:

```bash
npx tsx scripts/build-db.ts
```

Expected output:

```
Inserted 5053 trees
Created NN hotspot zones
Seeded 24 badges
Database built: .../data/squirrels.db
```

- [ ] **Step 8: Verify database contents**

Run:

```bash
npx tsx -e "
const Database = require('better-sqlite3');
const db = new Database('data/squirrels.db');
console.log('Trees:', db.prepare('SELECT COUNT(*) as c FROM trees').get());
console.log('Hotspots:', db.prepare('SELECT COUNT(*) as c FROM hotspots').get());
console.log('Sample hotspot:', db.prepare('SELECT * FROM hotspots LIMIT 1').get());
console.log('Badges:', db.prepare('SELECT COUNT(*) as c FROM badges').get());
db.close();
"
```

Expected: Tree count ~5053, hotspot count 20-30, badges 24.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: data pipeline — CSV to SQLite with hotspot clustering"
```

---

## Task 3: Database Layer (Main Process)

**Files:**

- Create: `src/main/db.ts`
- Create: `tests/db.test.ts`

- [ ] **Step 1: Write failing tests for DB queries**

Create `tests/db.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';

let db: InstanceType<typeof Database>;

beforeAll(() => {
  db = new Database(path.resolve(__dirname, '..', 'data', 'squirrels.db'));
});

afterAll(() => {
  db.close();
});

describe('tree queries', () => {
  it('fetches trees within a bounding box', () => {
    // UNT campus rough bounds
    const rows = db
      .prepare('SELECT * FROM trees WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? LIMIT 10')
      .all(33.2, 33.22, -97.16, -97.14);
    expect(rows.length).toBeGreaterThan(0);
  });
});

describe('hotspot queries', () => {
  it('fetches all hotspots', () => {
    const rows = db.prepare('SELECT * FROM hotspots').all();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(30);
  });

  it('hotspots have valid scores between 1-5', () => {
    const rows = db.prepare('SELECT squirrel_score FROM hotspots').all() as any[];
    for (const row of rows) {
      expect(row.squirrel_score).toBeGreaterThanOrEqual(1);
      expect(row.squirrel_score).toBeLessThanOrEqual(5);
    }
  });
});

describe('player queries', () => {
  it('has initial player row', () => {
    const player = db.prepare('SELECT * FROM player WHERE id = 1').get() as any;
    expect(player).toBeDefined();
    expect(player.score).toBe(0);
    expect(player.level).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass (queries against built DB)**

Run: `npx vitest run tests/db.test.ts`
Expected: All PASS

- [ ] **Step 3: Write the database layer module**

Create `src/main/db.ts`:

```ts
import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import type { Tree, Hotspot, Sighting, Badge, Quest, Player, BoundingBox } from '../shared/types';

let db: InstanceType<typeof Database>;

export function initDB() {
  const dbPath =
    process.env.NODE_ENV === 'development'
      ? path.resolve(__dirname, '..', '..', 'data', 'squirrels.db')
      : path.join(process.resourcesPath, 'squirrels.db');

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  return db;
}

export function closeDB() {
  if (db) db.close();
}

// Trees
export function queryTrees(bounds: BoundingBox): Tree[] {
  return db
    .prepare('SELECT * FROM trees WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?')
    .all(bounds.minLat, bounds.maxLat, bounds.minLon, bounds.maxLon) as Tree[];
}

// Hotspots
export function getAllHotspots(): Hotspot[] {
  return db.prepare('SELECT * FROM hotspots').all() as Hotspot[];
}

export function queryHotspots(lat: number, lon: number, radiusKm: number): Hotspot[] {
  // Approximate bounding box for radius
  const dLat = radiusKm / 111.0;
  const dLon = radiusKm / (111.0 * Math.cos((lat * Math.PI) / 180));
  return db
    .prepare(
      'SELECT * FROM hotspots WHERE center_lat BETWEEN ? AND ? AND center_lon BETWEEN ? AND ?',
    )
    .all(lat - dLat, lat + dLat, lon - dLon, lon + dLon) as Hotspot[];
}

export function discoverZone(hotspotId: number): Hotspot {
  db.prepare('UPDATE hotspots SET discovered = 1 WHERE id = ?').run(hotspotId);
  return db.prepare('SELECT * FROM hotspots WHERE id = ?').get(hotspotId) as Hotspot;
}

// Sightings
export function logSighting(sighting: Omit<Sighting, 'id' | 'timestamp'>): Sighting {
  const result = db
    .prepare(
      'INSERT INTO sightings (hotspot_id, lat, lon, photo_path, notes) VALUES (?, ?, ?, ?, ?)',
    )
    .run(sighting.hotspot_id, sighting.lat, sighting.lon, sighting.photo_path, sighting.notes);
  return db.prepare('SELECT * FROM sightings WHERE id = ?').get(result.lastInsertRowid) as Sighting;
}

export function getSightings(hotspotId?: number): Sighting[] {
  if (hotspotId) {
    return db
      .prepare('SELECT * FROM sightings WHERE hotspot_id = ? ORDER BY timestamp DESC')
      .all(hotspotId) as Sighting[];
  }
  return db.prepare('SELECT * FROM sightings ORDER BY timestamp DESC').all() as Sighting[];
}

// Badges
export function getBadges(): Badge[] {
  return db.prepare('SELECT * FROM badges ORDER BY id').all() as Badge[];
}

export function earnBadge(badgeId: number) {
  db.prepare('UPDATE badges SET earned = 1, earned_at = datetime("now") WHERE id = ?').run(badgeId);
}

// Quests
export function getQuests(): Quest[] {
  return db.prepare('SELECT * FROM quest_log ORDER BY generated_at DESC').all() as Quest[];
}

export function addQuest(questText: string, targetHotspotId: number | null): Quest {
  const result = db
    .prepare('INSERT INTO quest_log (quest_text, target_hotspot_id) VALUES (?, ?)')
    .run(questText, targetHotspotId);
  return db.prepare('SELECT * FROM quest_log WHERE id = ?').get(result.lastInsertRowid) as Quest;
}

export function completeQuest(questId: number) {
  db.prepare(
    'UPDATE quest_log SET status = "completed", completed_at = datetime("now") WHERE id = ?',
  ).run(questId);
}

// Player
export function getPlayer(): Player {
  return db.prepare('SELECT * FROM player WHERE id = 1').get() as Player;
}

export function addScore(points: number) {
  db.prepare('UPDATE player SET score = score + ? WHERE id = 1').run(points);
  const player = getPlayer();
  const newLevel = Math.floor(player.score / 500) + 1;
  if (newLevel > player.level) {
    db.prepare('UPDATE player SET level = ? WHERE id = 1').run(newLevel);
  }
  return getPlayer();
}

export function incrementStat(
  stat: 'total_discoveries' | 'total_sightings' | 'total_quests_completed',
) {
  db.prepare(`UPDATE player SET ${stat} = ${stat} + 1 WHERE id = 1`).run();
}

// Settings
export function getSetting(key: string): string | undefined {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value;
}

export function setSetting(key: string, value: string) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: SQLite database layer with tree, hotspot, game queries"
```

---

## Task 4: Game Engine

**Files:**

- Create: `src/main/game-engine.ts`
- Create: `tests/game-engine.test.ts`

- [ ] **Step 1: Write failing tests for scoring and badge checking**

Create `tests/game-engine.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

// Inline the pure functions for testing (no DB dependency)

function calculateLevel(score: number): number {
  return Math.floor(score / 500) + 1;
}

function checkBadgeCriteria(
  criteriaType: string,
  criteriaValue: number,
  stats: {
    discoveries: number;
    sightings: number;
    photoCount: number;
    chatCount: number;
    questCount: number;
    score: number;
    level: number;
    totalBadges: number;
    earnedBadges: number;
    totalHotspots: number;
  },
): boolean {
  switch (criteriaType) {
    case 'discover_count':
      return stats.discoveries >= criteriaValue;
    case 'discover_percent':
      return (stats.discoveries / stats.totalHotspots) * 100 >= criteriaValue;
    case 'sighting_count':
      return stats.sightings >= criteriaValue;
    case 'photo_count':
      return stats.photoCount >= criteriaValue;
    case 'chat_count':
      return stats.chatCount >= criteriaValue;
    case 'quest_count':
      return stats.questCount >= criteriaValue;
    case 'score':
      return stats.score >= criteriaValue;
    case 'level':
      return stats.level >= criteriaValue;
    case 'all_badges':
      return stats.earnedBadges >= criteriaValue;
    default:
      return false;
  }
}

describe('calculateLevel', () => {
  it('starts at level 1', () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it('levels up every 500 points', () => {
    expect(calculateLevel(499)).toBe(1);
    expect(calculateLevel(500)).toBe(2);
    expect(calculateLevel(999)).toBe(2);
    expect(calculateLevel(1000)).toBe(3);
  });
});

describe('checkBadgeCriteria', () => {
  const baseStats = {
    discoveries: 0,
    sightings: 0,
    photoCount: 0,
    chatCount: 0,
    questCount: 0,
    score: 0,
    level: 1,
    totalBadges: 24,
    earnedBadges: 0,
    totalHotspots: 25,
  };

  it('checks discover_count', () => {
    expect(checkBadgeCriteria('discover_count', 5, { ...baseStats, discoveries: 4 })).toBe(false);
    expect(checkBadgeCriteria('discover_count', 5, { ...baseStats, discoveries: 5 })).toBe(true);
  });

  it('checks discover_percent', () => {
    expect(checkBadgeCriteria('discover_percent', 50, { ...baseStats, discoveries: 12 })).toBe(
      false,
    );
    expect(checkBadgeCriteria('discover_percent', 50, { ...baseStats, discoveries: 13 })).toBe(
      true,
    );
  });

  it('checks score', () => {
    expect(checkBadgeCriteria('score', 10000, { ...baseStats, score: 9999 })).toBe(false);
    expect(checkBadgeCriteria('score', 10000, { ...baseStats, score: 10000 })).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run tests/game-engine.test.ts`
Expected: All PASS

- [ ] **Step 3: Write game-engine.ts**

Create `src/main/game-engine.ts`:

```ts
import * as db from './db';

const POINTS = {
  DISCOVER_ZONE: 100,
  LOG_SIGHTING: 50,
  EARN_BADGE: 200,
  COMPLETE_QUEST: 300,
};

export function calculateLevel(score: number): number {
  return Math.floor(score / 500) + 1;
}

export function checkBadgeCriteria(
  criteriaType: string,
  criteriaValue: number,
  stats: {
    discoveries: number;
    sightings: number;
    photoCount: number;
    chatCount: number;
    questCount: number;
    score: number;
    level: number;
    totalBadges: number;
    earnedBadges: number;
    totalHotspots: number;
  },
): boolean {
  switch (criteriaType) {
    case 'discover_count':
      return stats.discoveries >= criteriaValue;
    case 'discover_percent':
      return (stats.discoveries / stats.totalHotspots) * 100 >= criteriaValue;
    case 'sighting_count':
      return stats.sightings >= criteriaValue;
    case 'photo_count':
      return stats.photoCount >= criteriaValue;
    case 'chat_count':
      return stats.chatCount >= criteriaValue;
    case 'quest_count':
      return stats.questCount >= criteriaValue;
    case 'score':
      return stats.score >= criteriaValue;
    case 'level':
      return stats.level >= criteriaValue;
    case 'all_badges':
      return stats.earnedBadges >= criteriaValue;
    default:
      return false;
  }
}

export interface GameEvent {
  type: 'score' | 'level_up' | 'badge_earned' | 'zone_discovered';
  payload: any;
}

export function handleDiscoverZone(hotspotId: number): GameEvent[] {
  const events: GameEvent[] = [];
  const hotspot = db.discoverZone(hotspotId);
  db.incrementStat('total_discoveries');
  const player = db.addScore(POINTS.DISCOVER_ZONE);
  events.push({ type: 'zone_discovered', payload: hotspot });
  events.push({ type: 'score', payload: { points: POINTS.DISCOVER_ZONE, total: player.score } });

  const newLevel = calculateLevel(player.score);
  if (newLevel > player.level) {
    events.push({ type: 'level_up', payload: { level: newLevel } });
  }

  // Check badges
  events.push(...checkAndAwardBadges());
  return events;
}

export function handleLogSighting(sighting: {
  hotspot_id: number | null;
  lat: number;
  lon: number;
  photo_path: string | null;
  notes: string;
}): GameEvent[] {
  const events: GameEvent[] = [];
  db.logSighting(sighting);
  db.incrementStat('total_sightings');
  const player = db.addScore(POINTS.LOG_SIGHTING);
  events.push({ type: 'score', payload: { points: POINTS.LOG_SIGHTING, total: player.score } });

  events.push(...checkAndAwardBadges());
  return events;
}

export function handleCompleteQuest(questId: number): GameEvent[] {
  const events: GameEvent[] = [];
  db.completeQuest(questId);
  db.incrementStat('total_quests_completed');
  const player = db.addScore(POINTS.COMPLETE_QUEST);
  events.push({ type: 'score', payload: { points: POINTS.COMPLETE_QUEST, total: player.score } });

  events.push(...checkAndAwardBadges());
  return events;
}

function checkAndAwardBadges(): GameEvent[] {
  const events: GameEvent[] = [];
  const badges = db.getBadges();
  const player = db.getPlayer();
  const hotspots = db.getAllHotspots();
  const sightings = db.getSightings();

  const stats = {
    discoveries: player.total_discoveries,
    sightings: player.total_sightings,
    photoCount: sightings.filter((s) => s.photo_path).length,
    chatCount: parseInt(db.getSetting('chat_count') || '0'),
    questCount: player.total_quests_completed,
    score: player.score,
    level: player.level,
    totalBadges: badges.length,
    earnedBadges: badges.filter((b) => b.earned).length,
    totalHotspots: hotspots.length,
  };

  for (const badge of badges) {
    if (badge.earned) continue;
    if (checkBadgeCriteria(badge.criteria_type, badge.criteria_value, stats)) {
      db.earnBadge(badge.id);
      db.addScore(POINTS.EARN_BADGE);
      events.push({ type: 'badge_earned', payload: badge });
    }
  }

  return events;
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: game engine — scoring, levels, badge checking"
```

---

## Task 5: Ollama Client

**Files:**

- Create: `src/main/ollama.ts`
- Create: `tests/ollama.test.ts`

- [ ] **Step 1: Write tests for Ollama client (mocked HTTP)**

Create `tests/ollama.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

function buildSystemPrompt(context: {
  hotspots: { name: string; squirrel_score: number; species: string[] }[];
  playerLevel: number;
  discoveries: number;
}): string {
  const hotspotInfo = context.hotspots
    .map((h) => `- ${h.name} (score: ${h.squirrel_score}/5, species: ${h.species.join(', ')})`)
    .join('\n');

  return `You are the Squirrel Scout, a retro-game NPC guide helping UNT students find squirrels on campus.
Personality: Enthusiastic, helpful, short punchy sentences. Occasional arcade-game flair.
The student is level ${context.playerLevel} with ${context.discoveries} zones discovered.

Known squirrel hotspots on UNT campus:
${hotspotInfo}

Give location-specific advice about where squirrels hang out based on tree species.
Nut-producing trees (oaks, pecans, hackberries) attract the most squirrels.
Keep responses under 150 words. Be fun and encouraging!`;
}

describe('buildSystemPrompt', () => {
  it('includes hotspot data and player level', () => {
    const prompt = buildSystemPrompt({
      hotspots: [{ name: 'Pecan Grove', squirrel_score: 5, species: ['Pecan', 'Live Oak'] }],
      playerLevel: 3,
      discoveries: 7,
    });
    expect(prompt).toContain('Squirrel Scout');
    expect(prompt).toContain('Pecan Grove');
    expect(prompt).toContain('level 3');
    expect(prompt).toContain('7 zones discovered');
  });
});
```

- [ ] **Step 2: Run test**

Run: `npx vitest run tests/ollama.test.ts`
Expected: PASS

- [ ] **Step 3: Write ollama.ts**

Create `src/main/ollama.ts`:

```ts
import * as db from './db';
import type { OllamaMessage, Hotspot } from '../shared/types';

export function buildSystemPrompt(context: {
  hotspots: { name: string; squirrel_score: number; center_lat: number; center_lon: number }[];
  playerLevel: number;
  discoveries: number;
}): string {
  const hotspotInfo = context.hotspots
    .map(
      (h) =>
        `- ${h.name} (squirrel score: ${h.squirrel_score}/5, at ${h.center_lat.toFixed(4)}, ${h.center_lon.toFixed(4)})`,
    )
    .join('\n');

  return `You are the Squirrel Scout, a retro-game NPC guide helping UNT students find squirrels on campus.
Personality: Enthusiastic, helpful, short punchy sentences. Occasional arcade-game flair like "ACHIEVEMENT UNLOCKED" or "QUEST HINT".
The student is level ${context.playerLevel} with ${context.discoveries} zones discovered.

Known squirrel hotspots on UNT campus:
${hotspotInfo}

Give location-specific advice about where squirrels hang out based on tree species and clusters.
Nut-producing trees (oaks, pecans, hackberries) attract the most squirrels.
Keep responses under 150 words. Be fun and encouraging!`;
}

export async function checkOllamaStatus(): Promise<{ online: boolean; url: string }> {
  const urls = [db.getSetting('ollama_url') || 'http://localhost:11434', 'http://localhost:11434'];

  for (const url of [...new Set(urls)]) {
    try {
      const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) return { online: true, url };
    } catch {}
  }
  return { online: false, url: '' };
}

export async function chat(messages: OllamaMessage[]): Promise<string> {
  const status = await checkOllamaStatus();
  if (!status.online) throw new Error('Ollama is offline');

  const model = db.getSetting('ollama_model') || 'llama3.2';

  // Build context
  const hotspots = db.getAllHotspots();
  const player = db.getPlayer();
  const systemPrompt = buildSystemPrompt({
    hotspots,
    playerLevel: player.level,
    discoveries: player.total_discoveries,
  });

  const fullMessages = [{ role: 'system' as const, content: systemPrompt }, ...messages];

  const res = await fetch(`${status.url}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: fullMessages, stream: false }),
  });

  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  const data = await res.json();

  // Track chat count for badges
  const chatCount = parseInt(db.getSetting('chat_count') || '0') + 1;
  db.setSetting('chat_count', String(chatCount));

  return data.message?.content || 'The Squirrel Scout is thinking...';
}

export async function generateQuest(): Promise<string> {
  const hotspots = db.getAllHotspots();
  const undiscovered = hotspots.filter((h) => !h.discovered);

  if (undiscovered.length === 0) {
    return "You've discovered every zone! Keep logging sightings to earn more badges.";
  }

  const target = undiscovered[Math.floor(Math.random() * undiscovered.length)];

  const status = await checkOllamaStatus();
  if (!status.online) {
    // Fallback: generate a simple quest without AI
    return `Explore the ${target.name} area — it has a squirrel score of ${target.squirrel_score}/5!`;
  }

  const model = db.getSetting('ollama_model') || 'llama3.2';
  const res = await fetch(`${status.url}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a retro game quest generator. Write a short, fun quest description (1-2 sentences) for a squirrel-finding mission on a university campus. Be specific about the location. Use arcade-game style language.',
        },
        {
          role: 'user',
          content: `Generate a quest to discover the "${target.name}" zone. It has ${target.nut_tree_count} nut trees and a squirrel score of ${target.squirrel_score}/5. Make it sound exciting!`,
        },
      ],
      stream: false,
    }),
  });

  if (!res.ok) return `Explore the ${target.name} area!`;
  const data = await res.json();
  const questText = data.message?.content || `Find the ${target.name}!`;

  db.addQuest(questText, target.id);
  return questText;
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: Ollama client with system prompt, status check, quest generation"
```

---

## Task 6: IPC Bridge

**Files:**

- Create: `src/main/ipc.ts`
- Modify: `src/main/index.ts` — wire up DB + IPC

- [ ] **Step 1: Write IPC handler registration**

Create `src/main/ipc.ts`:

```ts
import { ipcMain } from 'electron';
import * as db from './db';
import * as ollama from './ollama';
import * as gameEngine from './game-engine';
import type { BoundingBox } from '../shared/types';

export function registerIPC() {
  // Database queries
  ipcMain.handle('db:query-trees', (_e, bounds: BoundingBox) => db.queryTrees(bounds));
  ipcMain.handle('db:query-hotspots', (_e, lat: number, lon: number, radiusKm: number) =>
    db.queryHotspots(lat, lon, radiusKm),
  );
  ipcMain.handle('db:all-hotspots', () => db.getAllHotspots());
  ipcMain.handle('db:get-setting', (_e, key: string) => db.getSetting(key));
  ipcMain.handle('db:set-setting', (_e, key: string, value: string) => db.setSetting(key, value));

  // Ollama
  ipcMain.handle('ollama:chat', async (_e, messages) => {
    try {
      return { ok: true, response: await ollama.chat(messages) };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });
  ipcMain.handle('ollama:status', () => ollama.checkOllamaStatus());
  ipcMain.handle('ollama:generate-quest', async () => {
    try {
      return { ok: true, quest: await ollama.generateQuest() };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  // Game actions
  ipcMain.handle('game:discover-zone', (_e, hotspotId: number) =>
    gameEngine.handleDiscoverZone(hotspotId),
  );
  ipcMain.handle('game:log-sighting', (_e, sighting) => gameEngine.handleLogSighting(sighting));
  ipcMain.handle('game:get-badges', () => db.getBadges());
  ipcMain.handle('game:get-player', () => db.getPlayer());
  ipcMain.handle('game:get-quests', () => db.getQuests());
  ipcMain.handle('game:get-sightings', (_e, hotspotId?: number) => db.getSightings(hotspotId));
  ipcMain.handle('game:complete-quest', (_e, questId: number) =>
    gameEngine.handleCompleteQuest(questId),
  );
}
```

- [ ] **Step 2: Update main/index.ts to wire up DB and IPC**

Replace `src/main/index.ts`:

```ts
import { app, BrowserWindow } from 'electron';
import path from 'path';
import { initDB, closeDB } from './db';
import { registerIPC } from './ipc';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'UNT Fluffy Squirrel Safari',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  initDB();
  registerIPC();
  createWindow();
});

app.on('window-all-closed', () => {
  closeDB();
  app.quit();
});
```

- [ ] **Step 3: Create renderer IPC wrapper**

Create `src/renderer/lib/api.ts`:

```ts
declare global {
  interface Window {
    api: {
      queryTrees: (
        bounds: import('@shared/types').BoundingBox,
      ) => Promise<import('@shared/types').Tree[]>;
      queryHotspots: (
        lat: number,
        lon: number,
        radiusKm: number,
      ) => Promise<import('@shared/types').Hotspot[]>;
      getAllHotspots: () => Promise<import('@shared/types').Hotspot[]>;
      ollamaChat: (
        messages: import('@shared/types').OllamaMessage[],
      ) => Promise<{ ok: boolean; response?: string; error?: string }>;
      ollamaStatus: () => Promise<{ online: boolean; url: string }>;
      ollamaGenerateQuest: () => Promise<{ ok: boolean; quest?: string; error?: string }>;
      logSighting: (sighting: any) => Promise<import('./../../main/game-engine').GameEvent[]>;
      discoverZone: (hotspotId: number) => Promise<import('./../../main/game-engine').GameEvent[]>;
      getBadges: () => Promise<import('@shared/types').Badge[]>;
      getPlayer: () => Promise<import('@shared/types').Player>;
      getQuests: () => Promise<import('@shared/types').Quest[]>;
      getSightings: (hotspotId?: number) => Promise<import('@shared/types').Sighting[]>;
      getSetting: (key: string) => Promise<string | undefined>;
      setSetting: (key: string, value: string) => Promise<void>;
    };
  }
}

export const api = window.api;
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: IPC bridge connecting renderer to main process"
```

---

## Task 7: Retro Theme CSS + App Layout Shell

**Files:**

- Modify: `src/renderer/global.css`
- Modify: `src/renderer/App.tsx`
- Create: `src/renderer/components/TopBar.tsx`
- Create: `src/renderer/components/Sidebar.tsx`
- Create: `src/renderer/components/Toast.tsx`
- Create: `src/renderer/hooks/useGameState.ts`

- [ ] **Step 1: Write retro arcade CSS**

Replace `src/renderer/global.css`:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
html,
body,
#root {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

:root {
  --bg: #1a1a2e;
  --bg-deep: #16213e;
  --bg-dark: #0f3460;
  --accent: #e94560;
  --gold: #fdcb6e;
  --purple: #533483;
  --text: #eeeeee;
  --text-dim: #888888;
  --font: 'Courier New', 'Courier', monospace;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: var(--bg);
}
::-webkit-scrollbar-thumb {
  background: var(--accent);
  border-radius: 3px;
}

/* Toast animation */
@keyframes toastIn {
  0% {
    transform: translateY(-100%) scale(0.8);
    opacity: 0;
  }
  50% {
    transform: translateY(10px) scale(1.05);
  }
  100% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}
@keyframes toastOut {
  to {
    transform: translateY(-100%);
    opacity: 0;
  }
}
@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(233, 69, 96, 0.4);
  }
  50% {
    box-shadow: 0 0 0 12px rgba(233, 69, 96, 0);
  }
}
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.toast {
  position: fixed;
  top: 50px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: var(--bg);
  border: 2px solid var(--accent);
  padding: 12px 24px;
  font-size: 18px;
  font-weight: bold;
  letter-spacing: 2px;
  text-transform: uppercase;
  animation:
    toastIn 0.4s ease-out,
    toastOut 0.3s 2.5s ease-in forwards;
}
.toast.level-up {
  color: var(--gold);
  border-color: var(--gold);
}
.toast.badge {
  color: var(--purple);
  border-color: var(--purple);
}
.toast.discovery {
  color: var(--accent);
}
```

- [ ] **Step 2: Create useGameState hook**

Create `src/renderer/hooks/useGameState.ts`:

```ts
import { useState, useEffect, useCallback } from 'react';
import type { Player, Badge, Hotspot, Quest } from '@shared/types';

interface GameState {
  player: Player | null;
  badges: Badge[];
  hotspots: Hotspot[];
  quests: Quest[];
  ollamaOnline: boolean;
}

interface ToastMessage {
  id: number;
  text: string;
  type: 'level-up' | 'badge' | 'discovery' | 'score';
}

export function useGameState() {
  const [state, setState] = useState<GameState>({
    player: null,
    badges: [],
    hotspots: [],
    quests: [],
    ollamaOnline: false,
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const refresh = useCallback(async () => {
    const [player, badges, hotspots, quests, ollamaStatus] = await Promise.all([
      window.api.getPlayer(),
      window.api.getBadges(),
      window.api.getAllHotspots(),
      window.api.getQuests(),
      window.api.ollamaStatus(),
    ]);
    setState({ player, badges, hotspots, quests, ollamaOnline: ollamaStatus.online });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addToast = useCallback((text: string, type: ToastMessage['type']) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const processEvents = useCallback(
    (events: any[]) => {
      for (const event of events) {
        if (event.type === 'level_up') addToast(`LEVEL UP! LV.${event.payload.level}`, 'level-up');
        if (event.type === 'badge_earned') addToast(`BADGE: ${event.payload.name}`, 'badge');
        if (event.type === 'zone_discovered')
          addToast(`ZONE DISCOVERED: ${event.payload.name}`, 'discovery');
      }
      refresh();
    },
    [addToast, refresh],
  );

  return { ...state, toasts, refresh, processEvents, addToast };
}
```

- [ ] **Step 3: Create TopBar component**

Create `src/renderer/components/TopBar.tsx`:

```tsx
import type { Player, Badge } from '@shared/types';

interface Props {
  player: Player | null;
  badges: Badge[];
  ollamaOnline: boolean;
}

export default function TopBar({ player, badges, ollamaOnline }: Props) {
  const earned = badges.filter((b) => b.earned).length;
  return (
    <div
      style={{
        background: 'var(--accent)',
        padding: '6px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontWeight: 'bold',
        fontSize: 14,
        color: 'var(--bg)',
        letterSpacing: 2,
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>&#x1F43F;&#xFE0F;</span>
        <span>UNT FLUFFY SQUIRREL SAFARI</span>
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
        <span>SCORE: {player?.score ?? 0}</span>
        <span>LV.{player?.level ?? 1}</span>
        <span>
          &#x1F3C5; {earned}/{badges.length}
        </span>
        <span style={{ color: ollamaOnline ? '#00ff88' : '#ff4444' }}>
          {ollamaOnline ? 'SCOUT ONLINE' : 'SCOUT OFFLINE'}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create Sidebar shell component**

Create `src/renderer/components/Sidebar.tsx`:

```tsx
import { useState, type ReactNode } from 'react';

interface Props {
  chatTab: ReactNode;
  guideTab: ReactNode;
  badgesTab: ReactNode;
}

export default function Sidebar({ chatTab, guideTab, badgesTab }: Props) {
  const [activeTab, setActiveTab] = useState<'chat' | 'guide' | 'badges'>('chat');
  const tabs = [
    { key: 'chat' as const, label: 'CHAT' },
    { key: 'guide' as const, label: 'GUIDE' },
    { key: 'badges' as const, label: 'BADGES' },
  ];

  return (
    <div
      style={{
        width: 300,
        background: 'var(--bg)',
        borderLeft: '2px solid var(--accent)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', borderBottom: '2px solid var(--accent)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              padding: '8px 0',
              background: activeTab === tab.key ? 'var(--accent)' : 'transparent',
              color: activeTab === tab.key ? 'var(--bg)' : 'var(--accent)',
              border: 'none',
              fontFamily: 'var(--font)',
              fontWeight: 'bold',
              fontSize: 11,
              cursor: 'pointer',
              letterSpacing: 1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'chat' && chatTab}
        {activeTab === 'guide' && guideTab}
        {activeTab === 'badges' && badgesTab}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create Toast component**

Create `src/renderer/components/Toast.tsx`:

```tsx
interface ToastMessage {
  id: number;
  text: string;
  type: 'level-up' | 'badge' | 'discovery' | 'score';
}

export default function ToastContainer({ toasts }: { toasts: ToastMessage[] }) {
  return (
    <>
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {toast.text}
        </div>
      ))}
    </>
  );
}
```

- [ ] **Step 6: Wire up App.tsx layout**

Replace `src/renderer/App.tsx`:

```tsx
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import ToastContainer from './components/Toast';
import { useGameState } from './hooks/useGameState';

export default function App() {
  const game = useGameState();

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TopBar player={game.player} badges={game.badges} ollamaOnline={game.ollamaOnline} />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div
          style={{
            flex: 1,
            background: 'var(--bg-deep)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ color: 'var(--bg-dark)', fontSize: 48, fontWeight: 'bold' }}>MAP</span>
        </div>
        <Sidebar
          chatTab={
            <div style={{ padding: 12, color: 'var(--text-dim)', fontSize: 11 }}>
              Chat coming soon...
            </div>
          }
          guideTab={
            <div style={{ padding: 12, color: 'var(--text-dim)', fontSize: 11 }}>
              Field guide coming soon...
            </div>
          }
          badgesTab={
            <div style={{ padding: 12, color: 'var(--text-dim)', fontSize: 11 }}>
              Badges coming soon...
            </div>
          }
        />
      </div>
      <ToastContainer toasts={game.toasts} />
    </div>
  );
}
```

- [ ] **Step 7: Verify the layout renders**

Run:

```bash
npm run dev
```

Open `http://localhost:5173` in a browser. Expected: Hot pink top bar with "UNT FLUFFY SQUIRREL SAFARI" title, dark map placeholder area on left, sidebar with CHAT/GUIDE/BADGES tabs on right.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: retro arcade UI shell — top bar, sidebar, toast system"
```

---

## Task 8: MapLibre GL Map View

**Files:**

- Create: `src/renderer/components/MapView.tsx`
- Modify: `src/renderer/App.tsx` — integrate MapView

- [ ] **Step 1: Create MapView component**

Create `src/renderer/components/MapView.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import type { Hotspot, Tree } from '@shared/types';

interface Props {
  hotspots: Hotspot[];
  onDiscoverZone: (hotspotId: number) => void;
}

// UNT campus center
const UNT_CENTER: [number, number] = [-97.1525, 33.21];

export default function MapView({ hotspots, onDiscoverZone }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: UNT_CENTER,
      zoom: 15,
      maxZoom: 19,
      minZoom: 13,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-left');

    map.current.on('load', () => setLoaded(true));

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Add hotspot layers when map loads and hotspots change
  useEffect(() => {
    if (!map.current || !loaded || hotspots.length === 0) return;
    const m = map.current;

    // Remove old layers/sources if they exist
    if (m.getLayer('hotspot-circles')) m.removeLayer('hotspot-circles');
    if (m.getLayer('hotspot-labels')) m.removeLayer('hotspot-labels');
    if (m.getSource('hotspots')) m.removeSource('hotspots');

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: hotspots.map((h) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [h.center_lon, h.center_lat] },
        properties: {
          id: h.id,
          name: h.name,
          score: h.squirrel_score,
          discovered: h.discovered,
          radius_m: h.radius_m,
        },
      })),
    };

    m.addSource('hotspots', { type: 'geojson', data: geojson });

    m.addLayer({
      id: 'hotspot-circles',
      type: 'circle',
      source: 'hotspots',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 8, 17, 30],
        'circle-color': [
          'case',
          ['get', 'discovered'],
          '#fdcb6e', // gold for discovered
          '#e94560', // hot pink for undiscovered
        ],
        'circle-opacity': ['case', ['get', 'discovered'], 0.5, 0.3],
        'circle-stroke-color': ['case', ['get', 'discovered'], '#fdcb6e', '#e94560'],
        'circle-stroke-width': 2,
      },
    });

    m.addLayer({
      id: 'hotspot-labels',
      type: 'symbol',
      source: 'hotspots',
      layout: {
        'text-field': ['case', ['get', 'discovered'], ['get', 'name'], '???'],
        'text-size': 11,
        'text-offset': [0, 2],
      },
      paint: {
        'text-color': '#eeeeee',
        'text-halo-color': '#1a1a2e',
        'text-halo-width': 2,
      },
    });

    // Click handler
    m.on('click', 'hotspot-circles', (e) => {
      if (!e.features?.[0]) return;
      const props = e.features[0].properties;
      const hotspot = hotspots.find((h) => h.id === props?.id);
      if (hotspot) setSelectedHotspot(hotspot);
    });

    m.on('mouseenter', 'hotspot-circles', () => {
      if (m.getCanvas()) m.getCanvas().style.cursor = 'pointer';
    });
    m.on('mouseleave', 'hotspot-circles', () => {
      if (m.getCanvas()) m.getCanvas().style.cursor = '';
    });
  }, [loaded, hotspots]);

  // Load trees as small dots
  useEffect(() => {
    if (!map.current || !loaded) return;
    const m = map.current;

    async function loadTrees() {
      const bounds = m.getBounds();
      const trees = await window.api.queryTrees({
        minLat: bounds.getSouth(),
        maxLat: bounds.getNorth(),
        minLon: bounds.getWest(),
        maxLon: bounds.getEast(),
      });

      const NUT_SPECIES = new Set([
        'Live Oak',
        'Post Oak',
        'Red Oak',
        'Bur Oak',
        'Oak',
        'Pecan',
        'Hackberry',
        'Cedar Elm',
        'Sweetgum',
        'Mesquite',
      ]);

      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: trees.map((t: Tree) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [t.lon, t.lat] },
          properties: { isNut: NUT_SPECIES.has(t.species), species: t.species },
        })),
      };

      if (m.getLayer('trees')) m.removeLayer('trees');
      if (m.getSource('trees')) m.removeSource('trees');

      m.addSource('trees', { type: 'geojson', data: geojson });
      m.addLayer({
        id: 'trees',
        type: 'circle',
        source: 'trees',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 1, 17, 4],
          'circle-color': ['case', ['get', 'isNut'], '#e94560', '#fdcb6e'],
          'circle-opacity': 0.6,
        },
      });
    }

    loadTrees();
    m.on('moveend', loadTrees);

    return () => {
      m.off('moveend', loadTrees);
    };
  }, [loaded]);

  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/* Hotspot popup */}
      {selectedHotspot && (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--bg)',
            border: '2px solid var(--accent)',
            borderRadius: 4,
            padding: '12px 20px',
            fontSize: 12,
            minWidth: 250,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <strong style={{ color: 'var(--accent)' }}>
              {selectedHotspot.discovered ? selectedHotspot.name : '??? Unknown Zone'}
            </strong>
            <button
              onClick={() => setSelectedHotspot(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                fontFamily: 'var(--font)',
              }}
            >
              X
            </button>
          </div>
          <div style={{ color: 'var(--gold)', marginBottom: 4 }}>
            {'🌰'.repeat(selectedHotspot.squirrel_score)} ({selectedHotspot.squirrel_score}/5)
          </div>
          <div style={{ color: 'var(--text-dim)', marginBottom: 8 }}>
            {selectedHotspot.tree_count} trees ({selectedHotspot.nut_tree_count} nut trees)
          </div>
          {!selectedHotspot.discovered && (
            <button
              onClick={() => {
                onDiscoverZone(selectedHotspot.id);
                setSelectedHotspot(null);
              }}
              style={{
                background: 'var(--accent)',
                color: 'var(--bg)',
                border: 'none',
                padding: '6px 16px',
                fontFamily: 'var(--font)',
                fontWeight: 'bold',
                fontSize: 11,
                cursor: 'pointer',
                letterSpacing: 1,
                width: '100%',
              }}
            >
              I'M HERE — DISCOVER ZONE
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update App.tsx to use MapView**

Replace the map placeholder in `src/renderer/App.tsx`:

```tsx
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import ToastContainer from './components/Toast';
import { useGameState } from './hooks/useGameState';

export default function App() {
  const game = useGameState();

  async function handleDiscoverZone(hotspotId: number) {
    const events = await window.api.discoverZone(hotspotId);
    game.processEvents(events);
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TopBar player={game.player} badges={game.badges} ollamaOnline={game.ollamaOnline} />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <MapView hotspots={game.hotspots} onDiscoverZone={handleDiscoverZone} />
        <Sidebar
          chatTab={
            <div style={{ padding: 12, color: 'var(--text-dim)', fontSize: 11 }}>
              Chat coming soon...
            </div>
          }
          guideTab={
            <div style={{ padding: 12, color: 'var(--text-dim)', fontSize: 11 }}>
              Field guide coming soon...
            </div>
          }
          badgesTab={
            <div style={{ padding: 12, color: 'var(--text-dim)', fontSize: 11 }}>
              Badges coming soon...
            </div>
          }
        />
      </div>
      <ToastContainer toasts={game.toasts} />
    </div>
  );
}
```

- [ ] **Step 3: Verify map renders with tree dots and hotspot circles**

Run: `npm run dev` (renderer) and in another terminal `npm run build:main && npx electron .`
Expected: Map centered on UNT campus with colored tree dots and pulsing hotspot circles. Clicking a hotspot shows popup with "I'M HERE" button.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: MapLibre GL map with tree markers and hotspot zones"
```

---

## Task 9: Chat Tab (Ollama Integration)

**Files:**

- Create: `src/renderer/components/ChatTab.tsx`
- Create: `src/renderer/hooks/useOllama.ts`
- Modify: `src/renderer/App.tsx` — plug in ChatTab

- [ ] **Step 1: Create useOllama hook**

Create `src/renderer/hooks/useOllama.ts`:

```ts
import { useState, useCallback } from 'react';
import type { OllamaMessage } from '@shared/types';

export function useOllama() {
  const [messages, setMessages] = useState<OllamaMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(
    async (text: string) => {
      const userMsg: OllamaMessage = { role: 'user', content: text };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const result = await window.api.ollamaChat([...messages, userMsg]);
        if (result.ok && result.response) {
          setMessages((prev) => [...prev, { role: 'assistant', content: result.response! }]);
        } else {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: `ERROR: ${result.error || 'Scout is offline'}` },
          ]);
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'ERROR: Could not reach Squirrel Scout' },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages],
  );

  const clearChat = useCallback(() => setMessages([]), []);

  return { messages, loading, sendMessage, clearChat };
}
```

- [ ] **Step 2: Create ChatTab component**

Create `src/renderer/components/ChatTab.tsx`:

```tsx
import { useState, useRef, useEffect } from 'react';
import { useOllama } from '../hooks/useOllama';

interface Props {
  ollamaOnline: boolean;
}

export default function ChatTab({ ollamaOnline }: Props) {
  const { messages, loading, sendMessage } = useOllama();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  function handleSend() {
    if (!input.trim() || loading) return;
    sendMessage(input.trim());
    setInput('');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div ref={scrollRef} style={{ flex: 1, padding: 10, overflow: 'auto', fontSize: 11 }}>
        {messages.length === 0 && (
          <div style={{ color: 'var(--text-dim)', padding: '20px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>&#x1F43F;&#xFE0F;</div>
            <div style={{ color: 'var(--gold)', fontWeight: 'bold', marginBottom: 4 }}>
              SQUIRREL SCOUT
            </div>
            <div>Ask me where to find squirrels!</div>
            {!ollamaOnline && (
              <div style={{ color: '#ff4444', marginTop: 8 }}>
                SCOUT OFFLINE — Start Ollama to enable chat
              </div>
            )}
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <span
              style={{
                color: msg.role === 'user' ? 'var(--accent)' : 'var(--gold)',
                fontWeight: 'bold',
              }}
            >
              {msg.role === 'user' ? 'YOU: ' : '\u{1F43F}\uFE0F SCOUT: '}
            </span>
            <span style={{ color: msg.content.startsWith('ERROR:') ? '#ff4444' : 'var(--text)' }}>
              {msg.content}
            </span>
          </div>
        ))}
        {loading && (
          <div style={{ color: 'var(--gold)', fontStyle: 'italic' }}>Scout is thinking...</div>
        )}
      </div>
      <div style={{ padding: 8, borderTop: '1px solid #333' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={ollamaOnline ? 'Ask the Squirrel Scout...' : 'Scout is offline'}
            disabled={!ollamaOnline || loading}
            style={{
              flex: 1,
              background: 'var(--bg-deep)',
              border: '1px solid var(--accent)',
              borderRadius: 4,
              padding: '6px 10px',
              fontFamily: 'var(--font)',
              fontSize: 11,
              color: 'var(--text)',
              outline: 'none',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!ollamaOnline || loading || !input.trim()}
            style={{
              background: 'var(--accent)',
              color: 'var(--bg)',
              border: 'none',
              padding: '6px 12px',
              fontFamily: 'var(--font)',
              fontWeight: 'bold',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            SEND
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update App.tsx to plug in ChatTab**

In `src/renderer/App.tsx`, import and use ChatTab:

```tsx
import ChatTab from './components/ChatTab';
```

Replace the chatTab placeholder in the Sidebar:

```tsx
chatTab={<ChatTab ollamaOnline={game.ollamaOnline} />}
```

- [ ] **Step 4: Verify chat works with Ollama running**

Start Ollama locally (`ollama serve`), then run the app. Type "Where are squirrels near the library?" — expect a response from the Squirrel Scout character.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Ollama chat tab — Squirrel Scout AI assistant"
```

---

## Task 10: Field Guide Tab (Pokédex)

**Files:**

- Create: `src/renderer/components/FieldGuideTab.tsx`
- Modify: `src/renderer/App.tsx` — plug in FieldGuideTab

- [ ] **Step 1: Create FieldGuideTab component**

Create `src/renderer/components/FieldGuideTab.tsx`:

```tsx
import type { Hotspot } from '@shared/types';

interface Props {
  hotspots: Hotspot[];
  onSelectHotspot: (hotspot: Hotspot) => void;
}

export default function FieldGuideTab({ hotspots, onSelectHotspot }: Props) {
  return (
    <div style={{ padding: 8 }}>
      <div
        style={{
          color: 'var(--gold)',
          fontWeight: 'bold',
          fontSize: 12,
          marginBottom: 8,
          letterSpacing: 1,
        }}
      >
        FIELD GUIDE — {hotspots.filter((h) => h.discovered).length}/{hotspots.length} DISCOVERED
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {hotspots.map((h, i) => (
          <button
            key={h.id}
            onClick={() => onSelectHotspot(h)}
            style={{
              background: h.discovered ? 'var(--bg-deep)' : '#111',
              border: `1px solid ${h.discovered ? 'var(--gold)' : '#333'}`,
              borderRadius: 4,
              padding: 8,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'var(--font)',
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: h.discovered ? 'var(--gold)' : 'var(--text-dim)',
                fontWeight: 'bold',
                marginBottom: 4,
              }}
            >
              #{String(i + 1).padStart(2, '0')}
            </div>
            <div
              style={{
                fontSize: 11,
                color: h.discovered ? 'var(--text)' : 'var(--text-dim)',
                fontWeight: 'bold',
                marginBottom: 4,
              }}
            >
              {h.discovered ? h.name : '???'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--gold)' }}>
              {h.discovered ? '🌰'.repeat(h.squirrel_score) : '⬛'.repeat(5)}
            </div>
            {h.discovered && (
              <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 4 }}>
                {h.tree_count} trees
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update App.tsx**

Import and plug in:

```tsx
import FieldGuideTab from './components/FieldGuideTab';
```

Replace guide placeholder:

```tsx
guideTab={<FieldGuideTab hotspots={game.hotspots} onSelectHotspot={(h) => {/* TODO: pan map to hotspot */}} />}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: Pokédex-style field guide tab"
```

---

## Task 11: Badges Tab

**Files:**

- Create: `src/renderer/components/BadgesTab.tsx`
- Modify: `src/renderer/App.tsx` — plug in BadgesTab

- [ ] **Step 1: Create BadgesTab component**

Create `src/renderer/components/BadgesTab.tsx`:

```tsx
import type { Badge } from '@shared/types';

interface Props {
  badges: Badge[];
}

export default function BadgesTab({ badges }: Props) {
  const earned = badges.filter((b) => b.earned).length;
  return (
    <div style={{ padding: 8 }}>
      <div
        style={{
          color: 'var(--gold)',
          fontWeight: 'bold',
          fontSize: 12,
          marginBottom: 8,
          letterSpacing: 1,
        }}
      >
        BADGES — {earned}/{badges.length}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {badges.map((badge) => (
          <div
            key={badge.id}
            title={badge.earned ? `${badge.name}: ${badge.description}` : '???'}
            style={{
              background: badge.earned ? 'var(--bg-deep)' : '#111',
              border: `1px solid ${badge.earned ? 'var(--purple)' : '#222'}`,
              borderRadius: 4,
              padding: 8,
              textAlign: 'center',
              opacity: badge.earned ? 1 : 0.4,
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 4 }}>{badge.earned ? badge.icon : '?'}</div>
            <div
              style={{
                fontSize: 8,
                color: badge.earned ? 'var(--text)' : 'var(--text-dim)',
                fontWeight: 'bold',
                lineHeight: 1.2,
              }}
            >
              {badge.earned ? badge.name : '???'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update App.tsx**

Import and plug in:

```tsx
import BadgesTab from './components/BadgesTab';
```

Replace badges placeholder:

```tsx
badgesTab={<BadgesTab badges={game.badges} />}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: badge grid tab with earned/locked states"
```

---

## Task 12: Quest Overlay

**Files:**

- Create: `src/renderer/components/QuestOverlay.tsx`
- Modify: `src/renderer/App.tsx` — integrate quest overlay

- [ ] **Step 1: Create QuestOverlay component**

Create `src/renderer/components/QuestOverlay.tsx`:

```tsx
import { useState } from 'react';
import type { Quest } from '@shared/types';

interface Props {
  quests: Quest[];
  onGenerateQuest: () => void;
  loading: boolean;
}

export default function QuestOverlay({ quests, onGenerateQuest, loading }: Props) {
  const activeQuest = quests.find((q) => q.status === 'active');

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 12,
        left: 12,
        background: 'rgba(26, 26, 46, 0.92)',
        border: '1px solid var(--accent)',
        borderRadius: 4,
        padding: '8px 14px',
        fontSize: 11,
        maxWidth: 350,
        zIndex: 5,
      }}
    >
      {activeQuest ? (
        <div>
          <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>&#x1F3AF; QUEST: </span>
          <span style={{ color: 'var(--text)' }}>{activeQuest.quest_text}</span>
        </div>
      ) : (
        <button
          onClick={onGenerateQuest}
          disabled={loading}
          style={{
            background: 'none',
            border: '1px solid var(--gold)',
            color: 'var(--gold)',
            padding: '4px 12px',
            fontFamily: 'var(--font)',
            fontSize: 11,
            cursor: loading ? 'wait' : 'pointer',
            fontWeight: 'bold',
            letterSpacing: 1,
          }}
        >
          {loading ? 'GENERATING...' : '&#x1F3AF; GET NEW QUEST'}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update App.tsx to include quest overlay in map area**

Add import:

```tsx
import QuestOverlay from './components/QuestOverlay';
```

Add state and handler:

```tsx
const [questLoading, setQuestLoading] = useState(false);

async function handleGenerateQuest() {
  setQuestLoading(true);
  await window.api.ollamaGenerateQuest();
  await game.refresh();
  setQuestLoading(false);
}
```

Wrap MapView in a relative container and add QuestOverlay:

```tsx
<div style={{ flex: 1, position: 'relative' }}>
  <MapView hotspots={game.hotspots} onDiscoverZone={handleDiscoverZone} />
  <QuestOverlay quests={game.quests} onGenerateQuest={handleGenerateQuest} loading={questLoading} />
</div>
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: quest overlay with AI-generated missions"
```

---

## Task 13: Sighting Log Modal

**Files:**

- Create: `src/renderer/components/SightingModal.tsx`
- Modify: `src/renderer/App.tsx` — add sighting trigger

- [ ] **Step 1: Create SightingModal component**

Create `src/renderer/components/SightingModal.tsx`:

```tsx
import { useState } from 'react';
import type { Hotspot } from '@shared/types';

interface Props {
  hotspots: Hotspot[];
  onSubmit: (sighting: {
    hotspot_id: number | null;
    lat: number;
    lon: number;
    photo_path: string | null;
    notes: string;
  }) => void;
  onClose: () => void;
}

export default function SightingModal({ hotspots, onSubmit, onClose }: Props) {
  const [notes, setNotes] = useState('');
  const [selectedHotspot, setSelectedHotspot] = useState<number | null>(null);
  const discovered = hotspots.filter((h) => h.discovered);

  function handleSubmit() {
    const hotspot = hotspots.find((h) => h.id === selectedHotspot);
    onSubmit({
      hotspot_id: selectedHotspot,
      lat: hotspot?.center_lat ?? 33.21,
      lon: hotspot?.center_lon ?? -97.15,
      photo_path: null,
      notes,
    });
    onClose();
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: 'var(--bg)',
          border: '2px solid var(--accent)',
          borderRadius: 4,
          padding: 24,
          width: 360,
          fontFamily: 'var(--font)',
        }}
      >
        <h3 style={{ color: 'var(--accent)', marginBottom: 16, letterSpacing: 2, fontSize: 14 }}>
          LOG SQUIRREL SIGHTING
        </h3>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--gold)', marginBottom: 4, fontWeight: 'bold' }}>
            LOCATION
          </div>
          <select
            value={selectedHotspot ?? ''}
            onChange={(e) => setSelectedHotspot(e.target.value ? Number(e.target.value) : null)}
            style={{
              width: '100%',
              background: 'var(--bg-deep)',
              border: '1px solid var(--accent)',
              color: 'var(--text)',
              padding: '6px 8px',
              fontFamily: 'var(--font)',
              fontSize: 11,
            }}
          >
            <option value="">Select a zone...</option>
            {discovered.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'block', marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: 'var(--gold)', marginBottom: 4, fontWeight: 'bold' }}>
            NOTES
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Describe what you saw..."
            style={{
              width: '100%',
              background: 'var(--bg-deep)',
              border: '1px solid var(--accent)',
              color: 'var(--text)',
              padding: '6px 8px',
              fontFamily: 'var(--font)',
              fontSize: 11,
              resize: 'vertical',
            }}
          />
        </label>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleSubmit}
            disabled={!notes.trim()}
            style={{
              flex: 1,
              background: 'var(--accent)',
              color: 'var(--bg)',
              border: 'none',
              padding: '8px 16px',
              fontFamily: 'var(--font)',
              fontWeight: 'bold',
              fontSize: 12,
              cursor: 'pointer',
              letterSpacing: 1,
            }}
          >
            LOG SIGHTING (+50 PTS)
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid var(--text-dim)',
              color: 'var(--text-dim)',
              padding: '8px 16px',
              fontFamily: 'var(--font)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add sighting button and modal to App.tsx**

Add import:

```tsx
import SightingModal from './components/SightingModal';
```

Add state:

```tsx
const [showSightingModal, setShowSightingModal] = useState(false);

async function handleLogSighting(sighting: any) {
  const events = await window.api.logSighting(sighting);
  game.processEvents(events);
}
```

Add a floating "LOG SIGHTING" button in the map area and the modal:

```tsx
{
  /* Floating sighting button */
}
<button
  onClick={() => setShowSightingModal(true)}
  style={{
    position: 'absolute',
    bottom: 12,
    right: 12,
    background: 'var(--accent)',
    color: 'var(--bg)',
    border: 'none',
    padding: '8px 16px',
    fontFamily: 'var(--font)',
    fontWeight: 'bold',
    fontSize: 11,
    cursor: 'pointer',
    letterSpacing: 1,
    zIndex: 5,
  }}
>
  &#x1F43F;&#xFE0F; LOG SIGHTING
</button>;

{
  showSightingModal && (
    <SightingModal
      hotspots={game.hotspots}
      onSubmit={handleLogSighting}
      onClose={() => setShowSightingModal(false)}
    />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: sighting log modal with zone selection"
```

---

## Task 14: Final App.tsx Integration + Polish

**Files:**

- Modify: `src/renderer/App.tsx` — final wiring with all components
- Modify: `src/renderer/global.css` — any final style tweaks

- [ ] **Step 1: Write final complete App.tsx**

Replace `src/renderer/App.tsx` with the fully integrated version combining all previous pieces:

```tsx
import { useState } from 'react';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import ChatTab from './components/ChatTab';
import FieldGuideTab from './components/FieldGuideTab';
import BadgesTab from './components/BadgesTab';
import QuestOverlay from './components/QuestOverlay';
import SightingModal from './components/SightingModal';
import ToastContainer from './components/Toast';
import { useGameState } from './hooks/useGameState';

export default function App() {
  const game = useGameState();
  const [showSightingModal, setShowSightingModal] = useState(false);
  const [questLoading, setQuestLoading] = useState(false);

  async function handleDiscoverZone(hotspotId: number) {
    const events = await window.api.discoverZone(hotspotId);
    game.processEvents(events);
  }

  async function handleLogSighting(sighting: any) {
    const events = await window.api.logSighting(sighting);
    game.processEvents(events);
  }

  async function handleGenerateQuest() {
    setQuestLoading(true);
    await window.api.ollamaGenerateQuest();
    await game.refresh();
    setQuestLoading(false);
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TopBar player={game.player} badges={game.badges} ollamaOnline={game.ollamaOnline} />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <MapView hotspots={game.hotspots} onDiscoverZone={handleDiscoverZone} />
          <QuestOverlay
            quests={game.quests}
            onGenerateQuest={handleGenerateQuest}
            loading={questLoading}
          />
          <button
            onClick={() => setShowSightingModal(true)}
            style={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              background: 'var(--accent)',
              color: 'var(--bg)',
              border: 'none',
              padding: '8px 16px',
              fontFamily: 'var(--font)',
              fontWeight: 'bold',
              fontSize: 11,
              cursor: 'pointer',
              letterSpacing: 1,
              zIndex: 5,
            }}
          >
            &#x1F43F;&#xFE0F; LOG SIGHTING
          </button>
        </div>
        <Sidebar
          chatTab={<ChatTab ollamaOnline={game.ollamaOnline} />}
          guideTab={<FieldGuideTab hotspots={game.hotspots} onSelectHotspot={() => {}} />}
          badgesTab={<BadgesTab badges={game.badges} />}
        />
      </div>
      <ToastContainer toasts={game.toasts} />
      {showSightingModal && (
        <SightingModal
          hotspots={game.hotspots}
          onSubmit={handleLogSighting}
          onClose={() => setShowSightingModal(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 3: Build and run in Electron**

Run:

```bash
npm run build:db
npm run build
npm run build:main
npx electron .
```

Expected: Full app with map, hotspots, chat, field guide, badges, quest overlay, sighting modal, toast notifications all working.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: fully integrated UNT Fluffy Squirrel Safari app"
```

---

## Task 15: Electron Packaging

**Files:**

- Modify: `package.json` — verify package script
- Create: `resources/icon.png` (placeholder)

- [ ] **Step 1: Create placeholder icon**

Create a simple 256x256 icon (can be replaced later):

```bash
# Use a placeholder — generate a simple PNG or copy one in
mkdir -p resources
```

For now the app will use the default Electron icon.

- [ ] **Step 2: Build the distributable**

Run:

```bash
npm run package
```

Expected: `release/` directory contains a Windows installer (.exe).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: electron-builder packaging configuration"
```
