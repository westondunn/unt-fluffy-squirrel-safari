import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateLevel, checkBadgeCriteria } from '../src/main/game-engine';
import type { BadgeStats } from '../src/main/game-engine';
import {
  handleDiscoverZone,
  handleLogSighting,
  handleCompleteQuest,
  POINTS,
} from '../src/main/game-engine';
import type { Player, Hotspot, Sighting, Badge } from '../src/shared/types';

vi.mock('../src/main/db', () => ({
  discoverZone: vi.fn(),
  getPlayer: vi.fn(),
  addScore: vi.fn(),
  updateLastSeen: vi.fn(),
  getSightings: vi.fn(),
  getBadges: vi.fn(),
  getAllHotspots: vi.fn(),
  getQuests: vi.fn(),
  getSetting: vi.fn(),
  logSighting: vi.fn(),
  completeQuest: vi.fn(),
  earnBadge: vi.fn(),
}));

import * as db from '../src/main/db';

const mockedDb = vi.mocked(db);

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 1,
    name: 'Tester',
    level: 1,
    xp: 0,
    score: 0,
    streak: 0,
    last_seen: null,
    ...overrides,
  };
}

function makeBadge(id: number, overrides: Partial<Badge> = {}): Badge {
  return {
    id,
    name: `Badge ${id}`,
    description: 'test',
    icon: 'icon',
    condition_type: 'discover_count',
    condition_value: 99,
    earned: false,
    earned_at: null,
    ...overrides,
  };
}

function setupDefaultMocks(): void {
  mockedDb.getPlayer.mockReturnValue(makePlayer());
  mockedDb.getSightings.mockReturnValue([]);
  mockedDb.getBadges.mockReturnValue([]);
  mockedDb.getAllHotspots.mockReturnValue([]);
  mockedDb.getQuests.mockReturnValue([]);
  mockedDb.getSetting.mockReturnValue(undefined);
  mockedDb.addScore.mockReturnValue(makePlayer());
  mockedDb.logSighting.mockReturnValue({
    id: 1,
    tree_id: null,
    hotspot_id: null,
    lat: 33.21,
    lon: -97.15,
    photo_path: null,
    notes: '',
    timestamp: '2026-04-08T00:00:00Z',
  } as Sighting);
}

beforeEach(() => {
  vi.clearAllMocks();
  setupDefaultMocks();
});

// ── helpers ───────────────────────────────────────────────────────────────────

function makeStats(overrides: Partial<BadgeStats> = {}): BadgeStats {
  return {
    discoveries: 0,
    sightings: 0,
    photoCount: 0,
    chatCount: 0,
    questCount: 0,
    score: 0,
    level: 1,
    totalBadges: 24,
    earnedBadges: 0,
    totalHotspots: 16,
    streak: 0,
    ...overrides,
  };
}

// ── calculateLevel ────────────────────────────────────────────────────────────

