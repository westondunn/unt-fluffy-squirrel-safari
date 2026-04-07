import React, { useState, useRef, useEffect } from 'react';
import type { OllamaMessage } from '@shared/types';

interface ChatTabProps {
  messages: OllamaMessage[];
  loading: boolean;
  ollamaOnline: boolean;
  onSend: (text: string) => void;
  onClear: () => void;
}

export function ChatTab({ messages, loading, ollamaOnline, onSend, onClear }: ChatTabProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading || !ollamaOnline) return;
    setInput('');
    onSend(text);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Messages area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {messages.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '12px',
            color: '#555',
          }}>
            <span style={{ fontSize: '40px' }}>🐿️</span>
            <div style={{
              fontFamily: '"Courier New", monospace',
              fontSize: '12px',
              fontWeight: 'bold',
              letterSpacing: '3px',
              color: '#fdcb6e',
            }}>SQUIRREL SCOUT</div>
            <div style={{
              fontFamily: '"Courier New", monospace',
              fontSize: '11px',
              letterSpacing: '1px',
              color: '#666',
              textAlign: 'center',
              padding: '0 16px',
            }}>
              {ollamaOnline
                ? 'Ask me where to find squirrels!'
                : 'SCOUT OFFLINE — START OLLAMA TO CHAT'}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{
              fontFamily: '"Courier New", monospace',
              fontSize: '10px',
              fontWeight: 'bold',
              letterSpacing: '2px',
              color: msg.role === 'user' ? '#e94560' : '#fdcb6e',
            }}>
              {msg.role === 'user' ? 'YOU:' : 'SCOUT:'}
            </span>
            <div style={{
              fontFamily: '"Courier New", monospace',
              fontSize: '12px',
              lineHeight: '1.5',
              color: '#eee',
              background: msg.role === 'user' ? 'rgba(233,69,96,0.1)' : 'rgba(253,203,110,0.07)',
              border: `1px solid ${msg.role === 'user' ? 'rgba(233,69,96,0.3)' : 'rgba(253,203,110,0.2)'}`,
              borderRadius: '4px',
              padding: '8px 10px',
              wordBreak: 'break-word',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{
              fontFamily: '"Courier New", monospace',
              fontSize: '10px',
              fontWeight: 'bold',
              letterSpacing: '2px',
              color: '#fdcb6e',
            }}>SCOUT:</span>
            <div style={{
              fontFamily: '"Courier New", monospace',
              fontSize: '12px',
              color: '#fdcb6e',
              padding: '8px 10px',
              background: 'rgba(253,203,110,0.07)',
              border: '1px solid rgba(253,203,110,0.2)',
              borderRadius: '4px',
              animation: 'pulse 1.2s infinite',
            }}>
              THINKING...
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div style={{
        borderTop: '2px solid #1a1a2e',
        padding: '10px',
        display: 'flex',
        gap: '8px',
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={!ollamaOnline || loading}
          placeholder={ollamaOnline ? 'Ask the scout...' : 'Scout offline'}
          style={{
            flex: 1,
            background: '#0f3460',
            border: '1px solid #533483',
            borderRadius: '3px',
            color: '#eee',
            fontFamily: '"Courier New", monospace',
            fontSize: '12px',
            padding: '8px 10px',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!ollamaOnline || loading || !input.trim()}
          style={{
            background: ollamaOnline && !loading && input.trim() ? '#e94560' : '#333',
            border: 'none',
            borderRadius: '3px',
            color: '#fff',
            fontFamily: '"Courier New", monospace',
            fontSize: '11px',
            fontWeight: 'bold',
            letterSpacing: '1px',
            padding: '8px 12px',
            cursor: ollamaOnline && !loading && input.trim() ? 'pointer' : 'not-allowed',
            whiteSpace: 'nowrap',
          }}
        >
          SEND
        </button>
      </div>

      {/* Clear button */}
      {messages.length > 0 && (
        <div style={{ padding: '0 10px 8px', textAlign: 'right' }}>
          <button
            onClick={onClear}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#555',
              fontFamily: '"Courier New", monospace',
              fontSize: '10px',
              letterSpacing: '1px',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            CLEAR CHAT
          </button>
        </div>
      )}
    </div>
  );
}
