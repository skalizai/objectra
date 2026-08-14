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
import { ProjectPhaseToggle } from "@/components/settings/project-phase-toggle";
import { SupportRoutingForm } from "@/components/settings/support-routing-form";
import { SlaPolicyForm } from "@/components/settings/sla-policy-form";
import { getSupportRouting, getSlaPolicies } from "@/lib/data/support";
import type { NotificationSettings, Project } from "@/lib/types/database";
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
  let selectedProject: Project | null = null;
  let supportRouting: Awaited<ReturnType<typeof getSupportRouting>> = [];
  let slaPolicies: Awaited<ReturnType<typeof getSlaPolicies>> = [];
  let consultantOptions: { id: string; full_name: string; primary_module: string | null }[] = [];
  let uninvitedTaggedResources: { full_name: string; primary_module: string | null }[] = [];
  if (selectedProjectId) {
    const [{ data }, { data: projectRow }, routing, policies, { data: memberRows }, { data: uninvitedRows }] =
      await Promise.all([
        supabase.from("notification_settings").select("*").eq("project_id", selectedProjectId).maybeSingle(),
        supabase.from("projects").select("*").eq("id", selectedProjectId).maybeSingle(),
        getSupportRouting(selectedProjectId),
        getSlaPolicies(selectedProjectId),
        supabase
          .from("project_members")
          .select("profile:profiles(id, full_name)")
          .eq("project_id", selectedProjectId)
          .eq("is_active", true)
          .in("role", ["member", "technical_lead", "project_manager"]),
        // Tagged with a module in Resources but never invited (no login),
        // so they can't be a routing consultant yet — support_routing
        // references profiles, not the roster. Surfaced as a hint below
        // rather than silently omitted.
        supabase
          .from("resources")
          .select("full_name, primary_module")
          .eq("org_id", viewer.profile.org_id)
          .eq("invite_status", "not_invited")
          .not("primary_module", "is", null),
      ]);
    settings = data;
    selectedProject = projectRow;
    supportRouting = routing;
    slaPolicies = policies;
    uninvitedTaggedResources = uninvitedRows ?? [];

    const profiles = ((memberRows ?? []) as unknown as { profile: { id: string; full_name: string } | null }[])
      .map((m) => m.profile)
      .filter((p): p is { id: string; full_name: string } => !!p);

    // primary_module is edited from the Resources page, which writes to
    // resources.primary_module — not profiles.primary_module (a separate,
    // never-updated-by-that-UI column) — so it has to be resolved via
    // resources.profile_id, not read straight off profiles.
    const { data: resourceRows } = profiles.length
      ? await supabase
          .from("resources")
          .select("profile_id, primary_module")
          .in(
            "profile_id",
            profiles.map((p) => p.id),
          )
      : { data: [] as { profile_id: string | null; primary_module: string | null }[] };
    const moduleByProfileId = new Map(
      (resourceRows ?? []).filter((r) => r.profile_id).map((r) => [r.profile_id as string, r.primary_module]),
    );

    consultantOptions = profiles.map((p) => ({ ...p, primary_module: moduleByProfileId.get(p.id) ?? null }));
  }

  // Needed for the notification form's "statuses to include" checklist
  // regardless of role, not just for the admin-only picklist manager
  // section below.
  const picklists = await getPicklists(viewer.profile.org_id);

  let orgMembers: MemberWithMemberships[] = [];
  let orgName = "";
  if (viewer.role === "org_admin") {
    const [members, { data: org }] = await Promise.all([
      listOrgMembersWithMemberships(viewer.profile.org_id),
      supabase.from("organizations").select("name").eq("id", viewer.profile.org_id).single(),
    ]);
    orgMembers = members;
    orgName = org?.name ?? "";
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
          {settings && (
            <NotificationSettingsForm
              projectId={selectedProjectId}
              settings={settings}
              statuses={picklists.statuses}
            />
          )}
          {selectedProject && (
            <>
              <ProjectPhaseToggle
                projectId={selectedProjectId}
                phase={selectedProject.phase}
                goLiveDate={selectedProject.go_live_date}
              />
              <div className="grid gap-5 lg:grid-cols-2">
                <SupportRoutingForm
                  projectId={selectedProjectId}
                  routing={supportRouting}
                  modules={picklists.modules.map((m) => m.value)}
                  consultantOptions={consultantOptions}
                  uninvitedTaggedResources={uninvitedTaggedResources}
                />
                <SlaPolicyForm projectId={selectedProjectId} policies={slaPolicies} />
              </div>
            </>
          )}
        </div>
      )}

      {viewer.role === "org_admin" && (
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
            <PicklistManager
              type="project_role"
              title="Project Roles"
              description="Roles available when adding a resource (e.g. Functional, Technical, PMO, Project Manager)."
              items={picklists.projectRoles}
            />
            <PicklistManager
              type="company_code"
              title="Company codes"
              description="Company codes available on projects and objects (e.g. 1000, 2000)."
              items={picklists.companyCodes}
            />
            <PicklistManager
              type="stream"
              title="Streams"
              description="Delivery streams available on projects and objects (e.g. Finance, Logistics)."
              items={picklists.streams}
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
