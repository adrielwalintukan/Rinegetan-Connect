"use client";

import React, { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { MODAL_BACKDROP } from "./modal";

export interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
  labelledBy?: string;
  label?: string;
}

const emptySubscribe = () => () => {};

/**
 * Reusable full-screen modal portal with consistent edge-to-edge backdrop blur.
 * Uses createPortal to ensure the backdrop sits above all page elements (including headers and navigations).
 */
export function Modal({
  isOpen,
  onClose,
  children,
  className = "",
  labelledBy,
  label,
}: ModalProps) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onClose) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isClient || !isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current && onClose) {
      onClose();
    }
  };

  return createPortal(
    <div
      ref={backdropRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-label={label}
      onClick={handleBackdropClick}
      className={`${MODAL_BACKDROP} ${className}`}
    >
      {children}
    </div>,
    document.body
  );
}
