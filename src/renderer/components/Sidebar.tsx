import React, { useState } from 'react';
import type { Badge, Hotspot } from '@shared/types';
import type { OllamaMessage } from '@shared/types';
import { ChatTab } from './ChatTab';
import { FieldGuideTab } from './FieldGuideTab';
import { BadgesTab } from './BadgesTab';

type Tab = 'CHAT' | 'GUIDE' | 'BADGES';

interface SidebarProps {
  badges: Badge[];
  hotspots: Hotspot[];
  ollamaOnline: boolean;
  chatMessages: OllamaMessage[];
  chatLoading: boolean;
  onSendChat: (text: string) => void;
  onClearChat: () => void;
}

export function Sidebar({
  badges, hotspots, ollamaOnline,
  chatMessages, chatLoading, onSendChat, onClearChat,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<Tab>('CHAT');

  const tabs: Tab[] = ['CHAT', 'GUIDE', 'BADGES'];

  return (
    <div style={{
      width: '300px',
      minWidth: '300px',
      background: '#16213e',
      borderLeft: '2px solid #e94560',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid #1a1a2e',
        flexShrink: 0,
      }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '10px 4px',
              background: activeTab === tab ? '#e94560' : 'transparent',
              border: 'none',
              borderRight: tab !== 'BADGES' ? '1px solid #1a1a2e' : 'none',
              color: activeTab === tab ? '#fff' : '#888',
              fontFamily: '"Courier New", monospace',
              fontSize: '10px',
              fontWeight: 'bold',
              letterSpacing: '2px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'CHAT' && (
          <ChatTab
            messages={chatMessages}
            loading={chatLoading}
            ollamaOnline={ollamaOnline}
            onSend={onSendChat}
            onClear={onClearChat}
          />
        )}
        {activeTab === 'GUIDE' && (
          <FieldGuideTab hotspots={hotspots} />
        )}
        {activeTab === 'BADGES' && (
          <BadgesTab badges={badges} />
        )}
      </div>
    </div>
  );
}
