"use client";

import { type ReactNode, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconX } from "@tabler/icons-react";

export function Drawer({
  open,
  onClose,
  title,
  children,
  width = 440,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ x: width }}
            animate={{ x: 0 }}
            exit={{ x: width }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="fixed inset-y-0 right-0 z-50 flex flex-col border-l border-border bg-surface"
            style={{ width, maxWidth: "100vw", boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-display text-base font-semibold">{title}</h2>
              <button
                onClick={onClose}
                className="rounded-control p-1.5 text-text-2 hover:bg-surface-2 hover:text-text"
                aria-label="Close"
              >
                <IconX size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
