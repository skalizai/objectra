// Hand-written to match supabase/migrations/0001_schema.sql. Regenerate with
// `supabase gen types typescript` once a real project exists and keep the
// hand-written shape in sync if you do.

export type ProjectStatus = "active" | "paused" | "closed";
export type ProjectPhase = "implementation" | "hypercare" | "support";
export type ProjectMemberRole =
  | "project_manager"
  | "technical_lead"
  | "pmo"
  | "member"
  | "client"
  | "super_user";
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
export type PicklistType = "module" | "complexity" | "status" | "company_code" | "stream" | "project_role" | "dev_type";
// Free-text now — validated against picklists(type='project_role') at the
// app layer (Settings → Project Roles), not a fixed DB enum, so admins can
// maintain their own list (Functional, Technical, PMO, Project Manager, ...).
export type ConsultantType = string;
export type ResourceLocation = "onsite" | "offshore";
export type InvitationRole =
  | "org_admin"
  | "project_manager"
  | "technical_lead"
  | "pmo"
  | "member"
  | "client"
  | "super_user";
export type InvitationStatus = "pending" | "accepted" | "expired";
export type EmailType =
  | "invite"
  | "deadline_alert"
  | "weekly_digest"
  | "status_change"
  | "ticket_created"
  | "ticket_assigned"
  | "ticket_status"
  | "sla_alert"
  | "sla_escalation"
  | "backlog_approval_request";
export type EmailStatus = "sent" | "failed";
export type DigestDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type TicketCriticality = "P1_critical" | "P2_high" | "P3_medium" | "P4_low";
export type TicketCategory = "incident" | "service_request" | "question";
export type TicketStatus =
  | "new"
  | "assigned"
  | "in_progress"
  | "pending_user"
  | "resolved"
  | "closed"
  | "reopened";
export type TicketEventType =
  | "created"
  | "assigned"
  | "status_change"
  | "reassigned"
  | "criticality_change"
  | "sla_breach"
  | "reopened";

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
  phase: ProjectPhase;
  go_live_date: string | null;
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
  ticket_emails_enabled: boolean;
  sla_alerts_enabled: boolean;
  backlog_emails_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Post-Go-Live Support Ticketing (Hypercare) — sections 14-22 of
// OBJECTRA_BUILD_PROMPT.md.
// ---------------------------------------------------------------------------

/** Module -> consultant routing for a project. primary/backup reference
 * resources (0031_routing_uses_resources.sql), not profiles — a routing
 * rule can be set up against any org resource regardless of invite status;
 * ticket auto-routing resolves the actual login (resources.profile_id) at
 * ticket-creation time and falls back to the PM if that resource hasn't
 * been invited yet. */
export interface SupportRouting {
  id: string;
  project_id: string;
  module: string;
  primary_consultant_id: string | null;
  backup_consultant_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SlaPolicy {
  id: string;
  project_id: string;
  criticality: TicketCriticality;
  response_mins: number;
  resolve_mins: number;
  created_at: string;
  updated_at: string;
}

export type SlaEscalationTierName = "SL1" | "SL2" | "SL3";

/** A rung on the escalation ladder: "still unresolved after
 * threshold_mins minutes (since creation) → email this tier's
 * recipients." Independent of the per-criticality SlaPolicy targets
 * above — a flat, project-wide ladder rather than one per criticality. */
export interface SlaEscalationTier {
  id: string;
  project_id: string;
  tier: SlaEscalationTierName;
  threshold_mins: number;
  created_at: string;
  updated_at: string;
}

/** A resource on a tier's notify list — resolved straight to
 * resources.email (no login required, these are FYI broadcasts, not
 * ticket ownership). */
export interface SlaEscalationRecipient {
  id: string;
  tier_id: string;
  resource_id: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  project_id: string;
  ticket_no: string | null;
  module: string;
  criticality: TicketCriticality;
  subject: string;
  description: string | null;
  category: TicketCategory;
  status: TicketStatus;
  raised_by: string | null;
  assigned_to: string | null;
  related_object_id: string | null;
  attachment_paths: string[];
  resolution_note: string | null;
  effort_hours: number | null;
  first_response_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  reopen_count: number;
  sla_due_at: string | null;
  sla_breached: boolean;
  sla_breach_alerted_at: string | null;
  sla_warning_alerted_at: string | null;
  sl1_alerted_at: string | null;
  sl2_alerted_at: string | null;
  sl3_alerted_at: string | null;
  external_ref_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  author_id: string | null;
  body: string;
  is_internal: boolean;
  attachment_paths: string[];
  created_at: string;
  updated_at: string;
}

export interface TicketEvent {
  id: string;
  ticket_id: string;
  event: TicketEventType;
  old_value: string | null;
  new_value: string | null;
  actor_id: string | null;
  occurred_at: string;
}

/** Counts-only rollup returned by the get_support_summary() RPC — backs the
 * client read-only support summary, since clients have no row-level
 * SELECT on tickets. */
export interface SupportSummary {
  open_count: number;
  breaching_count: number;
  resolved_this_week: number;
  sla_compliance_pct: number;
}

// ---------------------------------------------------------------------------
// Backlog Items — Registration & Client Approval
// ---------------------------------------------------------------------------

export type BacklogItemStatus =
  | "registered"
  | "sent_for_approval"
  | "approved"
  | "rejected"
  | "on_hold"
  | "moved_to_objects";

/** Per-project rate card driving every backlog cost calculation — the
 * single source of truth a PM edits from Settings -> Backlog. */
export interface BacklogRateSettings {
  id: string;
  project_id: string;
  tech_rate: number;
  func_rate: number;
  pmo_rate: number;
  fiori_rate: number;
  hours_per_day: number;
  monthly_hours: number;
  pmo_half_time_factor: number;
  project_months: number;
  pgls_months: number;
  created_at: string;
  updated_at: string;
}

/** Raw row shape as stored in the DB. Dev/Fiori/Functional hours+cost are
 * real columns (pure per-row math). PMO cost, PGLS cost, Total Days, and
 * Total Cost are deliberately absent here -- they depend on the current
 * count of registered items in the project and are computed at read time
 * by lib/data/backlog.ts::getBacklogItems(), not stored. */
export interface BacklogItem {
  id: string;
  project_id: string;
  item_no: string | null;
  company_code: string | null;
  module: string | null;
  lob: string | null;
  dev_type: string | null;
  description: string;
  requested_by: string | null;
  complexity: string | null;
  go_live_critical: boolean;
  dev_days: number;
  dev_hours: number;
  dev_cost: number;
  fiori_days: number;
  fiori_hours: number;
  fiori_cost: number;
  func_days: number;
  func_hours: number;
  func_cost: number;
  status: BacklogItemStatus;
  cr_no: string | null;
  sent_for_approval_at: string | null;
  approval_date: string | null;
  remarks: string | null;
  converted_object_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/** BacklogItem plus the read-time-computed allocation fields. */
export interface BacklogItemWithCost extends BacklogItem {
  pmo_cost: number;
  pgls_cost: number;
  total_days: number;
  total_cost: number;
}

// Minimal Database shape for @supabase/ssr's generic client typing.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
