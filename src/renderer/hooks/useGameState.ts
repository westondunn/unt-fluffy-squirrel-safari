import { useState, useEffect, useCallback } from 'react';
import { api, type GameEvent } from '../lib/api';
import type { Player, Badge, Hotspot, Quest } from '@shared/types';

export interface Toast {
  id: number;
  text: string;
  type: 'score' | 'level-up' | 'badge' | 'discovery';
}

interface GameState {
  player: Player | null;
  badges: Badge[];
  hotspots: Hotspot[];
  quests: Quest[];
  ollamaOnline: boolean;
  toasts: Toast[];
  refresh: () => Promise<void>;
  processEvents: (events: GameEvent[]) => Promise<void>;
  removeToast: (id: number) => void;
}

let toastCounter = 0;

export function useGameState(): GameState {
  const [player, setPlayer] = useState<Player | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [ollamaOnline, setOllamaOnline] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const refresh = useCallback(async () => {
    try {
      const [p, b, h, q, status] = await Promise.all([
        api.getPlayer(),
        api.getBadges(),
        api.getAllHotspots(),
        api.getQuests(),
        api.ollamaStatus(),
      ]);
      setPlayer(p);
      setBadges(b);
      setHotspots(h);
      setQuests(q);
      setOllamaOnline(status.online);
    } catch (err) {
      console.error('Failed to refresh game state:', err);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addToast = useCallback((text: string, type: Toast['type']) => {
    const id = ++toastCounter;
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const processEvents = useCallback(async (events: GameEvent[]) => {
    for (const event of events) {
      if (event.type === 'level_up') {
        addToast(`LEVEL UP! NOW LEVEL ${event.payload.level}`, 'level-up');
      } else if (event.type === 'badge_earned') {
        addToast(`BADGE EARNED: ${event.payload.badgeName}`, 'badge');
      } else if (event.type === 'zone_discovered') {
        addToast(`ZONE DISCOVERED: ${event.payload.hotspotName}`, 'discovery');
      } else if (event.type === 'score') {
        addToast(`+${event.payload.points} PTS`, 'score');
      }
    }
    await refresh();
  }, [addToast, refresh]);

  return { player, badges, hotspots, quests, ollamaOnline, toasts, refresh, processEvents, removeToast };
}
