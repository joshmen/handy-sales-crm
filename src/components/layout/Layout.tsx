'use client';
import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useSidebar } from '@/stores/useUIStore';
import { cn } from '@/lib/utils';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { open, collapsed, setCollapsed, setOpen } = useSidebar();
  const pathname = usePathname();

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
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div
        className={cn(
          'transition-[margin] duration-300 min-h-[100vh]',
          collapsed ? 'ml-16' : 'ml-64',
          !open && 'ml-0'
        )}
      >
        <Header />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      </div>
    </div>
  );
};
