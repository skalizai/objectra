"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

// No AnimatePresence/exit animation here on purpose — `mode="wait"` defers
// mounting the new page until the old one's exit animation finishes, and
// if that handoff is ever interrupted (e.g. a fast repeated navigation),
// the new content can be left mounted but stuck at its initial opacity: 0
// — present in the DOM, invisible, with nothing thrown to catch. A plain
// keyed enter-only fade has no exit phase to get stuck waiting on.
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
