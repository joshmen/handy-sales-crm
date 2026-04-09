import React from 'react';
import { useTranslations } from 'next-intl';

interface InactiveToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  className?: string;
}

export const InactiveToggle: React.FC<InactiveToggleProps> = ({
  value,
  onChange,
  label,
  className,
}) => {
  const tc = useTranslations('common');
  const resolvedLabel = label || tc('showInactive');
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <span className="text-xs text-gray-600">{resolvedLabel}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 ${
          value ? 'bg-green-500' : 'bg-gray-300'
        }`}
        title={resolvedLabel}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ${
            value ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};
