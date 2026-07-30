"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

const LINKS = [
  { href: "#platform", label: "Platform" },
  { href: "#resources", label: "Resources" },
  { href: "#architecture", label: "Architecture" },
  { href: "#pricing", label: "Pricing" },
];

export function LandingNav() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-40 border-b border-border bg-page/80 backdrop-blur"
    >
      <nav className="mx-auto flex h-16 max-w-[1220px] items-center justify-between px-6">
        <Link href="/" className="flex items-center">
          <Logo height={28} />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-text-2 transition-colors hover:text-text"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="text-sm text-text-2 transition-colors hover:text-text">
            Sign in
          </Link>
          <Link href="/sign-in">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </nav>
    </motion.header>
  );
}
