'use client';

import React, { useState, useEffect, useCallback, useId, useRef } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  showCloseButton?: boolean;
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "2xl": "max-w-[min(85vw,1400px)]",
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
}) => {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync visibility with isOpen
  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      // Double rAF: first frame paints scale-97/opacity-0, second triggers transition
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true));
      });
      return () => cancelAnimationFrame(raf);
    } else if (visible) {
      // Parent closed — animate out then unmount
      setEntered(false);
      const timer = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setEntered(false);
    setTimeout(() => {
      setVisible(false);
      onClose();
    }, 200);
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") handleClose();
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "unset";
        document.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      document.body.style.overflow = "unset";
    }
  }, [visible, handleClose]);

  // Focus trap: cuando el panel se monta, mover foco al primer elemento
  // focuseable y prevenir Tab/Shift+Tab que salgan del dialog. Crítico
  // para a11y (B1 del UI/UX validator) — usuarios de teclado no deben
  // poder navegar al document subyacente mientras el modal está abierto.
  useEffect(() => {
    if (!visible) return;
    const panel = panelRef.current;
    if (!panel) return;

    const focusableSelector =
      'button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])';

    const getFocusable = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector));

    const focusable = getFocusable();
    focusable[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener('keydown', onKeyDown);
    return () => panel.removeEventListener('keydown', onKeyDown);
  }, [visible]);

  if (!visible || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Overlay */}
        <div
          className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${
            entered ? "opacity-100" : "opacity-0"
          }`}
          onClick={handleClose}
        />
        {/* Panel */}
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          className={`relative w-full ${sizeClasses[size]} bg-surface-4 rounded-xl shadow-elevation-3 transition-all duration-200 ${
            entered
              ? "opacity-100 scale-100"
              : "opacity-0 scale-[0.97]"
          }`}
          style={{ transitionTimingFunction: entered ? 'cubic-bezier(0.16, 1, 0.3, 1)' : 'ease-in' }}
        >
          {title && (
            <div className="flex items-center justify-between border-b p-4">
              <h3 id={titleId} className="text-lg font-semibold">{title}</h3>
              {showCloseButton && (
                <button
                  onClick={handleClose}
                  aria-label="Cerrar"
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>
          )}
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
