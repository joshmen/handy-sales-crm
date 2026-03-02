'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RocketLaunch } from '@phosphor-icons/react';
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
  const pathname = usePathname();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('onboarding-completed') === 'true';
    setShowOnboarding(!dismissed);
    const onComplete = () => setShowOnboarding(false);
    window.addEventListener('onboarding-completed', onComplete);
    return () => window.removeEventListener('onboarding-completed', onComplete);
  }, []);

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

      {/* Floating onboarding button — right side, above TourPrompt */}
      {showOnboarding && pathname !== '/getting-started' && (
        <Link
          href="/getting-started"
          className="fixed bottom-24 right-6 z-40 flex items-center gap-2 px-5 py-3 rounded-full shadow-xl text-white font-medium transition-all hover:scale-105 hover:shadow-2xl active:scale-95 animate-bounce-once"
          style={{ background: 'linear-gradient(135deg, #FB7185, #E11D48)' }}
          title="Primeros Pasos"
        >
          <RocketLaunch size={20} weight="fill" />
          <span className="text-sm">Primeros Pasos</span>
        </Link>
      )}
    </div>
  );
};
