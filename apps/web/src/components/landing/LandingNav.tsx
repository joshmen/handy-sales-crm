'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { href: '#caracteristicas', label: 'Características' },
    { href: '#precios', label: 'Precios' },
    { href: '#clientes', label: 'Clientes' },
  ];

  return (
    <nav
      aria-label="Navegación principal"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-border-subtle'
          : 'bg-white/80 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo-icon.svg" alt="Handy Suites" width={32} height={32} />
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-foreground tracking-tight">Handy</span>
            <span className="text-lg font-normal text-muted-foreground tracking-tight">
              Suites<sup className="text-[9px] text-muted-foreground">®</sup>
            </span>
          </div>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-foreground/70 hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors"
          >
            Crear cuenta
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-foreground/70 hover:text-foreground"
          aria-label="Menú"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-border-subtle px-6 py-4 space-y-3">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block text-sm text-foreground/70 hover:text-foreground py-2"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-3 border-t border-border-subtle space-y-2">
            <Link
              href="/login"
              className="block text-sm text-foreground/80 hover:text-foreground py-2"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="block text-center text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-lg transition-colors"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
