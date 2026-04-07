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
      background: '#000',
      height: '52px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      flexShrink: 0,
      borderBottom: '4px solid #C84C0C',
    }}>
      {/* Left: Title — SMB3 style */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '22px' }}>🐿️</span>
        <span style={{
          fontFamily: '"Courier New", monospace',
          fontWeight: 'bold',
          fontSize: '18px',
          letterSpacing: '3px',
          color: '#F8D830',
          textShadow: '2px 2px 0px #A87820',
        }}>
          UNT FLUFFY SQUIRREL SAFARI
        </span>
      </div>

      {/* Right: Stats — SMB3 HUD style */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <HudStat icon="🪙" label="SCORE" value={player ? player.score.toLocaleString() : '0'} color="#F8D830" />
        <HudStat icon="⭐" label="WORLD" value={`${player ? player.level : 1}`} color="#FCF8FC" />
        <HudStat icon="🏅" label="BADGES" value={`${earned}/${total || '?'}`} color="#F8D830" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '2px',
            background: ollamaOnline ? '#00A800' : '#A80040',
            border: `2px solid ${ollamaOnline ? '#005800' : '#580020'}`,
          }} />
          <span style={{
            fontFamily: '"Courier New", monospace',
            fontSize: '10px',
            fontWeight: 'bold',
            letterSpacing: '1px',
            color: ollamaOnline ? '#00A800' : '#888',
          }}>
            {ollamaOnline ? 'SCOUT' : 'OFFLINE'}
          </span>
        </div>
      </div>
    </div>
  );
}

function HudStat({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.1 }}>
      <span style={{
        fontFamily: '"Courier New", monospace',
        fontSize: '9px',
        fontWeight: 'bold',
        letterSpacing: '2px',
        color: '#FCF8FC',
      }}>{icon} {label}</span>
      <span style={{
        fontFamily: '"Courier New", monospace',
        fontSize: '16px',
        fontWeight: 'bold',
        color,
        letterSpacing: '1px',
      }}>{value}</span>
    </div>
  );
}
