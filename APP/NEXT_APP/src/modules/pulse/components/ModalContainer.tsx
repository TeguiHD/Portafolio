"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface ModalContainerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function ModalContainer({ open, title, onClose, children }: ModalContainerProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        aria-label="Cerrar Digital Pulse"
        className="absolute inset-0 bg-[#05070c]/80 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="absolute inset-x-0 bottom-0 top-16 mx-auto max-w-7xl px-4 pb-4 sm:top-20 sm:px-6">
        <div className="relative flex h-full flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#071019]/90 shadow-[0_45px_120px_-55px_rgba(0,0,0,1)] backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-300/70">Live module</p>
              <h2 className="text-lg font-semibold text-white sm:text-xl">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-6 sm:py-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