describe('calculateLevel', () => {
  it('returns level 1 for score 0', () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it('returns level 1 for score 499', () => {
    expect(calculateLevel(499)).toBe(1);
  });

  it('returns level 2 for score 500', () => {
    expect(calculateLevel(500)).toBe(2);
  });

  it('returns level 2 for score 999', () => {
    expect(calculateLevel(999)).toBe(2);
  });

  it('returns level 3 for score 1000', () => {
    expect(calculateLevel(1000)).toBe(3);
  });

  it('returns level 21 for score 10000', () => {
    expect(calculateLevel(10000)).toBe(21);
  });
});

// ── checkBadgeCriteria ────────────────────────────────────────────────────────

describe('checkBadgeCriteria — discover_count', () => {
  it('returns true when discoveries meet threshold', () => {
    expect(checkBadgeCriteria('discover_count', 1, makeStats({ discoveries: 1 }))).toBe(true);
    expect(checkBadgeCriteria('discover_count', 5, makeStats({ discoveries: 5 }))).toBe(true);
    expect(checkBadgeCriteria('discover_count', 5, makeStats({ discoveries: 10 }))).toBe(true);
  });

  it('returns false when discoveries are below threshold', () => {
    expect(checkBadgeCriteria('discover_count', 5, makeStats({ discoveries: 4 }))).toBe(false);
    expect(checkBadgeCriteria('discover_count', 1, makeStats({ discoveries: 0 }))).toBe(false);
  });
});

describe('checkBadgeCriteria — discover_percent', () => {
  it('returns true when discovery percentage meets threshold', () => {
    // 8 out of 16 hotspots = 50%
    expect(
      checkBadgeCriteria('discover_percent', 50, makeStats({ discoveries: 8, totalHotspots: 16 })),
    ).toBe(true);
    expect(
      checkBadgeCriteria(
        'discover_percent',
        100,
        makeStats({ discoveries: 16, totalHotspots: 16 }),
      ),
    ).toBe(true);
  });

  it('returns false when discovery percentage is below threshold', () => {
    expect(
      checkBadgeCriteria('discover_percent', 50, makeStats({ discoveries: 7, totalHotspots: 16 })),
    ).toBe(false);
  });

  it('returns false when totalHotspots is 0', () => {
    expect(
      checkBadgeCriteria('discover_percent', 50, makeStats({ discoveries: 0, totalHotspots: 0 })),
    ).toBe(false);
  });
});

describe('checkBadgeCriteria — sighting_count', () => {
  it('returns true when sightings meet threshold', () => {
    expect(checkBadgeCriteria('sighting_count', 1, makeStats({ sightings: 1 }))).toBe(true);
    expect(checkBadgeCriteria('sighting_count', 25, makeStats({ sightings: 25 }))).toBe(true);
  });

  it('returns false when below threshold', () => {
    expect(checkBadgeCriteria('sighting_count', 25, makeStats({ sightings: 24 }))).toBe(false);
  });
});

describe('checkBadgeCriteria — photo_count', () => {
  it('returns true when photoCount meets threshold', () => {
    expect(checkBadgeCriteria('photo_count', 10, makeStats({ photoCount: 10 }))).toBe(true);
  });

  it('returns false when below threshold', () => {
    expect(checkBadgeCriteria('photo_count', 10, makeStats({ photoCount: 9 }))).toBe(false);
  });
});

describe('checkBadgeCriteria — chat_count', () => {
  it('returns true when chatCount meets threshold', () => {
    expect(checkBadgeCriteria('chat_count', 25, makeStats({ chatCount: 30 }))).toBe(true);
  });

  it('returns false when below threshold', () => {
    expect(checkBadgeCriteria('chat_count', 25, makeStats({ chatCount: 24 }))).toBe(false);
  });
});

describe('checkBadgeCriteria — quest_count', () => {
  it('returns true when questCount meets threshold', () => {
    expect(checkBadgeCriteria('quest_count', 10, makeStats({ questCount: 10 }))).toBe(true);
  });

  it('returns false when below threshold', () => {
    expect(checkBadgeCriteria('quest_count', 10, makeStats({ questCount: 9 }))).toBe(false);
  });
});

describe('checkBadgeCriteria — score', () => {
  it('returns true when score meets threshold', () => {
    expect(checkBadgeCriteria('score', 10000, makeStats({ score: 10000 }))).toBe(true);
    expect(checkBadgeCriteria('score', 10000, makeStats({ score: 99999 }))).toBe(true);
  });

  it('returns false when below threshold', () => {
    expect(checkBadgeCriteria('score', 10000, makeStats({ score: 9999 }))).toBe(false);
  });
});

describe('checkBadgeCriteria — level', () => {
  it('returns true when level meets threshold', () => {
    expect(checkBadgeCriteria('level', 20, makeStats({ level: 20 }))).toBe(true);
  });

  it('returns false when below threshold', () => {
    expect(checkBadgeCriteria('level', 20, makeStats({ level: 19 }))).toBe(false);
  });
});

describe('checkBadgeCriteria — streak', () => {
  it('returns true when streak meets threshold', () => {
    expect(checkBadgeCriteria('streak', 7, makeStats({ streak: 7 }))).toBe(true);
  });

  it('returns false when below threshold', () => {
    expect(checkBadgeCriteria('streak', 7, makeStats({ streak: 6 }))).toBe(false);
  });
});

describe('checkBadgeCriteria — all_badges', () => {
  it('returns true when earnedBadges meets threshold', () => {
    expect(checkBadgeCriteria('all_badges', 23, makeStats({ earnedBadges: 23 }))).toBe(true);
  });

  it('returns false when below threshold', () => {
    expect(checkBadgeCriteria('all_badges', 23, makeStats({ earnedBadges: 22 }))).toBe(false);
  });
});

describe('checkBadgeCriteria — time/special types', () => {
  it('returns false for time_before (not implemented at stats level)', () => {
    expect(checkBadgeCriteria('time_before', 8, makeStats())).toBe(false);
  });

  it('returns false for time_after', () => {
    expect(checkBadgeCriteria('time_after', 21, makeStats())).toBe(false);
  });

  it('returns false for unknown type', () => {
    expect(checkBadgeCriteria('does_not_exist', 1, makeStats())).toBe(false);
  });
});

// ── handleDiscoverZone ───────────────────────────────────────────────────────

describe('handleDiscoverZone', () => {
  it('returns score and zone_discovered events on success', () => {
    mockedDb.discoverZone.mockReturnValue({
      id: 1,
      name: 'Oak Alley',
      lat: 33.21,
      lon: -97.15,
      radius_m: 50,
      score: 4,
      tree_count: 10,
      nut_count: 8,
      species: 'Live Oak',
      notes: '',
      discovered: true,
    } as Hotspot);
    const updated = makePlayer({ score: 100 });
    mockedDb.getPlayer
      .mockReturnValueOnce(makePlayer({ score: 0, level: 1 }))
      .mockReturnValueOnce(updated);
    mockedDb.addScore.mockReturnValue(updated);

    const events = handleDiscoverZone(1);

    expect(events.some((e) => e.type === 'score')).toBe(true);
    expect(events.some((e) => e.type === 'zone_discovered')).toBe(true);
    const scoreEvt = events.find((e) => e.type === 'score')!;
    expect(scoreEvt.payload).toEqual({ points: POINTS.DISCOVER_ZONE, total: 100 });
  });

  it('returns empty events when hotspot not found', () => {
    mockedDb.discoverZone.mockReturnValue(null);
    const events = handleDiscoverZone(999);
    expect(events).toHaveLength(0);
  });

  it('detects level-up when score crosses 500 boundary', () => {
    mockedDb.discoverZone.mockReturnValue({
      id: 1,
      name: 'Oak Alley',
      lat: 33.21,
      lon: -97.15,
      radius_m: 50,
      score: 4,
      tree_count: 10,
      nut_count: 8,
      species: 'Live Oak',
      notes: '',
      discovered: true,
    } as Hotspot);
    mockedDb.getPlayer
      .mockReturnValueOnce(makePlayer({ score: 450, level: 1 }))
      .mockReturnValueOnce(makePlayer({ score: 550, level: 2 }));
    mockedDb.addScore.mockReturnValue(makePlayer({ score: 550, level: 2 }));

    const events = handleDiscoverZone(1);
    expect(events.some((e) => e.type === 'level_up')).toBe(true);
  });

  it('triggers badge award when criteria met', () => {
    mockedDb.discoverZone.mockReturnValue({
      id: 1,
      name: 'Oak Alley',
      lat: 33.21,
      lon: -97.15,
      radius_m: 50,
      score: 4,
      tree_count: 10,
      nut_count: 8,
      species: 'Live Oak',
      notes: '',
      discovered: true,
    } as Hotspot);
    const player = makePlayer({ score: 100, level: 1 });
    mockedDb.getPlayer.mockReturnValue(player);
    mockedDb.addScore.mockReturnValue(player);
    // Badge with discover_count=1, currently at 0 discoveries but handler increments
    mockedDb.getBadges.mockReturnValue([
      makeBadge(1, { condition_type: 'discover_count', condition_value: 1 }),
    ]);

    const events = handleDiscoverZone(1);
    expect(events.some((e) => e.type === 'badge_earned')).toBe(true);
  });
});

// ── handleLogSighting ────────────────────────────────────────────────────────

describe('handleLogSighting', () => {
  it('returns score event with correct points', () => {
    const updated = makePlayer({ score: 50 });
    mockedDb.getPlayer.mockReturnValueOnce(makePlayer()).mockReturnValueOnce(updated);
    mockedDb.addScore.mockReturnValue(updated);

    const events = handleLogSighting({
      tree_id: 1,
      hotspot_id: 1,
      lat: 33.21,
      lon: -97.15,
      photo_path: null,
      notes: 'test',
      timestamp: '2026-04-08T00:00:00Z',
    });

    const scoreEvt = events.find((e) => e.type === 'score')!;
    expect(scoreEvt.payload).toEqual({ points: POINTS.LOG_SIGHTING, total: 50 });
  });

  it('calls db.logSighting with the sighting data', () => {
    const sighting = {
      tree_id: 1,
      hotspot_id: 1,
      lat: 33.21,
      lon: -97.15,
      photo_path: null,
      notes: 'test',
      timestamp: '2026-04-08T00:00:00Z',
    };
    handleLogSighting(sighting);
    expect(mockedDb.logSighting).toHaveBeenCalledWith(sighting);
  });

  it('detects level-up', () => {
    mockedDb.getPlayer
      .mockReturnValueOnce(makePlayer({ score: 480, level: 1 }))
      .mockReturnValueOnce(makePlayer({ score: 530, level: 2 }));
    mockedDb.addScore.mockReturnValue(makePlayer({ score: 530, level: 2 }));

    const events = handleLogSighting({
      tree_id: 1,
      hotspot_id: 1,
      lat: 33.21,
      lon: -97.15,
      photo_path: null,
      notes: 'test',
      timestamp: '2026-04-08T00:00:00Z',
    });

    expect(events.some((e) => e.type === 'level_up')).toBe(true);
  });
});

// ── handleCompleteQuest ──────────────────────────────────────────────────────

describe('handleCompleteQuest', () => {
  it('returns score event with correct points', () => {
    const updated = makePlayer({ score: 300 });
    mockedDb.getPlayer.mockReturnValueOnce(makePlayer()).mockReturnValueOnce(updated);
    mockedDb.addScore.mockReturnValue(updated);

    const events = handleCompleteQuest(1);

    const scoreEvt = events.find((e) => e.type === 'score')!;
    expect(scoreEvt.payload).toEqual({ points: POINTS.COMPLETE_QUEST, total: 300 });
  });

  it('calls db.completeQuest with the quest id', () => {
    handleCompleteQuest(42);
    expect(mockedDb.completeQuest).toHaveBeenCalledWith(42);
  });

  it('detects level-up from quest points', () => {
    mockedDb.getPlayer
      .mockReturnValueOnce(makePlayer({ score: 400, level: 1 }))
      .mockReturnValueOnce(makePlayer({ score: 700, level: 2 }));
    mockedDb.addScore.mockReturnValue(makePlayer({ score: 700, level: 2 }));

    const events = handleCompleteQuest(1);
    expect(events.some((e) => e.type === 'level_up')).toBe(true);
  });
});
