'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';

// ─── Inline Autocomplete (used in table cells) ───

export function AutocompleteDropdown<T extends { clave: string }>({
  value,
  onSelect,
  onClose,
  searchFn,
  renderLabel,
  placeholder,
}: {
  value: string;
  onSelect: (item: T) => void;
  onClose: () => void;
  searchFn: (q: string) => Promise<T[]>;
  renderLabel: (item: T) => string;
  placeholder: string;
}) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchFn(query.trim());
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchFn]);

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Escape') onClose();
        }}
        placeholder={placeholder}
        className="w-full px-2 py-1 text-sm border border-green-500 rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30"
      />
      {(results.length > 0 || loading) && (
        <div className="absolute z-50 top-full left-0 mt-1 w-80 max-h-60 overflow-auto bg-card border border-border rounded-lg shadow-lg">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Buscando...
            </div>
          )}
          {results.map(item => (
            <button
              key={item.clave}
              onClick={() => onSelect(item)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors border-b border-border last:border-0"
            >
              <span className="font-mono font-medium text-green-600 dark:text-green-400">{item.clave}</span>
              <span className="ml-2 text-muted-foreground">{renderLabel(item)}</span>
            </button>
          ))}
          {!loading && results.length === 0 && query.trim().length >= 2 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Batch Autocomplete (used in modal) ───

export function BatchAutocomplete<T extends { clave: string }>({
  value,
  onChange,
  searchFn,
  renderLabel,
  placeholder,
}: {
  value: string;
  onChange: (clave: string) => void;
  searchFn: (q: string) => Promise<T[]>;
  renderLabel: (item: T) => string;
  placeholder: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchFn(query.trim());
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchFn]);

  return (
    <div className="mt-1">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
        />
      </div>
      {open && (results.length > 0 || loading) && (
        <div className="mt-1 max-h-40 overflow-auto bg-card border border-border rounded-lg shadow-sm">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Buscando...
            </div>
          )}
          {results.map(item => (
            <button
              key={item.clave}
              onClick={() => {
                onChange(item.clave);
                setQuery(renderLabel(item));
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors border-b border-border last:border-0 ${
                value === item.clave ? 'bg-green-50 dark:bg-green-900/20' : ''
              }`}
            >
              {renderLabel(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
