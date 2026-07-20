import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export function LandingFooter() {
  return (
    <footer className="border-t border-border px-6 py-10">
      <div className="mx-auto flex max-w-[1220px] flex-col items-center justify-between gap-4 text-sm text-text-3 sm:flex-row">
        <div className="flex items-center gap-3">
          <Logo height={20} />
          <span>© {new Date().getFullYear()} Objectra Labs. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/sign-in" className="transition-colors hover:text-text-2">
            Sign in
          </Link>
          <a href="#platform" className="transition-colors hover:text-text-2">
            Platform
          </a>
          <a href="#pricing" className="transition-colors hover:text-text-2">
            Pricing
          </a>
        </div>
      </div>
    </footer>
  );
}
