'use client';

import React, { useState } from 'react';
import Header from './Header'; // ⬅️ default import
import { Sidebar } from './Sidebar';
import { MobileMenu } from './MobileMenu';
import { HelpPanel } from '@/components/help/HelpPanel';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [helpPanelOpen, setHelpPanelOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar - Desktop */}
      <Sidebar />

      {/* Mobile Menu */}
      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main Content */}
      <div className="md:pl-64">
        {/* Header */}
        <Header
          onMenuClick={() => setMobileMenuOpen(v => !v)}
          onHelpClick={() => setHelpPanelOpen(v => !v)}
        />

        {/* Page Content */}
        <main className="p-4 md:p-6 lg:p-8">{children}</main>
      </div>

      {/* Help Panel */}
      <HelpPanel isOpen={helpPanelOpen} onClose={() => setHelpPanelOpen(false)} />
    </div>
  );
}

export default MainLayout;
