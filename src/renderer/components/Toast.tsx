import React from 'react';
import type { Toast as ToastType } from '../hooks/useGameState';

interface ToastContainerProps {
  toasts: ToastType[];
  onRemove: (id: number) => void;
}

const TOAST_ICONS: Record<ToastType['type'], string> = {
  score: '⭐',
  'level-up': '🎯',
  badge: '🏆',
  discovery: '🗺️',
};

const TOAST_CLASS: Record<ToastType['type'], string> = {
  score: 'toast',
  'level-up': 'toast level-up',
  badge: 'toast badge',
  discovery: 'toast discovery',
};

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '60px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={TOAST_CLASS[toast.type]}
          style={{ pointerEvents: 'auto' }}
          onClick={() => onRemove(toast.id)}
        >
          <span style={{ fontSize: '16px' }}>{TOAST_ICONS[toast.type]}</span>
          <span>{toast.text}</span>
        </div>
      ))}
    </div>
  );
}
