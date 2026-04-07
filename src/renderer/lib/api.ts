import type {
  Tree,
  Hotspot,
  Sighting,
  Badge,
  Quest,
  Player,
  OllamaMessage,
  BoundingBox,
} from '../../shared/types';

// GameEvent mirrors the type in src/main/game-engine.ts
export type GameEvent =
  | { type: 'score'; payload: { points: number; total: number } }
  | { type: 'level_up'; payload: { level: number } }
  | { type: 'badge_earned'; payload: { badgeId: number; badgeName: string } }
  | { type: 'zone_discovered'; payload: { hotspotId: number; hotspotName: string } };

export interface OllamaChatResult {
  ok: boolean;
  response?: string;
  error?: string;
}

export interface OllamaStatusResult {
  online: boolean;
  url: string;
}

export interface OllamaQuestResult {
  ok: boolean;
  questText?: string;
  error?: string;
}

export interface RendererApi {
  // DB
  queryTrees: (bounds: BoundingBox) => Promise<Tree[]>;
  queryHotspots: (lat: number, lon: number, radiusKm: number) => Promise<Hotspot[]>;
  getAllHotspots: () => Promise<Hotspot[]>;
  getSetting: (key: string) => Promise<string | undefined>;
  setSetting: (key: string, value: string) => Promise<void>;

  // Ollama
  ollamaChat: (messages: OllamaMessage[]) => Promise<OllamaChatResult>;
  ollamaStatus: () => Promise<OllamaStatusResult>;
  ollamaGenerateQuest: () => Promise<OllamaQuestResult>;

  // Game
  discoverZone: (hotspotId: number) => Promise<GameEvent[]>;
  logSighting: (sighting: Omit<Sighting, 'id'>) => Promise<GameEvent[]>;
  getBadges: () => Promise<Badge[]>;
  getPlayer: () => Promise<Player>;
  getQuests: () => Promise<Quest[]>;
  getSightings: (hotspotId?: number) => Promise<Sighting[]>;
  completeQuest: (questId: number) => Promise<GameEvent[]>;
}

declare global {
  interface Window {
    api?: RendererApi;
  }
}

const MISSING_API_MESSAGE =
  'Electron API bridge is unavailable. Start with `npm run electron:dev` for full game features.';

const browserSettings = new Map<string, string>();
let warnedMissingApi = false;

function warnMissingApi() {
  if (!warnedMissingApi) {
    console.warn(MISSING_API_MESSAGE);
    warnedMissingApi = true;
  }
}

const fallbackPlayer: Player = {
  id: 0,
  name: 'Explorer',
  level: 1,
  xp: 0,
  score: 0,
  streak: 0,
  last_seen: null,
};

const fallbackApi: RendererApi = {
  queryTrees: async () => {
    warnMissingApi();
    return [];
  },
  queryHotspots: async () => {
    warnMissingApi();
    return [];
  },
  getAllHotspots: async () => {
    warnMissingApi();
    return [];
  },
  getSetting: async key => {
    warnMissingApi();
    return browserSettings.get(key);
  },
  setSetting: async (key, value) => {
    warnMissingApi();
    browserSettings.set(key, value);
  },
  ollamaChat: async () => {
    warnMissingApi();
    return { ok: false, error: MISSING_API_MESSAGE };
  },
  ollamaStatus: async () => {
    warnMissingApi();
    return { online: false, url: '' };
  },
  ollamaGenerateQuest: async () => {
    warnMissingApi();
    return { ok: false, error: MISSING_API_MESSAGE };
  },
  discoverZone: async () => {
    warnMissingApi();
    return [];
  },
  logSighting: async () => {
    warnMissingApi();
    return [];
  },
  getBadges: async () => {
    warnMissingApi();
    return [];
  },
  getPlayer: async () => {
    warnMissingApi();
    return { ...fallbackPlayer };
  },
  getQuests: async () => {
    warnMissingApi();
    return [];
  },
  getSightings: async () => {
    warnMissingApi();
    return [];
  },
  completeQuest: async () => {
    warnMissingApi();
    return [];
  },
};

const nativeApi = typeof window !== 'undefined' ? window.api : undefined;

export const isElectronApiAvailable = Boolean(nativeApi);
export const api: RendererApi = nativeApi ?? fallbackApi;
export const missingApiMessage = MISSING_API_MESSAGE;
