<<<<<<< HEAD
"use client";

import React, { useState } from 'react';
import { Header } from './Header';
=======
'use client';

import React, { useState } from 'react';
import Header from './Header'; // ⬅️ default import
>>>>>>> 546a62b15704338a97dfeae7a183d4184808c51e
import { Sidebar } from './Sidebar';
import { MobileMenu } from './MobileMenu';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar - Desktop */}
      <Sidebar />

      {/* Mobile Menu */}
<<<<<<< HEAD
      <MobileMenu 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
      />
=======
      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
>>>>>>> 546a62b15704338a97dfeae7a183d4184808c51e

      {/* Main Content */}
      <div className="md:pl-64">
        {/* Header */}
<<<<<<< HEAD
        <Header onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)} />

        {/* Page Content */}
        <main className="p-4 md:p-6 lg:p-8">
          {children}
        </main>
=======
        <Header onMenuClick={() => setMobileMenuOpen(v => !v)} />

        {/* Page Content */}
        <main className="p-4 md:p-6 lg:p-8">{children}</main>
>>>>>>> 546a62b15704338a97dfeae7a183d4184808c51e
      </div>
    </div>
  );
}

export default MainLayout;
