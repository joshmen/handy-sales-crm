'use client';
import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { HelpPanel } from '@/components/help/HelpPanel';
import { TourPrompt } from '@/components/help/TourPrompt';
import { useSidebar } from '@/stores/useUIStore';
import { cn } from '@/lib/utils';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { open, collapsed, setCollapsed, setOpen } = useSidebar();
  const pathname = usePathname();
  const [helpPanelOpen, setHelpPanelOpen] = useState(false);

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
      {/* Modern Google-style layout */}
      <Header onHelpClick={() => setHelpPanelOpen(v => !v)} />
      <div className="flex">
        <Sidebar />
        <main
          className={cn(
            'flex-1 transition-all duration-300 ease-in-out',
            'min-h-[calc(100vh-4rem)] pt-16', // pt-16 para el header fijo
            // En móvil SIEMPRE sin margen
            'ml-0',
            // En desktop: si el sidebar está abierto, aplica margen según colapsado
            open ? (collapsed ? 'lg:ml-20' : 'lg:ml-72') : 'ml-0'
          )}
        >
          <div className="p-4 sm:p-6 lg:p-8 w-full min-w-0">
            {children}
          </div>
        </main>
      </div>
      <HelpPanel isOpen={helpPanelOpen} onClose={() => setHelpPanelOpen(false)} />
      <TourPrompt />
    </div>
  );
};
