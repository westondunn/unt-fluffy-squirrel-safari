import { useState, useCallback } from 'react';
import type { OllamaMessage } from '@shared/types';

interface OllamaState {
  messages: OllamaMessage[];
  loading: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
}

export function useOllama(): OllamaState {
  const [messages, setMessages] = useState<OllamaMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: OllamaMessage = { role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setLoading(true);
    try {
      const result = await window.api.ollamaChat(nextMessages);
      if (result.ok && result.response) {
        const assistantMsg: OllamaMessage = { role: 'assistant', content: result.response };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        const errMsg: OllamaMessage = {
          role: 'assistant',
          content: result.error || 'ERROR: COULD NOT CONNECT TO SCOUT',
        };
        setMessages(prev => [...prev, errMsg]);
      }
    } catch (err) {
      const errMsg: OllamaMessage = {
        role: 'assistant',
        content: 'ERROR: SCOUT UNAVAILABLE',
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }, [messages]);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, loading, sendMessage, clearChat };
}
