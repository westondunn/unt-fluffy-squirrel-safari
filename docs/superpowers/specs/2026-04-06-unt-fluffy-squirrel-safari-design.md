# UNT Fluffy Squirrel Safari — Design Spec

## Overview

An interactive Electron desktop app that helps UNT students find squirrels on campus by visualizing 5,053 mapped trees, scoring squirrel hotspots based on tree species and density, and providing an AI-powered "Squirrel Scout" assistant via Ollama. The app uses a retro arcade game aesthetic with gamification mechanics including discovery zones, a Pokédex-style field guide, achievement badges, and AI-generated quests.

## Target Platform

- Windows (primary), with Electron enabling future macOS/Linux support
- Requires Ollama installed locally (with configurable remote fallback)

## Data Layer

### Source Data

- UNT campus tree dataset: 5,053 trees from CSV (`Tree_-6539065284196097948.csv`)
- Fields: FID, Northing, Easting, Elevation, UNT_ID, NAME_COMN (species), MEMORIAL, GlobalID, x (longitude), y (latitude)
- Species distribution: 3,413 Unknown, 263 Live Oak, 256 Post Oak, 198 Hackberry, 165 Oak, 165 Crapemyrtle, 74 Cedar Elm, 71 Pecan, 70 Red Oak, and more

### Database Schema (SQLite — `squirrels.db`)

**trees**
- id INTEGER PRIMARY KEY
- unt_id INTEGER
- lat REAL (from y column)
- lon REAL (from x column)
- elevation REAL
- species TEXT (from NAME_COMN)
- memorial BOOLEAN
- global_id TEXT

**hotspots**
- id INTEGER PRIMARY KEY
- name TEXT (auto-generated from location + dominant species)
- center_lat REAL
- center_lon REAL
- radius_m REAL
- tree_count INTEGER
- nut_tree_count INTEGER
- squirrel_score INTEGER (1-5, based on density + species mix)
- discovered BOOLEAN DEFAULT FALSE

**sightings**
- id INTEGER PRIMARY KEY
- hotspot_id INTEGER (nullable FK)
- lat REAL
- lon REAL
- photo_path TEXT (nullable)
- notes TEXT
- timestamp DATETIME DEFAULT CURRENT_TIMESTAMP

**badges**
- id INTEGER PRIMARY KEY
- name TEXT
- description TEXT
- icon TEXT (emoji or pixel-art reference)
- criteria_type TEXT (e.g., 'discover_count', 'sighting_count', 'time_based', 'chat_count')
- criteria_value INTEGER
- earned BOOLEAN DEFAULT FALSE
- earned_at DATETIME

**quest_log**
- id INTEGER PRIMARY KEY
- quest_text TEXT
- target_hotspot_id INTEGER (nullable FK)
- status TEXT ('active', 'completed', 'expired')
- generated_at DATETIME
- completed_at DATETIME

**player**
- id INTEGER PRIMARY KEY DEFAULT 1
- score INTEGER DEFAULT 0
- level INTEGER DEFAULT 1
- total_discoveries INTEGER DEFAULT 0
- total_sightings INTEGER DEFAULT 0
- total_quests_completed INTEGER DEFAULT 0

**settings**
- key TEXT PRIMARY KEY
- value TEXT

### Hotspot Computation

Pre-computed at build time via a data pipeline script:

1. Filter trees to "squirrel-attractive" species: oaks (Live Oak, Post Oak, Red Oak, Bur Oak, Oak), pecans, hackberries, cedar elms, sweetgums, mesquite
2. Cluster nearby nut/food trees using simple distance-based grouping (trees within 50m of each other form a cluster)
3. Score each cluster 1-5 based on: tree count (more = better), nut-tree ratio (higher = better), species diversity (more species = better)
4. Generate ~20-30 discovery zones from top-scoring clusters
5. Auto-name zones based on approximate campus location + dominant species

### Spatial Queries

Simple bounding-box math on lat/lon columns. No SpatiaLite needed for 5K points. Index on (lat, lon) for range queries.

