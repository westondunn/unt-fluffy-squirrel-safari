import React from 'react';
import type { Hotspot } from '@shared/types';

interface FieldGuideTabProps {
  hotspots: Hotspot[];
  onFocusHotspot?: (hotspot: Hotspot) => void;
}

function acornRating(score: number, discovered: boolean): string {
  if (!discovered) return '■ ■ ■ ■ ■';
  const acorns = Math.max(0, Math.min(5, Math.round(score)));
  return '🌰'.repeat(acorns) + '·'.repeat(5 - acorns);
}

export function FieldGuideTab({ hotspots, onFocusHotspot }: FieldGuideTabProps) {
  const sorted = [...hotspots].sort((a, b) => a.id - b.id);
  const discovered = sorted.filter((h) => h.discovered).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '4px solid #C84C0C',
          fontFamily: '"Courier New", monospace',
          fontSize: '11px',
          fontWeight: 'bold',
          letterSpacing: '2px',
          color: '#F8D830',
          background: '#000',
          flexShrink: 0,
        }}
      >
        📖 FIELD GUIDE — {discovered}/{sorted.length}
      </div>

      {/* List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {sorted.map((hotspot, idx) => {
          const num = String(idx + 1).padStart(2, '0');
          const disc = hotspot.discovered;

          return (
            <button
              key={hotspot.id}
              onClick={() => onFocusHotspot?.(hotspot)}
              style={{
                display: 'flex',
                alignItems: 'stretch',
                gap: '0',
                background: disc ? '#F8B800' : '#555',
                border: `3px solid ${disc ? '#A87820' : '#333'}`,
                borderRadius: '2px',
                padding: '0',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: '"Courier New", monospace',
                boxShadow: disc ? '2px 2px 0px #A87820' : '2px 2px 0px #222',
                transition: 'transform 0.1s',
                width: '100%',
              }}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translate(2px, 2px)';
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLElement).style.transform = '';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = '';
              }}
            >
              {/* Number badge */}
              <div
                style={{
                  width: '36px',
                  minWidth: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: disc ? '#E40058' : '#333',
                  color: '#FCF8FC',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                }}
              >
                {num}
              </div>

              {/* Content */}
              <div style={{ flex: 1, padding: '8px 10px' }}>
                {/* Name */}
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: disc ? '#38180C' : '#888',
                    letterSpacing: '1px',
                    marginBottom: '3px',
                  }}
                >
                  {disc ? hotspot.name : '??? UNKNOWN ZONE'}
                </div>

                {/* Stats row */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {/* Acorn rating */}
                  <span
                    style={{
                      fontSize: '10px',
                      letterSpacing: '1px',
                      color: disc ? '#38180C' : '#666',
                    }}
                  >
                    {acornRating(hotspot.score, disc)}
                  </span>

                  {/* Tree count */}
                  <span
                    style={{
                      fontSize: '9px',
                      color: disc ? '#666' : '#555',
                      letterSpacing: '1px',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {disc ? `${hotspot.tree_count}🌳 ${hotspot.nut_count}🌰` : '?🌳'}
                  </span>
                </div>
              </div>

              {/* Arrow / status */}
              <div
                style={{
                  width: '28px',
                  minWidth: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  color: disc ? '#38180C' : '#555',
                }}
              >
                {disc ? '📍' : '🔒'}
              </div>
            </button>
          );
        })}

        {sorted.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: '#888',
              fontFamily: '"Courier New", monospace',
              fontSize: '11px',
              paddingTop: '40px',
            }}
          >
            NO HOTSPOTS FOUND
          </div>
        )}
      </div>
    </div>
  );
}
