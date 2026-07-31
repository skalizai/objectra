// Hand-written to match supabase/migrations/0001_schema.sql. Regenerate with
// `supabase gen types typescript` once a real project exists and keep the
// hand-written shape in sync if you do.

export type ProjectStatus = "active" | "paused" | "closed";
export type ProjectMemberRole = "project_manager" | "technical_lead" | "pmo" | "member" | "client";
export type ObjectType =
  | "Workflow"
  | "Report"
  | "Interface"
  | "Conversion"
  | "Enhancement"
  | "Form"
  | "Application";
// Free-text now — validated against picklists(type='status') at the app
// layer, not a fixed DB enum, so admins can maintain their own list.
export type ObjectStatus = string;
export type AssignedRole = "developer" | "functional";
export type PicklistType = "module" | "complexity" | "status" | "company_code" | "stream" | "project_role";
// Free-text now — validated against picklists(type='project_role') at the
// app layer (Settings → Project Roles), not a fixed DB enum, so admins can
// maintain their own list (Functional, Technical, PMO, Project Manager, ...).
export type ConsultantType = string;
export type ResourceLocation = "onsite" | "offshore";
export type InvitationRole = "org_admin" | "project_manager" | "technical_lead" | "pmo" | "member" | "client";
export type InvitationStatus = "pending" | "accepted" | "expired";
export type EmailType = "invite" | "deadline_alert" | "weekly_digest" | "status_change";
export type EmailStatus = "sent" | "failed";
export type DigestDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  org_id: string;
  full_name: string;
  email: string;
  title: string | null;
  avatar_url: string | null;
  skills: string[];
  consultant_type: ConsultantType | null;
  primary_module: string | null;
  location: ResourceLocation | null;
  is_org_admin: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  org_id: string;
  name: string;
  client_name: string;
  code: string;
  description: string | null;
  status: ProjectStatus;
  start_date: string | null;
  target_go_live: string | null;
  pm_id: string | null;
  company_code: string | null;
  stream: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  profile_id: string;
  role: ProjectMemberRole;
  allocation_pct: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ObjectRow {
  id: string;
  project_id: string;
  wricef_id: string | null;
  object_type: ObjectType;
  title: string;
  description: string | null;
  module: string | null;
  wave: string | null;
  stream: string | null;
  sprint: string | null;
  lob: string | null;
  clean_core: string | null;
  complexity: string | null;
  go_live_critical: boolean;
  priority: string | null;
  priority_rank: number | null;
  status: ObjectStatus;
  company_code: string | null;
  business_unit: string | null;
  customizing_request: string | null;
  transport_requests: string | null;
  transport_type: string | null;
  efforts: string | null;
  impact_code: string | null;
  uploaded_path: string | null;
  due_date: string | null;
  due_date_raw: string | null;
  planned_fsd: string | null;
  planned_fsd_raw: string | null;
  dev_start: string | null;
  dev_start_raw: string | null;
  dev_baseline: string | null;
  dev_baseline_raw: string | null;
  dev_planned: string | null;
  dev_planned_raw: string | null;
  dev_actual: string | null;
  dev_actual_raw: string | null;
  admin_note: string | null;
  comments: string | null;
  comments2: string | null;
  fds_received: boolean;
  is_custom: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ObjectAssignment {
  id: string;
  object_id: string;
  resource_id: string;
  assigned_role: AssignedRole;
  created_at: string;
  updated_at: string;
}

export interface Invitation {
  id: string;
  org_id: string;
  project_id: string | null;
  email: string;
  full_name: string;
  role: InvitationRole;
  allocation_pct: number;
  invited_by: string | null;
  token: string;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  object_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
}

export interface EmailLogEntry {
  id: string;
  type: EmailType;
  to_email: string;
  subject: string;
  project_id: string | null;
  status: EmailStatus;
  provider_id: string | null;
  error: string | null;
  sent_at: string;
  created_at: string;
  updated_at: string;
}

/** Mirrors the client_object_view SQL view — no internal notes/PII. */
export interface ClientObjectRow {
  id: string;
  project_id: string;
  wricef_id: string | null;
  object_type: ObjectType;
  title: string;
  module: string | null;
  wave: string | null;
  stream: string | null;
  sprint: string | null;
  status: ObjectStatus;
  priority: string | null;
  go_live_critical: boolean;
  due_date: string | null;
  planned_fsd: string | null;
  dev_planned: string | null;
  dev_actual: string | null;
  created_at: string;
  updated_at: string;
}

export interface Picklist {
  id: string;
  org_id: string;
  type: PicklistType;
  value: string;
  color: string | null;
  is_done: boolean;
  // Only meaningful for type='status': whether moving an object into this
  // status emails its assigned consultants (see
  // lib/email/notify-status-change.ts).
  notify_email: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type InviteStatus = "not_invited" | "invited";

/** The resource roster — saved independently of login access (see
 * migration 0011). profile_id/invite_status are set once someone is
 * actually invited from this row. */
export interface Resource {
  id: string;
  org_id: string;
  full_name: string;
  email: string;
  consultant_type: ConsultantType | null;
  role_title: string | null;
  primary_module: string | null;
  location: ResourceLocation | null;
  allocation_pct: number | null;
  profile_id: string | null;
  invite_status: InviteStatus;
  // Opt-out for object status-change emails (lib/email/notify-status-change.ts)
  // — this resource still gets invite/deadline/digest emails, just skipped
  // as a recipient for status-change notifications specifically.
  email_notifications_enabled: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationSettings {
  id: string;
  project_id: string;
  deadline_alerts_enabled: boolean;
  deadline_lead_days: number;
  weekly_digest_enabled: boolean;
  digest_day: DigestDay;
  digest_recipients: { pms: boolean; pmo: boolean; clients: boolean };
  extra_digest_emails: string[];
  // Scopes the whole digest (totals, moved-this-week, overdue) to objects
  // currently in one of these statuses — empty means every status (no
  // filter), matching behavior before this column existed.
  digest_statuses: string[];
  created_at: string;
  updated_at: string;
}

// Minimal Database shape for @supabase/ssr's generic client typing.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
