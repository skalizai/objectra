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
import { SlaEscalationForm } from "@/components/settings/sla-escalation-form";
import { getSupportRouting, getSlaPolicies, getSlaEscalationTiers } from "@/lib/data/support";
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
  let slaEscalationTiers: Awaited<ReturnType<typeof getSlaEscalationTiers>> = [];
  let consultantOptions: { id: string; full_name: string; email: string; primary_module: string | null }[] = [];
  if (selectedProjectId) {
    const [{ data }, { data: projectRow }, routing, policies, escalationTiers, { data: resourceRows }] =
      await Promise.all([
        supabase.from("notification_settings").select("*").eq("project_id", selectedProjectId).maybeSingle(),
        supabase.from("projects").select("*").eq("id", selectedProjectId).maybeSingle(),
        getSupportRouting(selectedProjectId),
        getSlaPolicies(selectedProjectId),
        getSlaEscalationTiers(selectedProjectId),
        // support_routing references resources, not profiles
        // (0031_routing_uses_resources.sql) — a routing rule can be set up
        // against any org resource regardless of invite status, so this is
        // the full org roster, not just already-invited project members.
        // Same roster backs SLA escalation recipients (email-only, no login
        // needed at all there).
        supabase
          .from("resources")
          .select("id, full_name, email, primary_module")
          .eq("org_id", viewer.profile.org_id)
          .order("full_name"),
      ]);
    settings = data;
    selectedProject = projectRow;
    supportRouting = routing;
    slaPolicies = policies;
    slaEscalationTiers = escalationTiers;
    consultantOptions = resourceRows ?? [];
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
                />
                <SlaPolicyForm projectId={selectedProjectId} policies={slaPolicies} />
              </div>
              <SlaEscalationForm
                projectId={selectedProjectId}
                tiers={slaEscalationTiers}
                consultantOptions={consultantOptions}
              />
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
            <PicklistManager
              type="dev_type"
              title="Backlog item types"
              description="Development types available when registering a backlog item (e.g. Enhancement, Workflow, Fiori)."
              items={picklists.devTypes}
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
