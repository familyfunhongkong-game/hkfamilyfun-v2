'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose?: () => void;
}

const typeStyles = {
  success: 'bg-success text-white',
  error: 'bg-danger text-white',
  info: 'bg-secondary-600 text-white',
};

export default function Toast({
  message,
  type = 'info',
  duration = 5000,
  onClose,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className={`
        fixed bottom-4 right-4 flex items-center space-x-3 px-6 py-4 rounded-lg shadow-lg
        animate-slide-in-up
        ${typeStyles[type]}
      `}
    >
      <span className="font-medium">{message}</span>
      <button
        onClick={() => setIsVisible(false)}
        className="flex-shrink-0 hover:opacity-80 transition"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
