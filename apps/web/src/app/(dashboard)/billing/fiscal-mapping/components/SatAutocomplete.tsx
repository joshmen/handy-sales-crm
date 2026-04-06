'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const listboxId = useRef(`sat-listbox-${Math.random().toString(36).slice(2, 8)}`).current;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset active index when results change
  useEffect(() => { setActiveIndex(-1); }, [results]);

  // Position dropdown relative to input
  const updatePosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 320) });
    }
  }, []);

  useEffect(() => {
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    return () => window.removeEventListener('scroll', updatePosition, true);
  }, [updatePosition]);

  // Close on click outside — use pointerdown with small delay so item click fires first
  useEffect(() => {
    function handleClickOutside(e: PointerEvent) {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target) &&
          dropdownRef.current && !dropdownRef.current.contains(target)) {
        // Delay to let item onClick fire first
        setTimeout(() => onClose(), 50);
      }
    }
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
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

  const showDropdown = results.length > 0 || loading || (!loading && results.length === 0 && query.trim().length >= 2);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, results.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    }
    if (e.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
      e.preventDefault();
      onSelect(results[activeIndex]);
    }
  };

  return (
    <div ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={showDropdown}
        aria-haspopup="listbox"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-2 py-1 text-sm border border-green-500 rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30"
      />
      {showDropdown && dropdownPos && createPortal(
        <div
          ref={dropdownRef}
          id={listboxId}
          role="listbox"
          aria-label="Resultados SAT"
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
          className="max-h-60 overflow-auto bg-card border border-border rounded-lg shadow-lg"
        >
          {loading && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              Buscando...
            </div>
          )}
          {results.map((item, i) => (
            <button
              key={item.clave}
              id={`${listboxId}-opt-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              tabIndex={-1}
              onClick={() => onSelect(item)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors border-b border-border last:border-0 ${
                i === activeIndex ? 'bg-muted' : 'hover:bg-muted/50'
              }`}
            >
              <span className="font-mono font-medium text-green-600 dark:text-green-400">{item.clave}</span>
              <span className="ml-2 text-muted-foreground">{renderLabel(item)}</span>
            </button>
          ))}
          {!loading && results.length === 0 && query.trim().length >= 2 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">Sin resultados para &quot;{query}&quot;</div>
          )}
        </div>,
        document.body
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
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxId = useRef(`batch-listbox-${Math.random().toString(36).slice(2, 8)}`).current;

  // Reset active index when results change
  useEffect(() => { setActiveIndex(-1); }, [results]);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, results.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    }
    if (e.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
      e.preventDefault();
      onChange(results[activeIndex].clave);
      setQuery(renderLabel(results[activeIndex]));
      setOpen(false);
    }
  };

  const showDropdown = open && (results.length > 0 || loading);

  return (
    <div className="mt-1">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
        <input
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
        />
      </div>
      {showDropdown && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Resultados SAT"
          className="mt-1 max-h-40 overflow-auto bg-card border border-border rounded-lg shadow-sm"
        >
          {loading && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
              Buscando...
            </div>
          )}
          {results.map((item, i) => (
            <button
              key={item.clave}
              id={`${listboxId}-opt-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              tabIndex={-1}
              onMouseDown={e => e.preventDefault()}
              onClick={() => {
                onChange(item.clave);
                setQuery(renderLabel(item));
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors border-b border-border last:border-0 ${
                i === activeIndex ? 'bg-muted' : value === item.clave ? 'bg-green-50 dark:bg-green-900/20' : 'hover:bg-muted/50'
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