## Map & UI Layer

### Map Rendering

- **MapLibre GL JS** with free vector tiles (MapTiler free tier or Protomaps)
- Centered on UNT campus (approx. 33.2100, -97.1525)
- Tree markers: small colored dots — red/hot for nut-producing species, yellow/cool for others
- Hotspot zones: pulsing translucent circles over high-score clusters
- Discovery zones: foggy/locked overlay when undiscovered, reveal with pixel-art animation on discovery
- Quest target: highlighted zone with arcade-style pulsing indicator

### Visual Design — Retro Arcade Theme

- **Background:** Dark navy (#1a1a2e)
- **Primary accent:** Hot pink (#e94560)
- **Secondary accent:** Gold (#fdcb6e)
- **Tertiary:** Deep blue (#16213e), Dark blue (#0f3460), Purple (#533483)
- **Font:** Courier New / monospace throughout
- **Style:** Chunky borders, pixel-art icons, 8-bit badge graphics, arcade-style animations
- **Toasts:** "LEVEL UP!", "BADGE EARNED!", "ZONE DISCOVERED!" with retro animation

### App Layout

```
┌─────────────────────────────────────────────────────────┐
│ [UNT FLUFFY SQUIRREL SAFARI]          SCORE: 2,450  LV.5  [8/24]  │  ← Top bar (hot pink)
├────────────────────────────────────┬────────────────────┤
│                                    │ [CHAT|GUIDE|BADGES]│  ← Tab bar
│                                    │                    │
│            MAP VIEW                │   Sidebar content  │
│         (MapLibre GL)              │   (active tab)     │
│                                    │                    │
│  [QUEST: Find the pecan grove...]  │                    │  ← Quest overlay
└────────────────────────────────────┴────────────────────┘
```

- **Top bar:** App title, score, level, badge progress
- **Map area:** ~70% width, full height below top bar
- **Sidebar:** ~30% width, three tabs
- **Quest overlay:** Pinned bottom-left of map

### Sidebar Tabs

1. **Chat** — Ollama "Squirrel Scout" conversation. Input at bottom, messages scroll up.
2. **Field Guide** — Pokédex-style grid of discovery zones. Each card shows zone name, species, squirrel rating (1-5 acorns), sighting count, best photo. Locked zones show silhouettes with "???"
3. **Badges** — 4x6 grid of 24 achievement badges. Earned badges are colorful, unearned are greyed silhouettes.

## Ollama Integration — "Squirrel Scout"

### Character

Retro game NPC personality. Helpful, enthusiastic, short punchy sentences. Occasional arcade-game flair ("ACHIEVEMENT UNLOCKED: Great question!"). Named "Squirrel Scout."

### System Prompt

Loaded with:
- Full tree dataset summary (species counts, notable clusters)
- Hotspot data (locations, scores, species composition)
- UNT campus landmark context (building names, common areas)
- Player progress (discovered zones, badges, level)

### Capabilities

- Answer location-based questions ("where are squirrels near the library?") by querying nearby hotspots
- Generate quests based on undiscovered zones and player progress
- Provide fun facts about tree species and squirrel behavior
- React to sighting logs with contextual commentary
- Suggest optimal routes for discovering multiple zones

### Connection Strategy

1. Check `localhost:11434` (default Ollama port) on startup
2. If unavailable, check user-configured remote URL from settings
3. If neither available, show status indicator "SCOUT OFFLINE" and disable chat tab
4. Model configurable in settings (default: `llama3.2`)

### Context Injection

Before each chat message, inject:
- Trees within the current map viewport as structured data
- Nearest hotspots with scores and species
- Player's current progress summary
- Active quest details

## Gamification Engine

### Discovery Zones (~20-30)

- Pre-computed from hotspot clustering algorithm
- Map overlay: foggy/locked initially, revealed on discovery
- Discovery trigger: "I'm here" button (manual) or geolocation proximity detection (if enabled)
- Discovery animation: pixel-art fog-lift effect, zone name reveal, score popup
- Points: 100 per discovery

### Field Guide (Pokédex)

- One entry per discovery zone
- Locked: silhouette card, "???" name, zone number only
- Unlocked: zone name, tree species list, squirrel score (1-5 acorns), total sightings, thumbnail of best photo
- Tapping an entry centers the map on that zone

### Sighting Log

- Log a sighting: upload/capture photo (optional), add text notes, auto-tag current location
- Each sighting stored in SQLite with timestamp and coordinates
- Points: 50 per sighting
- Sightings appear in the field guide entry for the nearest zone

### Badges (24 total)

| Badge | Criteria |
|-------|----------|
| Nut Detective | Visit 5 pecan/oak clusters |
| Oak Explorer | Discover all oak-heavy zones |
| Early Bird | Log a sighting before 8am |
| Shutterburg | Log 10 sightings with photos |
| Campus Mapper | Discover 50% of all zones |
| Squirrel Whisperer | Ask Scout 25 questions |
| Full Safari | Discover all zones |
| First Steps | Discover your first zone |
| Sharp Eye | Log your first sighting |
| Pecan Pro | Visit all pecan clusters |
| Night Owl | Log a sighting after 9pm |
| Questmaster | Complete 10 quests |
| Social Squirrel | Log 25 sightings |
| Tree Hugger | Discover 10 zones |
| Speed Runner | Discover 5 zones in one day |
| Dedicated Explorer | Use the app 7 days in a row |
| Photo Album | Log 25 sightings with photos |
| Scout's Friend | Ask Scout 50 questions |
| Completionist | Earn all other badges |
| Elevation Expert | Visit zones at 5 different elevations |
| Memorial Hunter | Discover a zone with memorial trees |
| Diversity Spotter | Visit zones with 5+ different species |
| Century Club | Reach 10,000 points |
| Legend | Reach level 20 |

### Scoring & Levels

- Discover zone: 100 pts
- Log sighting: 50 pts
- Earn badge: 200 pts
- Complete quest: 300 pts
- Level up every 500 pts
- "LEVEL UP!" retro toast animation on threshold

### AI Quests

- Ollama generates quests based on player state
- Quest types: "discover zone X", "find N squirrels near Y", "explore the Z area"
- One active quest at a time, with option to skip/refresh
- Expired after 7 days if not completed
- Points: 300 per completion

## Electron Shell & Packaging

### Tech Stack

- **Electron** (latest stable) + **electron-builder** for packaging
- **React 18** for UI components
- **Vite** for renderer bundling
- **MapLibre GL JS** for map rendering
- **better-sqlite3** for native SQLite access in main process
- **Node fetch** for Ollama HTTP API

### Build-Time Data Pipeline

1. Parse CSV into structured tree data
2. Run hotspot clustering algorithm
3. Generate zone names
4. Seed badge definitions
5. Output `squirrels.db` bundled with app

### IPC Channels

- `db:query-trees` — Fetch trees in bounding box
- `db:query-hotspots` — Fetch hotspots near coordinates
- `ollama:chat` — Send message, receive streamed response
- `ollama:status` — Check connection health
- `ollama:generate-quest` — Request new quest
- `game:log-sighting` — Record a squirrel sighting
- `game:discover-zone` — Mark zone as discovered
- `game:get-badges` — Fetch badge state
- `game:get-player` — Fetch player stats
- `game:get-quests` — Fetch quest log

### Settings (stored in SQLite)

- `ollama_url` — Remote Ollama URL override
- `ollama_model` — Preferred model name
- `map_tile_source` — Vector tile URL
- `geolocation_enabled` — Boolean, default false
- `theme` — Future: light/dark mode toggle

### Offline Support

- Map tiles cached on first load
- Tree data and game state fully local in SQLite
- Only Ollama requires connectivity (local or remote)
- App fully functional without Ollama (chat tab shows "SCOUT OFFLINE")
