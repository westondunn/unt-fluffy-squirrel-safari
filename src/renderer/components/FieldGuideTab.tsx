import React from 'react';
import type { Hotspot } from '@shared/types';

interface FieldGuideTabProps {
  hotspots: Hotspot[];
}

function acornRating(score: number, discovered: boolean): string {
  if (!discovered) return '■■■■■';
  const acorns = Math.max(0, Math.min(5, Math.round(score)));
  return '🌰'.repeat(acorns) + '·'.repeat(5 - acorns);
}

export function FieldGuideTab({ hotspots }: FieldGuideTabProps) {
  // Sort by id for stable numbering
  const sorted = [...hotspots].sort((a, b) => a.id - b.id);
  const discovered = sorted.filter(h => h.discovered).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px',
        borderBottom: '1px solid #16213e',
        fontFamily: '"Courier New", monospace',
        fontSize: '11px',
        fontWeight: 'bold',
        letterSpacing: '2px',
        color: '#fdcb6e',
        flexShrink: 0,
      }}>
        FIELD GUIDE — {discovered}/{sorted.length} DISCOVERED
      </div>

      {/* Grid */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
        alignContent: 'start',
      }}>
        {sorted.map((hotspot, idx) => {
          const num = String(idx + 1).padStart(2, '0');
          const isDiscovered = hotspot.discovered;

          return (
            <div
              key={hotspot.id}
              style={{
                background: '#16213e',
                border: `1px solid ${isDiscovered ? '#533483' : '#333'}`,
                borderRadius: '4px',
                padding: '8px',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = '#e94560';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = isDiscovered ? '#533483' : '#333';
              }}
            >
              {/* Number */}
              <div style={{
                fontFamily: '"Courier New", monospace',
                fontSize: '9px',
                fontWeight: 'bold',
                letterSpacing: '2px',
                color: '#e94560',
                marginBottom: '4px',
              }}>
                #{num}
              </div>

              {/* Name */}
              <div style={{
                fontFamily: '"Courier New", monospace',
                fontSize: '11px',
                fontWeight: 'bold',
                color: isDiscovered ? '#eee' : '#555',
                marginBottom: '5px',
                lineHeight: '1.3',
                minHeight: '28px',
                display: 'flex',
                alignItems: 'center',
              }}>
                {isDiscovered ? hotspot.name : '???'}
              </div>

              {/* Acorn rating */}
              <div style={{
                fontFamily: '"Courier New", monospace',
                fontSize: '10px',
                letterSpacing: '1px',
                marginBottom: '4px',
                color: isDiscovered ? '#fdcb6e' : '#444',
              }}>
                {acornRating(hotspot.score, isDiscovered)}
              </div>

              {/* Tree count */}
              <div style={{
                fontFamily: '"Courier New", monospace',
                fontSize: '9px',
                letterSpacing: '1px',
                color: '#666',
              }}>
                {isDiscovered ? `${hotspot.tree_count} TREES · ${hotspot.nut_count} NUT` : '? TREES'}
              </div>
            </div>
          );
        })}

        {sorted.length === 0 && (
          <div style={{
            gridColumn: '1/-1',
            textAlign: 'center',
            color: '#444',
            fontFamily: '"Courier New", monospace',
            fontSize: '11px',
            paddingTop: '40px',
          }}>
            NO HOTSPOTS FOUND
          </div>
        )}
      </div>
    </div>
  );
}
