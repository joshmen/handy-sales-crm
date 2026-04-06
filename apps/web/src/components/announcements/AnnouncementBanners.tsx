'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  X,
  AlertTriangle,
  Info,
  Wrench,
  Megaphone,
  Radio,
  ShieldAlert,
} from 'lucide-react';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import type { AnnouncementBanner } from '@/services/api/announcements';
import { cn } from '@/lib/utils';

const EXIT_DURATION = 400; // must match banner-exit animation duration

/* ─── Visual config per tipo + prioridad ──────────────────────── */

interface BannerStyle {
  bg: string;
  border: string;
  icon: React.ReactNode;
  iconBg: string;
  accent: string;
  textColor: string;
  dismissHover: string;
  glow?: boolean;
  shimmer?: boolean;
}

function getBannerStyle(tipo: string, prioridad: string): BannerStyle {
  if (tipo === 'Maintenance') {
    return {
      bg: 'bg-amber-600 dark:bg-amber-700',
      border: 'border-amber-700',
      icon: <Wrench className="h-4 w-4" />,
      iconBg: 'bg-white/20 text-white',
      accent: 'bg-white/30',
      textColor: 'text-white',
      dismissHover: 'hover:bg-white/20',
      shimmer: false,
    };
  }

  if (prioridad === 'Critical') {
    return {
      bg: 'bg-red-600 dark:bg-red-700',
      border: 'border-red-700',
      icon: <ShieldAlert className="h-4 w-4" />,
      iconBg: 'bg-white/20 text-white',
      accent: 'bg-white/30',
      textColor: 'text-white',
      dismissHover: 'hover:bg-white/20',
      glow: false,
    };
  }

  if (prioridad === 'High') {
    return {
      bg: 'bg-orange-600 dark:bg-orange-700',
      border: 'border-orange-700',
      icon: <AlertTriangle className="h-4 w-4" />,
      iconBg: 'bg-white/20 text-white',
      accent: 'bg-white/30',
      textColor: 'text-white',
      dismissHover: 'hover:bg-white/20',
    };
  }

  if (tipo === 'Broadcast') {
    return {
      bg: 'bg-emerald-600 dark:bg-emerald-700',
      border: 'border-emerald-700',
      icon: <Megaphone className="h-4 w-4" />,
      iconBg: 'bg-white/20 text-white',
      accent: 'bg-white/30',
      textColor: 'text-white',
      dismissHover: 'hover:bg-white/20',
    };
  }

  return {
    bg: 'bg-blue-600 dark:bg-blue-700',
    border: 'border-blue-700',
    icon: <Info className="h-4 w-4" />,
    iconBg: 'bg-white/20 text-white',
    accent: 'bg-white/30',
    textColor: 'text-white',
    dismissHover: 'hover:bg-white/20',
  };
}

/* ─── Single banner row ───────────────────────────────────────── */

