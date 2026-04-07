import React from 'react';
import type { Player, Badge } from '@shared/types';

interface TopBarProps {
  player: Player | null;
  badges: Badge[];
  ollamaOnline: boolean;
}

export function TopBar({ player, badges, ollamaOnline }: TopBarProps) {
  const earned = badges.filter(b => b.earned).length;
  const total = badges.length;

  return (
    <div style={{
      background: '#e94560',
      height: '48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      flexShrink: 0,
      borderBottom: '2px solid #fdcb6e',
    }}>
      {/* Left: Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '22px' }}>🐿️</span>
        <span style={{
          fontFamily: '"Courier New", monospace',
          fontWeight: 'bold',
          fontSize: '18px',
          letterSpacing: '4px',
          color: '#fff',
          textShadow: '2px 2px 0px #0f3460',
        }}>
          SQUIRREL SAFARI
        </span>
      </div>

      {/* Right: Stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Score */}
        <StatChip label="SCORE" value={player ? player.score.toLocaleString() : '---'} />

        {/* Level */}
        <StatChip label="LEVEL" value={player ? String(player.level) : '-'} />

        {/* XP */}
        <StatChip label="XP" value={player ? player.xp.toLocaleString() : '---'} />

        {/* Badges */}
        <StatChip label="BADGES" value={`${earned}/${total || '?'}`} />

        {/* Ollama status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: ollamaOnline ? '#00ff88' : '#888',
            boxShadow: ollamaOnline ? '0 0 8px #00ff88' : 'none',
            animation: ollamaOnline ? 'pulse 2s infinite' : 'none',
          }} />
          <span style={{
            fontFamily: '"Courier New", monospace',
            fontSize: '10px',
            fontWeight: 'bold',
            letterSpacing: '1px',
            color: ollamaOnline ? '#00ff88' : '#888',
          }}>
            {ollamaOnline ? 'SCOUT ONLINE' : 'SCOUT OFFLINE'}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2 }}>
      <span style={{
        fontFamily: '"Courier New", monospace',
        fontSize: '9px',
        fontWeight: 'bold',
        letterSpacing: '2px',
        color: 'rgba(255,255,255,0.7)',
      }}>{label}</span>
      <span style={{
        fontFamily: '"Courier New", monospace',
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#fff',
        letterSpacing: '1px',
      }}>{value}</span>
    </div>
  );
}
