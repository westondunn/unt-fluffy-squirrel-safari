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
  onFocusHotspot?: (hotspot: Hotspot) => void;
}

export function Sidebar({
  badges, hotspots, ollamaOnline,
  chatMessages, chatLoading, onSendChat, onClearChat, onFocusHotspot,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<Tab>('CHAT');

  const tabs: Tab[] = ['CHAT', 'GUIDE', 'BADGES'];
  const tabIcons: Record<Tab, string> = { CHAT: '💬', GUIDE: '📖', BADGES: '🏅' };

  return (
    <div style={{
      width: '300px',
      minWidth: '300px',
      background: '#E8A060',
      borderLeft: '4px solid #C84C0C',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Tab bar — brick style */}
      <div style={{
        display: 'flex',
        borderBottom: '4px solid #C84C0C',
        flexShrink: 0,
        background: '#000',
      }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '10px 4px',
              background: activeTab === tab ? '#E40058' : '#000',
              border: 'none',
              borderRight: tab !== 'BADGES' ? '2px solid #C84C0C' : 'none',
              color: activeTab === tab ? '#FCF8FC' : '#888',
              fontFamily: '"Courier New", monospace',
              fontSize: '10px',
              fontWeight: 'bold',
              letterSpacing: '2px',
              cursor: 'pointer',
            }}
          >
            {tabIcons[tab]} {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden', background: 'rgba(56,24,12,0.88)' }}>
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
          <FieldGuideTab hotspots={hotspots} onFocusHotspot={onFocusHotspot} />
        )}
        {activeTab === 'BADGES' && (
          <BadgesTab badges={badges} />
        )}
      </div>
    </div>
  );
}
