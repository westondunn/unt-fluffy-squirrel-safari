import React, { useState } from 'react';
import type { Hotspot } from '@shared/types';

interface SightingModalProps {
  hotspots: Hotspot[];
  onSubmit: (hotspotId: number | null, notes: string) => void;
  onCancel: () => void;
}

export function SightingModal({ hotspots, onSubmit, onCancel }: SightingModalProps) {
  const [selectedHotspotId, setSelectedHotspotId] = useState<number | null>(
    hotspots.length > 0 ? hotspots[0].id : null,
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(selectedHotspotId, notes);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 10, 20, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          background: '#16213e',
          border: '2px solid #e94560',
          borderRadius: '8px',
          padding: '24px',
          width: '360px',
          maxWidth: '90vw',
          boxShadow: '0 8px 40px rgba(233,69,96,0.3)',
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: '"Courier New", monospace',
            fontSize: '16px',
            fontWeight: 'bold',
            letterSpacing: '3px',
            color: '#e94560',
            marginBottom: '20px',
            textAlign: 'center',
          }}
        >
          🐿️ LOG SIGHTING
        </div>

        {/* Location dropdown */}
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              fontFamily: '"Courier New", monospace',
              fontSize: '10px',
              fontWeight: 'bold',
              letterSpacing: '2px',
              color: '#fdcb6e',
              marginBottom: '6px',
            }}
          >
            LOCATION
          </label>
          <select
            value={selectedHotspotId ?? ''}
            onChange={(e) => setSelectedHotspotId(e.target.value ? Number(e.target.value) : null)}
            style={{
              width: '100%',
              background: '#0f3460',
              border: '1px solid #533483',
              borderRadius: '3px',
              color: '#eee',
              fontFamily: '"Courier New", monospace',
              fontSize: '12px',
              padding: '8px 10px',
              outline: 'none',
            }}
          >
            <option value="">-- NO SPECIFIC ZONE --</option>
            {hotspots.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>

        {/* Notes textarea */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              fontFamily: '"Courier New", monospace',
              fontSize: '10px',
              fontWeight: 'bold',
              letterSpacing: '2px',
              color: '#fdcb6e',
              marginBottom: '6px',
            }}
          >
            NOTES (OPTIONAL)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe the sighting..."
            rows={3}
            style={{
              width: '100%',
              background: '#0f3460',
              border: '1px solid #533483',
              borderRadius: '3px',
              color: '#eee',
              fontFamily: '"Courier New", monospace',
              fontSize: '12px',
              padding: '8px 10px',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              background: 'transparent',
              border: '1px solid #533483',
              borderRadius: '3px',
              color: '#888',
              fontFamily: '"Courier New", monospace',
              fontSize: '11px',
              fontWeight: 'bold',
              letterSpacing: '1px',
              padding: '12px',
              cursor: 'pointer',
            }}
          >
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              flex: 2,
              background: submitting ? '#555' : '#e94560',
              border: 'none',
              borderRadius: '3px',
              color: '#fff',
              fontFamily: '"Courier New", monospace',
              fontSize: '11px',
              fontWeight: 'bold',
              letterSpacing: '2px',
              padding: '12px',
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'LOGGING...' : '+50 PTS — LOG IT'}
          </button>
        </div>
      </div>
    </div>
  );
}
