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
