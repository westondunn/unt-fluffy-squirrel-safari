import React from 'react';
import type { Quest } from '@shared/types';

interface QuestOverlayProps {
  quests: Quest[];
  onGenerateQuest: () => void;
  onCompleteQuest: (questId: number) => void;
}

export function QuestOverlay({ quests, onGenerateQuest, onCompleteQuest }: QuestOverlayProps) {
  const activeQuest = quests.find(q => q.status === 'active') || null;

  return (
    <div style={{
      position: 'absolute',
      bottom: '16px',
      left: '16px',
      background: '#F8B800',
      border: '4px solid #A87820',
      borderRadius: '2px',
      padding: '10px 14px',
      maxWidth: '300px',
      zIndex: 5,
      boxShadow: '3px 3px 0px #A87820, inset 2px 2px 0px rgba(255,255,255,0.3)',
      fontFamily: '"Courier New", monospace',
    }}>
      <div style={{
        fontSize: '9px',
        fontWeight: 'bold',
        letterSpacing: '3px',
        color: '#A87820',
        marginBottom: '6px',
      }}>
        🎯 ACTIVE QUEST
      </div>

      {activeQuest ? (
        <div>
          <div style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#38180C',
            marginBottom: '10px',
            lineHeight: '1.4',
          }}>
            {activeQuest.quest_type.replace(/_/g, ' ').toUpperCase()}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => onCompleteQuest(activeQuest.id)}
              style={{
                flex: 1,
                background: '#00A800',
                border: '3px solid #005800',
                borderRadius: '2px',
                color: '#FCF8FC',
                fontSize: '10px',
                fontWeight: 'bold',
                fontFamily: '"Courier New", monospace',
                letterSpacing: '1px',
                padding: '8px',
                cursor: 'pointer',
                boxShadow: '2px 2px 0px #005800',
              }}
            >
              ⭐ COMPLETE
            </button>
            <button
              onClick={onGenerateQuest}
              style={{
                background: '#C84C0C',
                border: '3px solid #8B3008',
                borderRadius: '2px',
                color: '#FCF8FC',
                fontSize: '10px',
                fontWeight: 'bold',
                fontFamily: '"Courier New", monospace',
                letterSpacing: '1px',
                padding: '8px 12px',
                cursor: 'pointer',
                boxShadow: '2px 2px 0px #8B3008',
              }}
            >
              SKIP
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={onGenerateQuest}
          style={{
            background: '#E40058',
            border: '3px solid #A80040',
            borderRadius: '2px',
            color: '#FCF8FC',
            fontSize: '11px',
            fontWeight: 'bold',
            fontFamily: '"Courier New", monospace',
            letterSpacing: '2px',
            padding: '10px 14px',
            cursor: 'pointer',
            width: '100%',
            boxShadow: '2px 2px 0px #A80040',
          }}
        >
          🎯 GET NEW QUEST
        </button>
      )}
    </div>
  );
}
