import { useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({
  message,
  type = 'success',
  visible,
  onClose,
  duration = 2000,
}: ToastProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose, duration]);

  if (!visible) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] animate-slide-down">
      <div
        className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          type === 'success'
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'
        }`}
      >
        {type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
        {message}
      </div>
    </div>
  );
}
