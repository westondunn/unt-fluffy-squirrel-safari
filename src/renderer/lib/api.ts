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

declare global {
  interface Window {
    api: {
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
    };
  }
}

export const api = window.api;
