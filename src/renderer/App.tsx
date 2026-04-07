import React, { useState, useRef } from 'react';
import { useGameState } from './hooks/useGameState';
import { useOllama } from './hooks/useOllama';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { MapView, type MapViewHandle } from './components/MapView';
import type { Hotspot } from '@shared/types';
import { QuestOverlay } from './components/QuestOverlay';
import { SightingModal } from './components/SightingModal';
import { ToastContainer } from './components/Toast';

export default function App() {
  const { player, badges, hotspots, quests, ollamaOnline, toasts, refresh, processEvents, removeToast } = useGameState();
  const { messages: chatMessages, loading: chatLoading, sendMessage, clearChat } = useOllama();
  const [sightingModalOpen, setSightingModalOpen] = useState(false);
  const mapRef = useRef<MapViewHandle>(null);

  const handleFocusHotspot = (hotspot: Hotspot) => {
    mapRef.current?.flyTo(hotspot.lat, hotspot.lon, 17);
  };

  const handleDiscoverZone = async (hotspotId: number) => {
    try {
      const events = await window.api.discoverZone(hotspotId);
      await processEvents(events);
    } catch (err) {
      console.error('Failed to discover zone:', err);
    }
  };

  const handleLogSighting = async (hotspotId: number | null, notes: string) => {
    try {
      // Get current map center (best approximation for lat/lon without GPS)
      const events = await window.api.logSighting({
        tree_id: null,
        hotspot_id: hotspotId,
        lat: 33.2100,
        lon: -97.1525,
        photo_path: null,
        notes,
        timestamp: new Date().toISOString(),
      });
      await processEvents(events);
      setSightingModalOpen(false);
    } catch (err) {
      console.error('Failed to log sighting:', err);
    }
  };

  const handleGenerateQuest = async () => {
    try {
      const result = await window.api.ollamaGenerateQuest();
      if (result.ok) {
        await refresh();
      }
    } catch (err) {
      console.error('Failed to generate quest:', err);
    }
  };

  const handleCompleteQuest = async (questId: number) => {
    try {
      const events = await window.api.completeQuest(questId);
      await processEvents(events);
    } catch (err) {
      console.error('Failed to complete quest:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top bar */}
      <TopBar player={player} badges={badges} ollamaOnline={ollamaOnline} />

      {/* Main content */}
      <main style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Map area */}
        <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
          <MapView ref={mapRef} hotspots={hotspots} onDiscoverZone={handleDiscoverZone} />

          {/* Quest overlay — bottom left */}
          <QuestOverlay
            quests={quests}
            onGenerateQuest={handleGenerateQuest}
            onCompleteQuest={handleCompleteQuest}
          />

          {/* Log Sighting button — bottom right */}
          <button
            onClick={() => setSightingModalOpen(true)}
            style={{
              position: 'absolute',
              bottom: '16px',
              right: '16px',
              background: '#E40058',
              border: '3px solid #A80040',
              borderRadius: '2px',
              color: '#FCF8FC',
              fontFamily: '"Courier New", monospace',
              fontSize: '12px',
              fontWeight: 'bold',
              letterSpacing: '2px',
              padding: '12px 18px',
              cursor: 'pointer',
              zIndex: 5,
              boxShadow: '3px 3px 0px #A80040',
            }}
          >
            🐿️ LOG SIGHTING
          </button>
        </div>

        {/* Sidebar */}
        <Sidebar
          badges={badges}
          hotspots={hotspots}
          ollamaOnline={ollamaOnline}
          chatMessages={chatMessages}
          chatLoading={chatLoading}
          onSendChat={sendMessage}
          onClearChat={clearChat}
          onFocusHotspot={handleFocusHotspot}
        />
      </main>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Sighting modal */}
      {sightingModalOpen && (
        <SightingModal
          hotspots={hotspots}
          onSubmit={handleLogSighting}
          onCancel={() => setSightingModalOpen(false)}
        />
      )}
    </div>
  );
}
