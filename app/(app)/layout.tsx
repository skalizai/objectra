import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/get-viewer";
import { getPicklists } from "@/lib/data/picklists";
import { AppShell } from "@/components/app-shell/shell";
import { PicklistProvider } from "@/components/providers/picklist-provider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();

  if (!viewer) {
    redirect("/sign-in");
  }

  const picklists = await getPicklists(viewer.profile.org_id);

  return (
    <PicklistProvider bundle={picklists}>
      <AppShell
        name={viewer.profile.full_name || viewer.user.email}
        email={viewer.user.email}
        role={viewer.role}
      >
        {children}
      </AppShell>
    </PicklistProvider>
  );
}
