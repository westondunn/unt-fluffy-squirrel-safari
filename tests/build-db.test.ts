import { describe, it, expect } from 'vitest';
import { mercatorToLatLon, clusterTrees, isNutTree, haversineMeters } from '../scripts/build-db';

// ─── mercatorToLatLon ─────────────────────────────────────────────────────────
describe('mercatorToLatLon', () => {
  it('converts UNT campus coordinates to approximately correct lat/lon', () => {
    // Sample point from the CSV: x=-10815949.5025006, y=3922709.44719577
    // Should be near UNT campus in Denton, TX (~33.2° lat, ~-97.1° lon)
    const { lat, lon } = mercatorToLatLon(-10815949.5025006, 3922709.44719577);
    expect(lat).toBeCloseTo(33.21, 1);
    expect(lon).toBeCloseTo(-97.15, 1);
  });

  it('converts known Web Mercator origin (0,0) to (0,0) lat/lon', () => {
    const { lat, lon } = mercatorToLatLon(0, 0);
    expect(lat).toBeCloseTo(0, 5);
    expect(lon).toBeCloseTo(0, 5);
  });

  it('converts positive x to positive longitude', () => {
    const { lon } = mercatorToLatLon(10000000, 0);
    expect(lon).toBeGreaterThan(0);
  });

  it('converts negative x to negative longitude', () => {
    const { lon } = mercatorToLatLon(-10000000, 0);
    expect(lon).toBeLessThan(0);
  });

  it('converts positive y to positive latitude', () => {
    const { lat } = mercatorToLatLon(0, 4000000);
    expect(lat).toBeGreaterThan(0);
  });
});

// ─── isNutTree ────────────────────────────────────────────────────────────────
describe('isNutTree', () => {
  it('identifies Live Oak as a nut tree', () => {
    expect(isNutTree('Live Oak')).toBe(true);
  });

  it('identifies Pecan as a nut tree', () => {
    expect(isNutTree('Pecan')).toBe(true);
  });

  it('identifies Post Oak as a nut tree', () => {
    expect(isNutTree('Post Oak')).toBe(true);
  });

  it('does not identify Unknown as a nut tree', () => {
    expect(isNutTree('Unknown')).toBe(false);
  });

  it('does not identify Elm as a nut tree (only Cedar Elm qualifies)', () => {
    expect(isNutTree('American Elm')).toBe(false);
  });

  it('identifies Cedar Elm as a nut tree', () => {
    expect(isNutTree('Cedar Elm')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isNutTree('LIVE OAK')).toBe(true);
    expect(isNutTree('live oak')).toBe(true);
  });
});

// ─── haversineMeters ──────────────────────────────────────────────────────────
describe('haversineMeters', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineMeters(33.21, -97.15, 33.21, -97.15)).toBeCloseTo(0, 5);
  });

  it('returns ~111km per degree of latitude', () => {
    const d = haversineMeters(0, 0, 1, 0);
    expect(d).toBeGreaterThan(110000);
    expect(d).toBeLessThan(112000);
  });

  it('returns small value for nearby points', () => {
    // ~10m apart
    const d = haversineMeters(33.21, -97.15, 33.2101, -97.15);
    expect(d).toBeLessThan(200);
  });
});

// ─── clusterTrees ─────────────────────────────────────────────────────────────
describe('clusterTrees', () => {
  // Helper: make a minimal TreeRow
  function makeTree(
    lat: number,
    lon: number,
    name_comn = 'Live Oak',
  ): Parameters<typeof clusterTrees>[0][0] {
    return {
      fid: Math.floor(Math.random() * 10000),
      northing: 0,
      easting: 0,
      elevation: 0,
      notes: '',
      unt_id: 0,
      name_comn,
      memorial: 'N',
      memorial_t: '',
      global_id: '',
      x: 0,
      y: 0,
      lat,
      lon,
    };
  }

  it('returns empty array when no trees provided', () => {
    expect(clusterTrees([])).toEqual([]);
  });

  it('skips clusters with fewer than 3 nut trees', () => {
    const trees = [makeTree(33.21, -97.15), makeTree(33.2100001, -97.15)];
    const result = clusterTrees(trees);
    expect(result).toHaveLength(0);
  });

  it('groups nearby nut trees within 50m into a cluster', () => {
    // Place 5 trees very close together (~0m apart)
    const trees = [
      makeTree(33.21, -97.15),
      makeTree(33.21, -97.15),
      makeTree(33.21, -97.15),
      makeTree(33.21, -97.15),
      makeTree(33.21, -97.15),
    ];
    const result = clusterTrees(trees);
    expect(result).toHaveLength(1);
    expect(result[0].trees).toHaveLength(5);
  });

  it('does not group trees that are more than 50m apart into the same cluster', () => {
    // Two groups 500m apart (roughly 0.005 degrees latitude apart at 33° lat)
    const group1 = [makeTree(33.21, -97.15), makeTree(33.21, -97.15), makeTree(33.21, -97.15)];
    const group2 = [
      makeTree(33.215, -97.15), // ~555m north
      makeTree(33.215, -97.15),
      makeTree(33.215, -97.15),
    ];
    const result = clusterTrees([...group1, ...group2]);
    expect(result).toHaveLength(2);
  });

  it('ignores non-nut trees', () => {
    const trees = [
      makeTree(33.21, -97.15, 'Unknown'),
      makeTree(33.21, -97.15, 'Unknown'),
      makeTree(33.21, -97.15, 'Unknown'),
      makeTree(33.21, -97.15, 'Unknown'),
    ];
    const result = clusterTrees(trees);
    expect(result).toHaveLength(0);
  });

  it('scores clusters higher for more trees (larger count)', () => {
    const smallCluster = Array.from({ length: 3 }, () => makeTree(33.21, -97.15, 'Live Oak'));
    const largeCluster = Array.from({ length: 20 }, () => makeTree(33.22, -97.16, 'Live Oak'));
    const result = clusterTrees([...smallCluster, ...largeCluster]);
    expect(result).toHaveLength(2);
    // Large cluster should have higher or equal score
    const largeResult = result.find((c) => c.trees.length === 20)!;
    const smallResult = result.find((c) => c.trees.length === 3)!;
    expect(largeResult.score).toBeGreaterThanOrEqual(smallResult.score);
  });

  it('scores clusters higher for species diversity', () => {
    // Two clusters of same size but different species diversity
    const monoCluster = Array.from({ length: 5 }, () => makeTree(33.21, -97.15, 'Live Oak'));
    const diverseCluster = [
      makeTree(33.22, -97.16, 'Live Oak'),
      makeTree(33.22, -97.16, 'Post Oak'),
      makeTree(33.22, -97.16, 'Pecan'),
      makeTree(33.22, -97.16, 'Hackberry'),
      makeTree(33.22, -97.16, 'Cedar Elm'),
    ];
    const result = clusterTrees([...monoCluster, ...diverseCluster]);
    expect(result).toHaveLength(2);
    const monoResult = result.find((c) => c.species.size === 1)!;
    const diverseResult = result.find((c) => c.species.size === 5)!;
    expect(diverseResult.score).toBeGreaterThan(monoResult.score);
  });

  it('scores are between 1 and 5', () => {
    const trees = Array.from({ length: 10 }, () => makeTree(33.21, -97.15, 'Live Oak'));
    const result = clusterTrees(trees);
    for (const c of result) {
      expect(c.score).toBeGreaterThanOrEqual(1);
      expect(c.score).toBeLessThanOrEqual(5);
    }
  });
});
