import React from 'react';
import type { Quest } from '@shared/types';

interface QuestOverlayProps {
  quests: Quest[];
  onGenerateQuest: () => void;
  onCompleteQuest: (questId: number) => void;
}

function questLabel(quest: Quest): string {
  const type = quest.quest_type.replace(/_/g, ' ').toUpperCase();
  return type;
}

export function QuestOverlay({ quests, onGenerateQuest, onCompleteQuest }: QuestOverlayProps) {
  const activeQuest = quests.find(q => q.status === 'active') || null;

  return (
    <div style={{
      position: 'absolute',
      bottom: '16px',
      left: '16px',
      background: 'rgba(15, 52, 96, 0.92)',
      border: '2px solid #e94560',
      borderRadius: '6px',
      padding: '12px 14px',
      maxWidth: '280px',
      zIndex: 5,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        fontFamily: '"Courier New", monospace',
        fontSize: '9px',
        fontWeight: 'bold',
        letterSpacing: '3px',
        color: '#e94560',
        marginBottom: '8px',
      }}>
        ACTIVE QUEST
      </div>

      {activeQuest ? (
        <div>
          <div style={{
            fontFamily: '"Courier New", monospace',
            fontSize: '12px',
            color: '#eee',
            marginBottom: '10px',
            lineHeight: '1.4',
          }}>
            {questLabel(activeQuest)}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => onCompleteQuest(activeQuest.id)}
              style={{
                flex: 1,
                background: '#e94560',
                border: 'none',
                borderRadius: '3px',
                color: '#fff',
                fontFamily: '"Courier New", monospace',
                fontSize: '10px',
                fontWeight: 'bold',
                letterSpacing: '1px',
                padding: '7px',
                cursor: 'pointer',
              }}
            >
              COMPLETE
            </button>
            <button
              onClick={onGenerateQuest}
              style={{
                background: 'transparent',
                border: '1px solid #533483',
                borderRadius: '3px',
                color: '#888',
                fontFamily: '"Courier New", monospace',
                fontSize: '10px',
                letterSpacing: '1px',
                padding: '7px 10px',
                cursor: 'pointer',
              }}
            >
              NEW
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={onGenerateQuest}
          style={{
            background: '#533483',
            border: 'none',
            borderRadius: '3px',
            color: '#fff',
            fontFamily: '"Courier New", monospace',
            fontSize: '11px',
            fontWeight: 'bold',
            letterSpacing: '2px',
            padding: '10px 14px',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          GET NEW QUEST
        </button>
      )}
    </div>
  );
}
