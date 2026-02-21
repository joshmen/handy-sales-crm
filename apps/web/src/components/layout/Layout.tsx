'use client';
import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { HelpPanel } from '@/components/help/HelpPanel';
import { TourPrompt } from '@/components/help/TourPrompt';
import { ImpersonationBanner } from '@/components/impersonation';
import { AnnouncementBanners } from '@/components/announcements/AnnouncementBanners';
import { ExpirationBanner } from '@/components/subscription/ExpirationBanner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useSidebar } from '@/stores/useUIStore';
import { useImpersonationStore } from '@/stores/useImpersonationStore';
import { cn } from '@/lib/utils';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { open, collapsed, setCollapsed, setOpen } = useSidebar();
  const [helpPanelOpen, setHelpPanelOpen] = useState(false);
  const { isImpersonating } = useImpersonationStore();

  // Colapsa según breakpoint SOLO en mount y en cambios del media query
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const apply = () => {
      setCollapsed(!mq.matches); // <lg => collapsed=true
      setOpen(mq.matches); // ≥lg => sidebar abierto, <lg => cerrado
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [setCollapsed, setOpen]); // <- no depende de `collapsed`/`open`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner de impersonación (arriba del header) */}
      {isImpersonating && <ImpersonationBanner />}

      <Header
        onHelpClick={() => setHelpPanelOpen(v => !v)}
        isImpersonating={isImpersonating}
      />
      <div className="flex">
        <Sidebar isImpersonating={isImpersonating} />
        <main
          className={cn(
            'flex-1 transition-[margin-left] duration-300 ease-in-out',
            // pt y min-h ajustados cuando el banner está activo (+2.5rem = 40px)
            isImpersonating
              ? 'min-h-[calc(100vh-4rem-2.5rem)] pt-[calc(4rem+2.5rem)]'
              : 'min-h-[calc(100vh-4rem)] pt-16',
            // En móvil SIEMPRE sin margen
            'ml-0',
            // En desktop: si el sidebar está abierto, aplica margen según colapsado
            open ? (collapsed ? 'lg:ml-20' : 'lg:ml-72') : 'ml-0'
          )}
        >
          <ExpirationBanner />
          <AnnouncementBanners />
          <ErrorBoundary>
            <div className="p-4 sm:p-6 lg:p-8 w-full min-w-0">
              {children}
            </div>
          </ErrorBoundary>
        </main>
      </div>
      <HelpPanel isOpen={helpPanelOpen} onClose={() => setHelpPanelOpen(false)} />
      <TourPrompt />
    </div>
  );
};
