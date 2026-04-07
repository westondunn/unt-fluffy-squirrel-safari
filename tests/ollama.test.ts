import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../src/main/ollama';
import type { SystemPromptContext } from '../src/main/ollama';
import type { Hotspot } from '../src/shared/types';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeHotspot(id: number, overrides: Partial<Hotspot> = {}): Hotspot {
  return {
    id,
    name: `Hotspot ${id}`,
    lat: 33.21 + id * 0.001,
    lon: -97.15 + id * 0.001,
    radius_m: 50,
    score: 3,
    tree_count: 10,
    nut_count: 8,
    species: 'live oak, pecan',
    notes: '10 trees, 2 species',
    ...overrides,
  };
}

function makeContext(overrides: Partial<SystemPromptContext> = {}): SystemPromptContext {
  return {
    playerLevel: 1,
    hotspots: [makeHotspot(1), makeHotspot(2)],
    discoveredCount: 0,
    ...overrides,
  };
}

// ── buildSystemPrompt ─────────────────────────────────────────────────────────

describe('buildSystemPrompt', () => {
  it('includes "Squirrel Scout" in the prompt', () => {
    const prompt = buildSystemPrompt(makeContext());
    expect(prompt).toContain('Squirrel Scout');
  });

  it('includes the player level', () => {
    const prompt = buildSystemPrompt(makeContext({ playerLevel: 5 }));
    expect(prompt).toContain('Level 5');
  });

  it('includes the hotspot count', () => {
    const hotspots = [makeHotspot(1), makeHotspot(2), makeHotspot(3)];
    const prompt = buildSystemPrompt(makeContext({ hotspots, discoveredCount: 1 }));
    expect(prompt).toContain('3');
  });

  it('includes hotspot names', () => {
    const hotspots = [makeHotspot(7, { name: 'Oak Alley' })];
    const prompt = buildSystemPrompt(makeContext({ hotspots }));
    expect(prompt).toContain('Oak Alley');
  });

  it('includes UNT campus reference', () => {
    const prompt = buildSystemPrompt(makeContext());
    expect(prompt.toLowerCase()).toContain('unt');
  });

  it('includes discovered count in prompt', () => {
    const prompt = buildSystemPrompt(makeContext({ discoveredCount: 4, hotspots: [makeHotspot(1), makeHotspot(2), makeHotspot(3), makeHotspot(4), makeHotspot(5)] }));
    expect(prompt).toContain('4');
  });

  it('handles empty hotspot list gracefully', () => {
    const prompt = buildSystemPrompt(makeContext({ hotspots: [] }));
    expect(prompt).toContain('Squirrel Scout');
    expect(prompt).toContain('Level 1');
  });

  it('limits hotspot summary to at most 8 hotspots', () => {
    const manyHotspots = Array.from({ length: 20 }, (_, i) => makeHotspot(i + 1));
    const prompt = buildSystemPrompt(makeContext({ hotspots: manyHotspots }));
    // Should mention "top 8" or similar — at most 8 bullet entries
    const bullets = (prompt.match(/•/g) ?? []).length;
    expect(bullets).toBeLessThanOrEqual(8);
  });

  it('includes species information for hotspots', () => {
    const hotspots = [makeHotspot(1, { species: 'cedar elm, bur oak' })];
    const prompt = buildSystemPrompt(makeContext({ hotspots }));
    expect(prompt).toContain('cedar elm');
  });
});
