# Squirrel Safari — User Guide

Welcome to Squirrel Safari! This guide will help you find those funny little fluffy squirrels on the UNT campus.

---

## Getting Started

When you first launch the app, you'll see:

1. **The Map** — centered on UNT campus with thousands of tree dots
2. **The HUD** — black bar at top showing your Score, World (level), Badges, and Scout status
3. **The Sidebar** — three tabs on the right: Chat, Guide, and Badges
4. **Quest Panel** — bottom-left of the map with your current mission

### Your First Move

Click any **pink circle** on the map — these are undiscovered squirrel hotspot zones. A popup will appear with a big **"I'M HERE — DISCOVER ZONE"** button. Click it to claim your first discovery!

You'll earn:
- +100 points
- The "First Steps" badge
- The zone revealed in your Field Guide

---

## Understanding the Map

### Tree Dots
Every dot on the map is a real tree from the UNT campus inventory.

- **Red dots** = Nut-producing trees (oaks, pecans, hackberries, cedar elms, sweetgums, mesquite). These are squirrel magnets — squirrels love nuts!
- **Green dots** = Other tree species (crapemyrtle, pine, magnolia, etc.)
- **Gold stars** = Memorial or dedicated trees

### Hotspot Circles
These mark clusters of nut-producing trees where squirrels are most likely to hang out.

- **Pink circles** = Undiscovered zones (labeled "???")
- **Gold circles** = Zones you've already discovered

### Clicking Trees
Click on any individual tree dot to see its details:
- Species name
- Whether it's a nut tree (squirrel food!)
- Elevation
- Memorial status
- GPS coordinates

---

## The Sidebar

### Chat Tab
Talk to the **Squirrel Scout** — an AI assistant that knows every tree on campus! Try asking:

- "Where are squirrels near the library?"
- "What's the best spot for squirrel watching?"
- "Tell me about pecan trees on campus"
- "Where should I go for my next discovery?"

**Note:** Requires Ollama running locally. The green dot next to "SCOUT" in the top bar shows connection status.

### Guide Tab
Your **Pokédex-style Field Guide** showing all 16 discovery zones:

- **Locked entries** show "??? UNKNOWN ZONE" with a lock icon
- **Discovered entries** show the zone name, acorn rating, and tree counts
- **Click any entry** to fly the map to that location

### Badges Tab
View your **24 achievement badges** in a grid:

- **Lit up badges** = earned (with icon and name visible)
- **Dark squares** = not yet earned (shown as "???")

---

## Scoring

| Action | Points |
|--------|--------|
| Discover a zone | +100 |
| Log a sighting | +50 |
| Earn a badge | +200 |
| Complete a quest | +300 |

### Levels
You level up every **500 points**. Your level shows as "WORLD" in the HUD — just like Super Mario Bros 3!

---

## Quests

The **Squirrel Scout AI** generates unique quests for you. Look at the gold panel in the bottom-left of the map.

- **COMPLETE** — Mark the quest as done (+300 points)
- **SKIP** — Get a different quest
- **GET NEW QUEST** — Appears when no quest is active

Quests guide you to unexplored parts of campus and challenge you to find specific tree clusters.

---

## Tips for Finding Squirrels

1. **Follow the red dots** — Clusters of red (nut-producing) trees are squirrel territory
2. **Look for large hotspots** — Bigger pink circles = more trees = more squirrels
3. **Pecans and oaks are gold** — Fox squirrels especially love these
4. **Morning and late afternoon** — Squirrels are most active during these times
5. **Check near buildings** — Trees near buildings often have squirrels that are used to people
6. **Listen for chatter** — Squirrels are noisy! If you hear chattering, look up
7. **Bring nuts** — Unsalted peanuts in the shell are a classic squirrel snack

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `+` / `-` | Zoom in/out on the map |
| Click + drag | Pan the map |
| Scroll wheel | Zoom in/out |

---

## Troubleshooting

### "SCOUT OFFLINE" in the top bar
The AI chat requires Ollama. Install it from [ollama.ai](https://ollama.ai), then run:
```
ollama serve
ollama pull llama3.2
```

### Map tiles not loading
The app needs an internet connection for map tiles (CartoDB Voyager). Check your connection.

### Score not updating
Try clicking a different tab and back, or close and reopen the app. Game state saves to disk automatically.

---

## About the Data

This app uses the official **UNT Campus Tree Inventory** containing 5,018 surveyed trees with:
- GPS coordinates (converted from NAD 1983 State Plane Texas)
- Species identification (60+ species including Live Oak, Post Oak, Pecan, Hackberry, and more)
- Elevation data
- Memorial/dedication status

The 16 squirrel hotspot zones are computed algorithmically by clustering nut-producing trees within 50 meters of each other and scoring them based on tree density, nut-tree ratio, and species diversity.

---

*Happy squirrel hunting, Mean Green!* 🐿️
