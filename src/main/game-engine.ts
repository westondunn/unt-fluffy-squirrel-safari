import * as db from './db';
import type { Sighting } from '../shared/types';

// ── constants ─────────────────────────────────────────────────────────────────

export const POINTS = {
  DISCOVER_ZONE: 100,
  LOG_SIGHTING: 50,
  EARN_BADGE: 200,
  COMPLETE_QUEST: 300,
} as const;

// ── types ─────────────────────────────────────────────────────────────────────

export type GameEvent =
  | { type: 'score'; payload: { points: number; total: number } }
  | { type: 'level_up'; payload: { level: number } }
  | { type: 'badge_earned'; payload: { badgeId: number; badgeName: string } }
  | { type: 'zone_discovered'; payload: { hotspotId: number; hotspotName: string } };

export interface BadgeStats {
  discoveries: number; // total hotspots visited
  sightings: number; // total sightings logged
  photoCount: number; // sightings with photos
  chatCount: number; // ollama chats
  questCount: number; // quests completed
  score: number;
  level: number;
  totalBadges: number;
  earnedBadges: number;
  totalHotspots: number;
  streak: number;
}

// ── pure functions ────────────────────────────────────────────────────────────

export function calculateLevel(score: number): number {
  return Math.floor(score / 500) + 1;
}

export function checkBadgeCriteria(
  criteriaType: string,
  criteriaValue: number,
  stats: BadgeStats,
): boolean {
  switch (criteriaType) {
    case 'discover_count':
      return stats.discoveries >= criteriaValue;
    case 'discover_percent':
      return (
        stats.totalHotspots > 0 && (stats.discoveries / stats.totalHotspots) * 100 >= criteriaValue
      );
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
    case 'streak':
      return stats.streak >= criteriaValue;
    case 'all_badges':
      return stats.earnedBadges >= criteriaValue;
    // Time-based and special badges — require runtime context, default false
    case 'time_before':
    case 'time_after':
    case 'daily_discover':
    case 'oak_zones':
    case 'pecan_zones':
    case 'memorial_zone':
    case 'diverse_zone':
    case 'elevation_count':
      return false;
    default:
      return false;
  }
}

// ── helpers ───────────────────────────────────────────────────────────────────

function buildStats(): BadgeStats {
  const player = db.getPlayer();
  const sightings = db.getSightings();
  const badges = db.getBadges();
  const hotspots = db.getAllHotspots();
  const quests = db.getQuests();

  const chatCount = parseInt(db.getSetting('chat_count') ?? '0', 10);

  return {
    discoveries: player.score > 0 ? Math.max(0, player.score - player.xp) : 0,
    sightings: sightings.length,
    photoCount: sightings.filter((s) => s.photo_path != null).length,
    chatCount,
    questCount: quests.filter((q) => q.status === 'completed').length,
    score: player.score,
    level: player.level,
    totalBadges: badges.length,
    earnedBadges: badges.filter((b) => b.earned).length,
    totalHotspots: hotspots.length,
    streak: player.streak,
  };
}

function checkAndAwardBadges(stats: BadgeStats): GameEvent[] {
  const events: GameEvent[] = [];
  const badges = db.getBadges();

  for (const badge of badges) {
    if (badge.earned) continue;
    if (checkBadgeCriteria(badge.condition_type, badge.condition_value, stats)) {
      db.earnBadge(badge.id);
      // Award bonus points for earning a badge
      const updatedPlayer = db.addScore(POINTS.EARN_BADGE);
      events.push({
        type: 'badge_earned',
        payload: { badgeId: badge.id, badgeName: badge.name },
      });
      // Check for level-up from badge bonus
      const newLevel = calculateLevel(updatedPlayer.score);
      if (newLevel > stats.level) {
        events.push({ type: 'level_up', payload: { level: newLevel } });
        stats.level = newLevel;
      }
      stats.score = updatedPlayer.score;
      stats.earnedBadges += 1;
    }
  }

  return events;
}

// ── game actions ──────────────────────────────────────────────────────────────

export function handleDiscoverZone(hotspotId: number): GameEvent[] {
  const events: GameEvent[] = [];

  const hotspot = db.discoverZone(hotspotId);
  if (!hotspot) return events;

  const prevPlayer = db.getPlayer();

  db.addScore(POINTS.DISCOVER_ZONE);
  db.updateLastSeen();

  const updatedPlayer = db.getPlayer();

  events.push({
    type: 'score',
    payload: { points: POINTS.DISCOVER_ZONE, total: updatedPlayer.score },
  });

  if (updatedPlayer.level > prevPlayer.level) {
    events.push({ type: 'level_up', payload: { level: updatedPlayer.level } });
  }

  events.push({
    type: 'zone_discovered',
    payload: { hotspotId, hotspotName: hotspot.name },
  });

  const stats = buildStats();
  // Increment discoveries count in stats for badge checking
  stats.discoveries += 1;
  const badgeEvents = checkAndAwardBadges(stats);
  events.push(...badgeEvents);

  return events;
}

export function handleLogSighting(sighting: Omit<Sighting, 'id'>): GameEvent[] {
  const events: GameEvent[] = [];

  db.logSighting(sighting);
  const prevPlayer = db.getPlayer();
  db.addScore(POINTS.LOG_SIGHTING);
  db.updateLastSeen();

  const updatedPlayer = db.getPlayer();

  events.push({
    type: 'score',
    payload: { points: POINTS.LOG_SIGHTING, total: updatedPlayer.score },
  });

  if (updatedPlayer.level > prevPlayer.level) {
    events.push({ type: 'level_up', payload: { level: updatedPlayer.level } });
  }

  const stats = buildStats();
  const badgeEvents = checkAndAwardBadges(stats);
  events.push(...badgeEvents);

  return events;
}

export function handleCompleteQuest(questId: number): GameEvent[] {
  const events: GameEvent[] = [];

  db.completeQuest(questId);
  const prevPlayer = db.getPlayer();
  db.addScore(POINTS.COMPLETE_QUEST);
  db.updateLastSeen();

  const updatedPlayer = db.getPlayer();

  events.push({
    type: 'score',
    payload: { points: POINTS.COMPLETE_QUEST, total: updatedPlayer.score },
  });

  if (updatedPlayer.level > prevPlayer.level) {
    events.push({ type: 'level_up', payload: { level: updatedPlayer.level } });
  }

  const stats = buildStats();
  const badgeEvents = checkAndAwardBadges(stats);
  events.push(...badgeEvents);

  return events;
}
