'use client';

import React, { useState, useEffect, useCallback } from "react";
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
          className={`relative w-full ${sizeClasses[size]} bg-card rounded-lg shadow-xl transition-all duration-200 ${
            entered
              ? "opacity-100 scale-100"
              : "opacity-0 scale-[0.97]"
          }`}
          style={{ transitionTimingFunction: entered ? 'cubic-bezier(0.16, 1, 0.3, 1)' : 'ease-in' }}
        >
          {title && (
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="text-lg font-semibold">{title}</h3>
              {showCloseButton && (
                <button
                  onClick={handleClose}
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
