'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { impersonationService } from '@/services/api/impersonation';
import { cn } from '@/lib/utils';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { open, collapsed, setCollapsed, setOpen } = useSidebar();
  const [helpPanelOpen, setHelpPanelOpen] = useState(false);
  const { isImpersonating, setFromState } = useImpersonationStore();
  const router = useRouter();
  const { data: session } = useSession();
  const [tourActive, setTourActive] = useState(false);

  // Hidrata el store de impersonación desde el backend si la sesión JWT indica
  // que hay impersonación activa pero el store está vacío (p.ej. tras hard reload
  // que hace el ImpersonationModal). Sin esto el Sidebar/Banner no detectan la
  // impersonación y el usuario ve el menú de SUPER_ADMIN en vez del tenant.
  useEffect(() => {
    if (session?.isImpersonating && !isImpersonating) {
      impersonationService.getCurrentState()
        .then((state) => {
          if (state?.isImpersonating && state.tenant && state.sessionId) {
            setFromState(state);
          }
        })
        .catch(() => { /* token inválido, otros efectos lo manejan */ });
    }
  }, [session?.isImpersonating, isImpersonating, setFromState]);

  // Redirect to onboarding if not completed (skip for SuperAdmin and impersonation)
  useEffect(() => {
    if (
      session &&
      session.onboardingCompleted === false &&
      !session.isImpersonating &&
      session.user?.role !== 'SUPER_ADMIN'
    ) {
      // Skip redirect if user just completed onboarding (session cache may be stale)
      // Don't remove the flag — effect may re-run before session refreshes
      if (sessionStorage.getItem('onboarding-completed')) {
        return;
      }
      router.replace('/onboarding');
    }
    // Once session confirms onboarding is done, clean up the flag
    if (session?.onboardingCompleted === true) {
      sessionStorage.removeItem('onboarding-completed');
    }
  }, [session, router]);

  // Hide floating widgets while a tour is running
  useEffect(() => {
    const onActive = () => setTourActive(true);
    const onInactive = () => setTourActive(false);
    window.addEventListener('tour-active', onActive);
    window.addEventListener('tour-inactive', onInactive);
    return () => {
      window.removeEventListener('tour-active', onActive);
      window.removeEventListener('tour-inactive', onInactive);
    };
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
  }, [setCollapsed, setOpen]);

  return (
    <div className="min-h-screen bg-background" data-dashboard>
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
            isImpersonating
              ? 'min-h-[calc(100vh-4rem-2.5rem)] pt-[calc(4rem+2.5rem)]'
              : 'min-h-[calc(100vh-4rem)] pt-16',
            'ml-0',
            open ? (collapsed ? 'lg:ml-20' : 'lg:ml-72') : 'ml-0'
          )}
        >
          <ExpirationBanner />
          <AnnouncementBanners />
          <ErrorBoundary>
            <div className="p-4 sm:p-6 lg:p-8 w-full min-w-0 max-w-page mx-auto">
              {children}
            </div>
          </ErrorBoundary>
        </main>
      </div>
      <HelpPanel isOpen={helpPanelOpen} onClose={() => setHelpPanelOpen(false)} />
      <div className={tourActive ? 'hidden' : ''}>
        <TourPrompt />
      </div>
    </div>
  );
};
