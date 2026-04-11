'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  iconColor?: string;
  dataTour?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder,
  className = 'w-64',
  iconColor = 'text-blue-400',
  dataTour,
}) => {
  const tc = useTranslations('common');
  return (
    <div className={`relative ${className}`} data-tour={dataTour}>
      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${iconColor}`} />
      <input
        type="text"
        placeholder={placeholder ?? tc('searchEllipsis')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-9 pr-3 py-2 text-xs border border-border-subtle rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
      />
    </div>
  );
};
