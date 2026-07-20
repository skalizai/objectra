"use client";

import { useRouter } from "next/navigation";
import { IconLogout } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className={cn(
        "flex items-center gap-2 rounded-control px-3 py-2 text-left text-sm text-text-2 hover:bg-surface-2 hover:text-text",
        className,
      )}
    >
      <IconLogout size={16} />
      Sign out
    </button>
  );
}
