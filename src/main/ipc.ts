import { ipcMain } from 'electron';
import * as db from './db';
import * as ollama from './ollama';
import * as gameEngine from './game-engine';

export function registerIPC(): void {
  // ── DB: trees ────────────────────────────────────────────────────────────────
  ipcMain.handle('db:query-trees', (_event, bounds) => {
    return db.queryTrees(bounds);
  });

  // ── DB: hotspots ──────────────────────────────────────────────────────────────
  ipcMain.handle('db:query-hotspots', (_event, lat, lon, radiusKm) => {
    return db.queryHotspots(lat, lon, radiusKm);
  });

  ipcMain.handle('db:all-hotspots', () => {
    return db.getAllHotspots();
  });

  // ── DB: settings ──────────────────────────────────────────────────────────────
  ipcMain.handle('db:get-setting', (_event, key: string) => {
    return db.getSetting(key);
  });

  ipcMain.handle('db:set-setting', (_event, key: string, value: string) => {
    db.setSetting(key, value);
  });

  // ── Ollama ────────────────────────────────────────────────────────────────────
  ipcMain.handle('ollama:chat', async (_event, messages) => {
    try {
      const response = await ollama.chat(messages);
      return { ok: true, response };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { ok: false, error };
    }
  });

  ipcMain.handle('ollama:status', async () => {
    return ollama.checkOllamaStatus();
  });

  ipcMain.handle('ollama:generate-quest', async () => {
    try {
      const questText = await ollama.generateQuest();
      return { ok: true, questText };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { ok: false, error };
    }
  });

  // ── Game: discover zone ───────────────────────────────────────────────────────
  ipcMain.handle('game:discover-zone', (_event, hotspotId: number) => {
    return gameEngine.handleDiscoverZone(hotspotId);
  });

  // ── Game: sightings ───────────────────────────────────────────────────────────
  ipcMain.handle('game:log-sighting', (_event, sighting) => {
    return gameEngine.handleLogSighting(sighting);
  });

  ipcMain.handle('game:get-sightings', (_event, hotspotId?: number) => {
    return db.getSightings(hotspotId);
  });

  // ── Game: badges ──────────────────────────────────────────────────────────────
  ipcMain.handle('game:get-badges', () => {
    return db.getBadges();
  });

  // ── Game: player ──────────────────────────────────────────────────────────────
  ipcMain.handle('game:get-player', () => {
    return db.getPlayer();
  });

  // ── Game: quests ──────────────────────────────────────────────────────────────
  ipcMain.handle('game:get-quests', () => {
    return db.getQuests();
  });

  ipcMain.handle('game:complete-quest', (_event, questId: number) => {
    return gameEngine.handleCompleteQuest(questId);
  });
}