function BannerRow({
  banner,
  onDismiss,
  index,
  isExiting,
}: {
  banner: AnnouncementBanner;
  onDismiss: (id: number) => void;
  index: number;
  isExiting: boolean;
}) {
  const style = getBannerStyle(banner.tipo, banner.prioridad);

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        'border-b',
        style.border,
        style.bg,
        isExiting ? 'animate-banner-exit' : 'animate-banner-enter',
        style.glow && !isExiting && 'animate-banner-pulse-glow',
      )}
      style={{
        animationDelay: isExiting ? '0ms' : `${index * 120}ms`,
        animationFillMode: 'backwards',
      }}
    >
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', style.accent)} />

      {style.shimmer && !isExiting && (
        <div
          className="absolute inset-0 pointer-events-none animate-banner-shimmer opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(90deg, transparent 0%, rgba(251,191,36,0.15) 20%, rgba(251,191,36,0.25) 50%, rgba(251,191,36,0.15) 80%, transparent 100%)',
            backgroundSize: '200% 100%',
          }}
        />
      )}

      <div className="relative flex items-center gap-3 px-4 pl-5 py-2.5">
        <div
          className={cn(
            'flex-shrink-0 flex items-center justify-center',
            'h-7 w-7 rounded-lg',
            style.iconBg,
          )}
        >
          {style.icon}
        </div>

        <div className={cn('flex-1 min-w-0 flex items-baseline gap-2', style.textColor)}>
          <span className="font-semibold text-sm truncate">{banner.titulo}</span>
          {banner.mensaje !== banner.titulo && (
            <span className="hidden sm:inline text-sm opacity-80 truncate">
              — {banner.mensaje}
            </span>
          )}
        </div>

        {banner.tipo === 'Maintenance' && (
          <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-white/20 text-white border border-white/30">
            <Radio className="h-2.5 w-2.5 animate-pulse" />
            Mantenimiento
          </span>
        )}

        {banner.isDismissible && !isExiting && (
          <button
            onClick={() => onDismiss(banner.id)}
            className={cn(
              'flex-shrink-0 p-1.5 rounded-lg transition-all duration-200',
              'opacity-60 hover:opacity-100',
              style.dismissHover,
            )}
            aria-label="Cerrar anuncio"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Main export — handles enter/exit animations for all removal paths ── */

type DisplayBanner = AnnouncementBanner & { _exiting?: boolean };

export function AnnouncementBanners() {
  const { banners, dismiss } = useAnnouncements();
  const [displayList, setDisplayList] = useState<DisplayBanner[]>([]);
  const prevIdsRef = useRef<Set<number>>(new Set());

  // Sync hook banners → displayList with exit animations
  useEffect(() => {
    const currentIds = new Set(banners.map((b) => b.id));
    const prevIds = prevIdsRef.current;

    // IDs that disappeared from the hook → mark as exiting
    const removedIds = new Set<number>();
    prevIds.forEach((id) => {
      if (!currentIds.has(id)) removedIds.add(id);
    });

    prevIdsRef.current = currentIds;

    if (removedIds.size > 0) {
      setDisplayList((prev) => {
        // Mark removed ones as exiting
        const updated = prev.map((b) =>
          removedIds.has(b.id) ? { ...b, _exiting: true } : b
        );
        // Add any new banners from hook that aren't in display yet
        const displayIds = new Set(updated.map((b) => b.id));
        const newOnes = banners
          .filter((b) => !displayIds.has(b.id))
          .map((b) => ({ ...b, _exiting: false }));
        return [...newOnes, ...updated];
      });

      // After exit animation completes, remove them from display
      setTimeout(() => {
        setDisplayList((prev) => prev.filter((b) => !b._exiting));
      }, EXIT_DURATION);
    } else {
      // No removals — just sync (add new, keep existing)
      setDisplayList((prev) => {
        const displayIds = new Set(prev.map((b) => b.id));
        const newOnes = banners
          .filter((b) => !displayIds.has(b.id))
          .map((b) => ({ ...b, _exiting: false }));
        // Keep banners still in hook + preserve _exiting banners (let their timeout remove them)
        const kept = prev.filter((b) => b._exiting || currentIds.has(b.id));
        return [...newOnes, ...kept];
      });
    }
  }, [banners]);

  // Dismiss handler: trigger exit animation first, then call hook dismiss
  const handleDismiss = useCallback(
    (id: number) => {
      setDisplayList((prev) =>
        prev.map((b) => (b.id === id ? { ...b, _exiting: true } : b))
      );
      setTimeout(() => {
        dismiss(id);
        setDisplayList((prev) => prev.filter((b) => b.id !== id));
      }, EXIT_DURATION);
    },
    [dismiss]
  );

  if (displayList.length === 0) return null;

  return (
    <div className="relative z-10">
      {displayList.map((banner, i) => (
        <BannerRow
          key={banner.id}
          banner={banner}
          onDismiss={handleDismiss}
          index={i}
          isExiting={!!banner._exiting}
        />
      ))}
    </div>
  );
}
