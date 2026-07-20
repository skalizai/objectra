import type { Metadata } from "next";
import { getViewer } from "@/lib/auth/get-viewer";
import { isProjectEditorRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { listProjects } from "@/lib/data/projects";
import { getPicklists } from "@/lib/data/picklists";
import { listOrgMembersWithMemberships } from "@/lib/data/members";
import { ProjectPicker } from "@/components/settings/project-picker";
import { NotificationSettingsForm } from "@/components/settings/notification-settings-form";
import { OrgProfileForm } from "@/components/settings/org-profile-form";
import { MemberManagement } from "@/components/settings/member-management";
import { PicklistManager } from "@/components/settings/picklist-manager";
import { MyProfileForm } from "@/components/settings/my-profile-form";
import type { NotificationSettings } from "@/lib/types/database";
import type { MemberWithMemberships } from "@/lib/data/members";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const [viewer, { project: projectParam }] = await Promise.all([getViewer(), searchParams]);
  if (!viewer) return null;

  const allProjects = await listProjects();
  const manageableProjects =
    viewer.role === "org_admin"
      ? allProjects
      : allProjects.filter((p) => isProjectEditorRole(viewer.projectRoles[p.id]));

  const selectedProjectId = projectParam ?? manageableProjects[0]?.id;
  const supabase = await createClient();

  let settings: NotificationSettings | null = null;
  if (selectedProjectId) {
    const { data } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("project_id", selectedProjectId)
      .maybeSingle();
    settings = data;
  }

  let orgMembers: MemberWithMemberships[] = [];
  let orgName = "";
  let picklists: Awaited<ReturnType<typeof getPicklists>> | null = null;
  if (viewer.role === "org_admin") {
    const [members, { data: org }, picklistBundle] = await Promise.all([
      listOrgMembersWithMemberships(viewer.profile.org_id),
      supabase.from("organizations").select("name").eq("id", viewer.profile.org_id).single(),
      getPicklists(viewer.profile.org_id),
    ]);
    orgMembers = members;
    orgName = org?.name ?? "";
    picklists = picklistBundle;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-text-2">Notification schedules, organisation profile, and members.</p>
      </div>

      <MyProfileForm fullName={viewer.profile.full_name} />

      {manageableProjects.length > 0 && selectedProjectId && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium text-text-2">Project</h2>
            <ProjectPicker
              projects={manageableProjects.map((p) => ({ id: p.id, name: p.name }))}
              selectedId={selectedProjectId}
            />
          </div>
          {settings && <NotificationSettingsForm projectId={selectedProjectId} settings={settings} />}
        </div>
      )}

      {viewer.role === "org_admin" && picklists && (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            <PicklistManager
              type="module"
              title="Modules"
              description="Available modules for the object register and resource areas (e.g. MM, SD, OTC)."
              items={picklists.modules}
            />
            <PicklistManager
              type="complexity"
              title="Complexity"
              description="Complexity levels available on objects."
              items={picklists.complexities}
            />
          </div>
          <PicklistManager
            type="status"
            title="Object statuses"
            description="The status pipeline for objects — set a colour and mark the one(s) that count as complete for progress tracking."
            items={picklists.statuses}
            supportsColorAndDone
          />
          <OrgProfileForm orgName={orgName} />
          <MemberManagement members={orgMembers} />
        </>
      )}
    </div>
  );
}
