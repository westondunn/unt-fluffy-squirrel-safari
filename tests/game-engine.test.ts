import { describe, it, expect } from 'vitest';
import { calculateLevel, checkBadgeCriteria } from '../src/main/game-engine';
import type { BadgeStats } from '../src/main/game-engine';

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
    expect(checkBadgeCriteria('discover_percent', 50, makeStats({ discoveries: 8, totalHotspots: 16 }))).toBe(true);
    expect(checkBadgeCriteria('discover_percent', 100, makeStats({ discoveries: 16, totalHotspots: 16 }))).toBe(true);
  });

  it('returns false when discovery percentage is below threshold', () => {
    expect(checkBadgeCriteria('discover_percent', 50, makeStats({ discoveries: 7, totalHotspots: 16 }))).toBe(false);
  });

  it('returns false when totalHotspots is 0', () => {
    expect(checkBadgeCriteria('discover_percent', 50, makeStats({ discoveries: 0, totalHotspots: 0 }))).toBe(false);
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
