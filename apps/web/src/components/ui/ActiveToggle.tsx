import React from 'react';
import { Check, X } from 'lucide-react';

interface ActiveToggleProps {
  isActive: boolean;
  onToggle: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  title?: string;
}

export const ActiveToggle: React.FC<ActiveToggleProps> = ({
  isActive,
  onToggle,
  disabled = false,
  isLoading = false,
  title,
}) => {
  return (
    <button
      onClick={onToggle}
      disabled={disabled || isLoading}
      className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
        isActive ? 'bg-green-500' : 'bg-gray-300'
      } ${isLoading ? 'opacity-50' : ''}`}
      title={title ?? (isActive ? 'Desactivar' : 'Activar')}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 flex items-center justify-center ${
          isActive ? 'translate-x-4' : 'translate-x-0'
        }`}
      >
        {isActive ? (
          <Check className="w-2.5 h-2.5 text-green-600" />
        ) : (
          <X className="w-2.5 h-2.5 text-gray-400" />
        )}
      </span>
    </button>
  );
};
