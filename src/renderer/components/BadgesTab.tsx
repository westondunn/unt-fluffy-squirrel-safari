import React from 'react';
import type { Badge } from '@shared/types';

interface BadgesTabProps {
  badges: Badge[];
}

export function BadgesTab({ badges }: BadgesTabProps) {
  const earned = badges.filter(b => b.earned).length;

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
        BADGES — {earned}/{badges.length}
      </div>

      {/* Grid */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr 1fr',
        gap: '6px',
        alignContent: 'start',
      }}>
        {badges.map(badge => (
          <div
            key={badge.id}
            title={badge.earned ? `${badge.name}: ${badge.description}` : '???'}
            style={{
              background: badge.earned ? '#16213e' : '#111',
              border: `1px solid ${badge.earned ? '#533483' : '#222'}`,
              borderRadius: '4px',
              padding: '8px 4px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              cursor: 'default',
              opacity: badge.earned ? 1 : 0.5,
              transition: 'all 0.2s',
              minHeight: '64px',
            }}
          >
            <span style={{ fontSize: '20px' }}>
              {badge.earned ? badge.icon : '?'}
            </span>
            <span style={{
              fontFamily: '"Courier New", monospace',
              fontSize: '8px',
              fontWeight: 'bold',
              letterSpacing: '0.5px',
              color: badge.earned ? '#fdcb6e' : '#444',
              textAlign: 'center',
              lineHeight: '1.2',
              wordBreak: 'break-word',
            }}>
              {badge.earned ? badge.name.toUpperCase() : '???'}
            </span>
          </div>
        ))}

        {badges.length === 0 && (
          <div style={{
            gridColumn: '1/-1',
            textAlign: 'center',
            color: '#444',
            fontFamily: '"Courier New", monospace',
            fontSize: '11px',
            paddingTop: '40px',
          }}>
            NO BADGES YET
          </div>
        )}
      </div>
    </div>
  );
}
