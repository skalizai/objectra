# Build prompt — Objectra

A multi-tenant delivery-tracking platform built at Yash Technologies. Paste this into Claude Code (or keep it in the repo root and tell Claude Code to follow it). This supersedes any earlier single-project spec.

---

## 1. What Objectra is

A SaaS web app where a services organisation tracks **development objects** across many **client projects**, manages its **resources** and their **allocation**, invites people to **join with their own login**, and lets each member see **only their assigned work**. The system emails **deadline alerts** and a **weekly status digest** to project managers and clients automatically.

Nothing is hard-coded to any one client. An admin creates a project, adds objects (WRICEF or custom), and assigns resources.

**Product name:** Objectra. **Org (first tenant):** Yash Technologies.

## 2. Stack (locked)

- **Framework:** Next.js (App Router) + TypeScript, deployed on Vercel.
- **Styling:** Tailwind CSS with the design tokens in section 8 wired into the Tailwind theme; **Framer Motion** for animation; **Recharts** for charts; **Tabler Icons** (`@tabler/icons-react`).
- **Backend + DB + Auth:** **Supabase** — Postgres, Supabase Auth, Row Level Security, Storage. Use `@supabase/ssr` for server/client sessions. All per-user data access is enforced by **RLS**, not just the UI.
- **Email:** **Resend** for all transactional mail, with **React Email** templates. Branded to Objectra.
- **Scheduling:** **Vercel Cron** hitting protected API routes (`/api/jobs/*`) guarded by a `CRON_SECRET`. (Alternative noted in section 7: Supabase `pg_cron` + `pg_net` invoking an Edge Function — pick Vercel Cron for coherence with Resend/React Email unless you prefer keeping jobs in Supabase.)
- **Repo:** single Next.js app. Provide `supabase/migrations/*.sql`, `supabase/seed.sql`, `.env.example`, a `README.md` with setup, and npm scripts: `dev`, `build`, `db:reset`, `db:migrate`, `email:preview`.

Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`, `CRON_SECRET`.

## 3. Roles

Four roles, scoped per project via `project_members.role` (a person can be admin on one project, member on another):

- **org_admin** — manages the whole organisation, all projects, resources, billing/settings. (Yash internal leadership.)
- **project_manager** — manages a project: objects, assignments, resource allocation, invites, email settings.
- **member** (resource) — the developers/consultants. Sees **only objects assigned to them**, can update their own objects' status/notes.
- **client** — external stakeholder. **Read-only** status view of their project(s): progress, milestones, no internal notes or PII.

## 4. Data model (Supabase / Postgres)

Tables (all with `id uuid default gen_random_uuid()`, `created_at`, `updated_at`):

- **organizations** — `name`, `slug`, `logo_url`.
- **profiles** — mirrors `auth.users` (id = auth uid); `org_id`, `full_name`, `email`, `title`, `avatar_url`, `skills text[]`, `is_active`. A `handle_new_user` trigger inserts this on signup.
- **projects** — `org_id`, `name`, `client_name`, `code`, `description`, `status` (active/paused/closed), `start_date`, `target_go_live`, `pm_id`.
- **project_members** — `project_id`, `profile_id`, `role` (project_manager/member/client), `allocation_pct int` (0–100), `is_active`. Unique (`project_id`,`profile_id`).
- **objects** — the tracked work item; belongs to a project. Fields below.
- **object_assignments** — `object_id`, `profile_id`, `assigned_role` (developer/functional), so an object can have a developer and a functional consultant. Per-user visibility keys off this table.
- **invitations** — `org_id`, `project_id`, `email`, `full_name`, `role`, `allocation_pct`, `invited_by`, `token`, `status` (pending/accepted/expired), `expires_at`.
- **audit_log** — `object_id`, `field`, `old_value`, `new_value`, `changed_by`, `changed_at`.
- **email_log** — `type` (invite/deadline_alert/weekly_digest), `to_email`, `subject`, `project_id`, `status` (sent/failed), `provider_id`, `error`, `sent_at`.
- **notification_settings** — per project: `deadline_alerts_enabled`, `deadline_lead_days` (default 7), `weekly_digest_enabled`, `digest_day` (default Mon), `digest_recipients` (pms + clients toggles).

**objects fields** (default "WRICEF object template" — projects reuse it; keep flexible for custom object types later):
`project_id, wricef_id (text, indexed, NOT unique), object_type (enum: Workflow|Report|Interface|Conversion|Enhancement|Form|Application), title, description, module, wave, sprint, lob, clean_core, complexity, go_live_critical, priority (+ priority_rank), status, company_code, customizing_request, transport_requests, transport_type, efforts, impact_code, uploaded_path, due_date date, planned_fsd date, dev_start date, dev_baseline date, dev_planned date, dev_actual date, admin_note, comments, comments2, is_custom bool, created_by, updated_by`. Keep a `*_raw text` companion for each date column to preserve unparseable source values.

## 5. Row-Level Security (the core requirement)

Enable RLS on every table. Write `SECURITY DEFINER` helper functions to avoid recursive policies:
`current_org_id()`, `is_org_admin()`, `is_project_member(pid)`, `project_role(pid)` (returns the caller's role on a project), `is_assigned_to_object(oid)` (true if a row in `object_assignments` links the object to `auth.uid()`).

Policies (summary):

- **objects — SELECT:** allowed if `is_org_admin()` OR caller is project_manager/client on the object's project OR `is_assigned_to_object(id)`. → A **member sees only their assigned objects**; a client sees the project's objects read-only.
- **objects — INSERT/UPDATE/DELETE:** `is_org_admin()` OR project_manager of that project. Additionally allow a **member to UPDATE only `status`, `admin_note`, and comment fields on objects assigned to them** (use a column-guarded policy / DB trigger, or an RPC `member_update_object`). Clients get no writes.
- **projects / project_members / object_assignments / invitations / notification_settings:** read for project members; write for org_admin + that project's project_manager.
- **profiles:** read own always; org_admin and PMs can read profiles in their org; update own profile only (org_admin can update any in-org).
- **audit_log / email_log:** insert via service role only (server actions); read for org_admin + PM.

Test RLS explicitly (see acceptance criteria) — this is the security boundary, so verify a member literally cannot `select` an unassigned object even by direct query.

## 6. Auth & invitation flow

**As shipped, this deviates from the original "click a link, set your own password" design below — see the note at the end of this section.**

1. **Seed** an org (Yash Technologies) and one **org_admin** (email + password) in `supabase/seed.sql`.
2. A PM/admin creates a **resource** on the org roster (name, email, type, role, area, location, allocation %) — no login yet, just a roster entry (`resources` table). Assigning them to objects or naming them in ticket routing works immediately, without waiting for an invite (see section 16's routing note).
3. Whenever the PM/admin is ready, they **invite** that resource to a specific project + access level from the Resources page. The invite action generates a password server-side, calls `supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: {...} })` (which still fires `handle_new_user()` to create the `profiles` row, same as before), grants the chosen `project_members` role immediately via the service-role client (the same effect `accept_invitation()` used to produce, just applied at invite time instead of on the invitee's own action), and **emails the login email + password directly via Resend** using a branded template — no separate "set a password" step, they can sign in right away.
4. Inviting an **already-invited** resource again (e.g. lost the email, or adding them to a second project) is safe to repeat: it resets their password via `admin.auth.admin.updateUserById()` and re-sends new credentials, rather than failing.
5. They land in the app seeing **only their assigned objects/tickets** (My work), and can update status and comment on both.

Sessions via `@supabase/ssr` in middleware; protect all `/app/**` routes; redirect unauthenticated users to `/sign-in`.

> **Why the deviation:** emailing a generated password directly is a weaker security pattern than a self-service "set your own password" link (email isn't a fully trusted channel, and there's no in-app password-change screen yet for the invitee to rotate it themselves) — but it's simpler to operate for an internal delivery-tracking tool, and was an explicit, deliberate choice made after the fact. `accept_invitation()` (section 2 functions) and `/accept-invite` still exist in the schema/codebase but are no longer in the active invite path — nothing currently calls them.

## 7. Automated email (Resend + Vercel Cron)

Two scheduled API routes, each verifying `Authorization: Bearer ${CRON_SECRET}`, using the Supabase **service role** to read across tenants, sending via Resend, and writing to `email_log`:

- **`/api/jobs/deadline-scan`** — daily. For each active project with alerts enabled: find non-live objects that are **overdue** or **due within `deadline_lead_days`**. Email the assigned member(s) and the project PM a grouped alert (object id, title, due date, days remaining). One digest email per recipient, not per object.
- **`/api/jobs/weekly-digest`** — weekly on `digest_day`. Per project, compute the same summary the dashboard shows (total, live, in-flight, at-risk, % complete, wave progress, what moved this week, what's overdue) and email **PMs and clients** a branded status digest. Respect `notification_settings` toggles.

Configure both in `vercel.json` crons. Make jobs **idempotent** and safe to re-run; log every send/failure. Provide `npm run email:preview` (React Email preview server) and a manual "send test digest" button in project settings.

Alternative (if you'd rather keep jobs in Supabase): schedule with `pg_cron`, use `pg_net` to POST to an Edge Function that calls Resend. Keep the same payloads and logging.

## 8. Design system — dark, animated (LOCKED look)

Full dark mode, "console" shell (persistent left sidebar + top bar), modern and animated. Wire these as CSS variables + Tailwind theme tokens. Two UI weights (400/500); display face 600/700.

**Fonts:** `Space Grotesk` (display, KPI numbers, product mark), `Inter` (body/UI), `IBM Plex Mono` (object IDs, dates, counts).

```
--page:#0E1116  --sidebar:#0A0D12  --surface:#161B22  --surface-2:#1C222B
--border:#262D38  --border-2:#333B48
--text:#E6E9EE  --text-2:#9BA4B0  --text-3:#6B7482
--brass:#C79A4B  --brass-hover:#D8AD5E  --on-brass:#0E1116   /* accent: nav-active, primary, focus — kept apart from status */
```
**Status colours:** In progress `#E0A340` · Dev/Func testing `#34C6D6` · Testing in Q `#4C8DF6` · Validation `#9A7CF7` · Live `#35C08A` · Process/Pending `#7A8492` · Overdue/at-risk `#F0574B` (computed override). Pills = 1.5px coloured border on transparent fill.
**WRICEF type glyphs** (signature element — 24px rounded square, mono letter, white text, shown everywhere an object appears): W `#8B7CF0` · R `#43A5EF` · I `#26C2A0` · C `#E0A340` · E `#6E7BF2` · F `#EC6A9C` · A `#22B8C4`.
**Shape/motion:** radius 10px controls / 12px cards; hairline borders; subtle shadow `0 4px 16px rgba(0,0,0,.35)`, no glow/gradients; content max-width ~1220px; sidebar 236px, collapses to a drawer under ~820px. Visible brass focus ring; **respect `prefers-reduced-motion`**.

**Animation (Framer Motion):** page/route transitions (fade + 8px rise), staggered list/card entrances, animated KPI counters, drawer slide-over, layout animations when filtering/sorting the register, hover lift on cards/rows. Keep it tasteful — motion supports the content, never blocks interaction.

## 9. Screens

**Public (unauthenticated)**
- **Landing** (`/`) — dark, animated marketing page: nav (Platform, Resources, Pricing, Sign in, Get started), hero with animated headline + counters, a floating product-preview card, an animated "watch an object move through the pipeline" section, **an animated "hypercare tickets, worked and watched live" section** (added post-ticketing-launch — same traveling-card/lane mechanic as the object pipeline preview, themed for tickets: a ticket hops New → Assigned → In Progress → Resolved with a live SLA countdown that reaches zero exactly as it lands on Resolved, `components/landing/ticket-flow-preview.tsx`), feature grid (Any project/any object · Resource allocation % · Automated emails · See only what's yours), footer. This is the page everyone sees first.
- **Sign in** (`/sign-in`), **Accept invite / set password** (`/accept-invite`).

**App (authenticated, console shell)**
- **Dashboard** — org level for admins (portfolio across projects), project level for PMs: KPIs (total, live, in-flight, at-risk), status-distribution donut, objects-by-module bar, wave progress, deadline monitor.
- **Projects** — list + create project (name, client, code, target go-live, PM).
- **Project workspace** with tabbed views: **Objects register** (search, filter by module/type/status/wave/owner, sort, detail drawer with all fields), **Pipeline board** (kanban by stage), **Assignments** (PM inline-edits developer/stage/due date/note, add object, deadline-monitor tiles, audit trail).
- **Resources** — directory of people with skills and **allocation %** per project; capacity view flags anyone over 100% across active projects; "Invite resource" action → the flow in section 6 (as-built: emails credentials directly, and stays clickable — labeled "Resend" — after the first invite, so a lost email or adding someone to a second project doesn't require a workaround). Type tabs are All / PMO Team / Functional / Technical, **plus a Super User tab** added for the ticketing role (section 15) — "Super User" itself has to be added once as a Project Role value from Settings, same self-service step Functional/Technical/PMO already require. The invite Access-level dropdown splits "Member" into "Technical Consultant"/"Functional Consultant" labels for clarity (both still grant identical `member`-role access — not a new permission tier).
- **My work** — member view: only their assigned objects, grouped by due/urgency; they can update status + notes on their own objects.
- **Client view** — read-only project status (progress, milestones, no internal notes).
- **Settings** — project email/notification settings (deadline lead days, weekly digest day, recipients, send-test-digest), org profile, member management.

## 10. Object import (WRICEF template)

Per project, allow importing objects from an `.xlsx` (the WRICEF Status Tracker format): read the `Details` sheet with SheetJS, map to the `objects` fields in section 4, and upsert. Handle the mixed date formats — ISO, `dd.mm.yy` / `dd-mm-yy` / `dd/mm/yy`, `dd-Mon-yyyy`, and 5-digit **Excel serials** (epoch 1899-12-30); unparseable → null date + keep the raw string. **Preserve duplicate WRICEF IDs** as separate rows (they're legitimately repeated, e.g. multi-touchpoint interfaces). Derive `priority_rank` from the leading digit of the priority string.

## 11. Acceptance criteria

- Landing page renders in dark mode with entrance animation and live counters; navigation to sign-in/get-started works.
- An org_admin can create a project, import a WRICEF `.xlsx`, and add/edit objects; date parsing verified against an Excel-serial value and a `dd.mm.yy` value; duplicate WRICEF IDs preserved.
- **Invite flow end to end:** PM creates a resource with allocation % → Resend delivers a branded invite (logged in `email_log`) → invitee sets a password → on login they see **only their assigned objects**. Verified by a direct DB query that a member **cannot** select an unassigned object (RLS proven, not just UI-hidden).
- Members can update status/note on their own objects; every change writes `audit_log`. Clients have no write access and never see internal notes.
- `/api/jobs/deadline-scan` (daily) and `/api/jobs/weekly-digest` (weekly) run under Vercel Cron, are `CRON_SECRET`-guarded, send via Resend, respect per-project settings, are idempotent, and log to `email_log`; a manual "send test digest" works.
- Resource capacity view flags over-allocation (sum of active allocation % > 100).
- Responsive to mobile (sidebar drawer), visible keyboard focus, reduced-motion respected.

## 12. Non-goals (v1)

Billing/subscriptions, SSO/SAML, in-app chat/comments threads, mobile native apps, Gantt/critical-path scheduling, real-time multiplayer editing, custom per-project object schemas (ship the WRICEF template; make the type extensible later).

## 13. Build order

1. Next.js + Tailwind + tokens + Supabase clients (`@supabase/ssr`) + auth middleware.
2. Migrations: schema (section 4) + **RLS policies and helper functions (section 5)** + seed org/admin. Prove RLS with SQL tests before building UI.
3. Public landing page (dark, animated).
4. App shell (sidebar, top bar, Framer Motion transitions) + Dashboard.
5. Projects + Project workspace (Objects register → Pipeline board → Assignments) + xlsx import.
6. Resources + allocation + **invite flow with Resend**.
7. My work (member) + Client view.
8. Email jobs (deadline scan, weekly digest) + Vercel Cron + settings.
9. Audit log, email log, polish, responsive + a11y pass.

# Addendum — Post-Go-Live Support Ticketing (Hypercare)

Paste this at the end of the Objectra build prompt. It extends sections 3–11 of the base spec; where a section number is referenced below, treat the content as an amendment to that section. Everything else in the base spec (stack, design system, RLS-first approach) applies unchanged.

---

## 14. What the ticketing module is

Once a project (or a wave within it) goes live, the same project switches into **support mode**: designated **super users** on the client side raise **incidents** against a module, tag a **criticality level**, and the ticket **auto-routes to the consultant(s) already mapped to that module** in the project. Consultants work the ticket through a defined lifecycle; PMs and admins watch everything on a **support dashboard**. All of it lives inside the existing project workspace — no separate app.

## 15. Roles (amends section 3)

Add one project-scoped role to `project_members.role`:

- **super_user** — a client-side key user. Can **raise incidents** on their project, view **their own tickets** (full detail + comment thread), and view a read-only summary of their project's support health. Cannot see internal notes, other users' tickets, the objects register, or resource data.

Existing roles gain ticketing abilities:

- **member** (consultant) — sees tickets **assigned to them** (in addition to their assigned objects), updates ticket status, logs resolution notes and comments, records effort.
- **project_manager** — sees all tickets on their project, can reassign/re-route, edit routing rules, change criticality, close/reopen tickets, manage SLA settings.
- **org_admin** — everything, across projects.
- **client** — read-only support summary (ticket counts, SLA health) on their project; no ticket detail unless they are also a super_user.

## 16. Data model (amends section 4)

All tables follow the base conventions (`id uuid`, `created_at`, `updated_at`, RLS on).

- **projects** — add `phase` (enum: `implementation | hypercare | support`, default `implementation`) and `go_live_date date`. Ticket creation is enabled when phase is `hypercare` or `support` (PM can toggle).
- **support_routing** — per-project routing table: `project_id`, `module` (text, matches the `module` values used on objects), `primary_consultant_id` (**resource**, not profile — see note below), `backup_consultant_id` (nullable resource), `is_active`. Unique (`project_id`, `module`). Eligibility (enforced with a trigger) only requires the resource to belong to the project's org — **not** that they've accepted an invite yet.

  > **As-built change:** the addendum originally specified `primary_consultant_id`/`backup_consultant_id` as profile references, requiring the consultant to already be an active, invited project member before a routing rule could name them. In practice this blocked PMs from setting up a project's routing during initial setup, before anyone had been formally invited. Migration `0031_routing_uses_resources.sql` retargets both columns to `resources(id)` instead — the same "assign before invite" pattern `object_assignments` already uses (section 4/migration 0013 of the base schema) — so a rule can name **any org resource, invited or not**. `tickets_auto_route()` resolves the matched resource's `profile_id` (their actual login) at ticket-creation time; if they haven't been invited yet, the ticket falls back to the PM exactly as if no rule existed, and the rule starts firing correctly the moment they are invited — no reconfiguration needed.
- **tickets** — `project_id`, `ticket_no` (human-readable, per-project sequence e.g. `YT-INC-00042`, generated by a DB trigger), `module`, `criticality` (enum: `P1_critical | P2_high | P3_medium | P4_low`), `subject`, `description`, `category` (enum: `incident | service_request | question`, default `incident`), `status` (enum: `new | assigned | in_progress | pending_user | resolved | closed | reopened`), `raised_by` (profile), `assigned_to` (profile, set by routing), `related_object_id` (nullable FK to `objects` — optionally link the incident to the WRICEF object it concerns), `attachment_paths text[]` (Supabase Storage, bucket `ticket-attachments`), `resolution_note`, `effort_hours numeric`, `first_response_at`, `resolved_at`, `closed_at`, `reopen_count int default 0`, `sla_due_at timestamptz` (computed on create from criticality + SLA settings), `sla_breached bool` (computed).
- **ticket_comments** — `ticket_id`, `author_id`, `body`, `is_internal bool` (internal comments visible to consultants/PM/admin only — **never** to super users or clients), `attachment_paths text[]`.
- **ticket_events** — status/assignment timeline: `ticket_id`, `event` (created/assigned/status_change/reassigned/criticality_change/sla_breach/reopened), `old_value`, `new_value`, `actor_id`, `occurred_at`. Written by triggers/server actions; powers the ticket's activity feed.
- **sla_policies** — per project: `criticality`, `response_mins`, `resolve_mins`. Seed defaults: P1 = 1h/4h, P2 = 4h/24h, P3 = 24h/72h, P4 = 48h/1wk. Unique (`project_id`, `criticality`).
- **notification_settings** — add `ticket_emails_enabled` (default true) and `sla_alerts_enabled` (default true).
- **email_log** — extend `type` enum with `ticket_created | ticket_assigned | ticket_status | sla_alert`.

**Auto-routing rule (server action `create_ticket`):** on insert, look up `support_routing` for (`project_id`, `module`) → set `assigned_to` = primary consultant (backup if primary `is_active = false` or no longer a project member); status → `assigned`. If no routing row exists, leave `new` and assign to the project PM, and flag "unrouted" on the dashboard so the PM adds a rule. Compute `sla_due_at` from the project's `sla_policies`.

## 17. RLS (amends section 5)

New helper: `is_ticket_participant(tid)` — true if caller raised the ticket, is its `assigned_to`, or is PM/org_admin on its project.

- **tickets — SELECT:** `is_org_admin()` OR project_manager of the project OR `raised_by = auth.uid()` OR `assigned_to = auth.uid()`. → A **super user sees only tickets they raised**; a consultant sees only tickets assigned to them. Clients get no row-level ticket access (their summary view is served by an aggregate RPC that returns counts only).
- **tickets — INSERT:** super_user / project_manager / org_admin on that project, and only when the project `phase` allows tickets. `raised_by` forced to `auth.uid()` via trigger.
- **tickets — UPDATE:** org_admin/PM full; **assigned consultant** may update only `status`, `resolution_note`, `effort_hours` (column-guarded policy or RPC `consultant_update_ticket`); **raiser** may update only status transitions `resolved → closed` (accept fix) or `resolved → reopened` (with a required comment), via RPC.
- **ticket_comments — SELECT:** participants; rows with `is_internal = true` visible only to consultant/PM/admin. **INSERT:** participants (super users cannot set `is_internal`).
- **ticket_events:** read for participants + PM/admin; insert via triggers/service role only.
- **support_routing / sla_policies:** read for project members; write for org_admin + that project's PM.
- **Storage:** `ticket-attachments` bucket policies mirror ticket SELECT — only participants of the ticket can read its files.

Prove it the same way as objects: a direct SQL test that a super user **cannot** select another user's ticket, and a consultant cannot select a ticket assigned to someone else.

## 18. Ticket emails (amends section 7)

Branded React Email templates via Resend, all logged to `email_log`, respecting `notification_settings`:

- **On create/route (event-driven, from the server action — not cron):** email the assigned consultant (+ PM) with ticket no, module, criticality, subject, SLA due; confirmation email to the raiser.
- **On status change / reassignment:** notify the raiser (external-safe content only) and the newly assigned consultant.
- **`/api/jobs/sla-scan`** — cron: find open tickets past `sla_due_at` (or within 25% of remaining time for a "due soon" warning), set `sla_breached`, write a `sla_breach` event, and email the assigned consultant + PM. One grouped email per recipient per run; idempotent — never re-alert a ticket already flagged unless it re-enters breach after reopen (`sla_breach_alerted_at`/`sla_warning_alerted_at` on `tickets`, cleared on reopen).

  > **As-built change:** runs **daily** (`0 6 * * *` in `vercel.json`), not every 30 min/hourly as originally specified — the Vercel project is on the Hobby plan, which rejects any cron schedule that fires more than once a day. Revisit the cadence if the project moves to Pro.
- **Weekly digest** (existing job) — add a support section when the project is in hypercare/support: opened vs resolved this week, open by criticality, SLA compliance %, oldest open ticket.

## 19. Screens (amends section 9)

Inside the project workspace, a new **Support** tab (visible when phase is hypercare/support, or to PM/admin always):

- **Support dashboard** — KPI tiles (open, unrouted, breaching SLA, resolved this week, avg first-response, avg resolution), donut by status, bar by module, bar by criticality, aging buckets (0–1d / 1–3d / 3–7d / 7d+), and a live ticket table (search, filter by module/criticality/status/assignee, sort; row click opens the detail drawer). Reuses the register's table + drawer patterns, Recharts, Framer Motion stagger.
- **Ticket detail drawer/page** — header with `ticket_no` + criticality pill + SLA countdown, description + attachments, comment thread (internal comments visually distinct, brass "internal" tag, hidden from super users), status timeline from `ticket_events`, consultant actions (status, resolution note, effort), PM actions (reassign, re-route, criticality).
- **Raise ticket** (super user) — focused form: module (dropdown sourced from the org's module picklist), criticality with plain-language descriptions, subject, description, attachments. On submit: toast with ticket number + "routed to your <module> consultant". (As-built: the "optional related object" field was dropped from this form per explicit request — `tickets.related_object_id` still exists in the schema/action for future use, just not exposed in this form.) Only enabled while the project's phase is hypercare/support — the button/form is hidden otherwise, and the server action itself also checks phase and returns a plain-language error rather than a raw RLS failure if reached anyway (e.g. a stale page).
- **My tickets** — super user: their raised tickets grouped by open/resolved. Consultant: **My work gains a "My tickets" section** alongside assigned objects, sorted by SLA urgency.
- **Settings → Support** — phase toggle + go-live date, routing table editor (module → primary/backup consultant; as-built, the picker lists the **full org resource roster**, not just already-invited project members — see section 16's routing note; whoever matches the chosen module sorts to the top and shows their tag), SLA policy editor, ticket email toggles, "send test ticket email".

**Design:** same locked dark system. Criticality pills: P1 `#F0574B` · P2 `#E0A340` · P3 `#4C8DF6` · P4 `#7A8492` (1.5px border on transparent fill, like status pills). Ticket numbers, SLA timers and timestamps in IBM Plex Mono. A small 24px rounded-square glyph with the module's initial echoes the WRICEF-glyph language.

## 20. Acceptance criteria (amends section 11)

- PM flips a project to `hypercare`, sets routing (module → consultant, pickable from the full org roster regardless of invite status — section 16) and SLA policies.
- A super user raises a P2 incident for module "MM" → ticket auto-assigns to the mapped MM consultant, gets a sequential `ticket_no`, `sla_due_at` is computed, both consultant and raiser receive branded Resend emails, all logged in `email_log`.
- RLS proven by direct query: super user cannot select another raiser's ticket; consultant cannot select a ticket assigned to someone else; internal comments never returned to a super user.
- Consultant updates status → `ticket_events` records it and the raiser is notified; raiser can close or reopen a resolved ticket (reopen requires a comment and increments `reopen_count`).
- A ticket with no routing rule lands on the PM and shows in the dashboard's "unrouted" tile.
- `/api/jobs/sla-scan` flags a breached ticket exactly once, emails consultant + PM, and is idempotent on re-run.
- Support dashboard KPIs, charts, filters and aging buckets reflect seeded test tickets; drawer, animations, mobile drawer and reduced-motion behave per the design system.

## 21. Build order (amends section 13 — insert after step 8)

8a. Migrations: `phase`/`go_live_date`, tickets + routing + SLA + comments + events tables, sequence trigger, **RLS + SQL tests**.
8b. Routing + SLA settings UI, raise-ticket flow, ticket detail with comments/timeline.
8c. Support dashboard + My tickets integration.
8d. Ticket emails (event-driven) + `sla-scan` cron + digest support section.

## 22. Non-goals for the ticketing v1

External email-to-ticket ingestion, a public portal for non-invited users, CSAT surveys, knowledge base, and integration with external ITSM tools (ServiceNow/Jira SM) — design the `tickets` schema so an external reference id can be added later. (Escalation matrices beyond primary/backup were originally listed here too, but that's since been built — see section 24.)

## 23. Implementation notes (post-launch fixes and corrections)

Recorded here rather than silently — kept for whoever next touches this code.

- **`storage.objects` RLS gotcha:** don't run `alter table storage.objects enable row level security` against a hosted Supabase project — it's a Supabase-managed system table (owned by an internal storage role), already RLS-enabled by default, and the `ALTER` fails with `must be owner of table objects`. Only the `create policy ... on storage.objects` statements are needed/allowed.
- **NULL-propagation bugs found and fixed during build**, all following the same shape (a plpgsql `IF` treats `NULL` as false, so a nullable comparison like `tk.assigned_to <> auth.uid()` silently *passes* an authorization check when the column is null instead of correctly rejecting the caller): `consultant_update_ticket()` and `raiser_close_or_reopen_ticket()` now use `IS DISTINCT FROM`; `ticket_comments_guard()` now wraps each sub-check in `coalesce(..., false)` since `is_project_editor()`/`project_role()` return `NULL` (not `false`) for a caller with no active `project_members` row at all. Worth checking for the same pattern in any future RPC that gates on a nullable column.
- **Pre-existing bug fixed in passing:** `supabase/seed.sql` set the sample project's `pm_id` to a `profiles.id` — `projects.pm_id` was repointed to `resources.id` back in migration `0016_project_pm_uses_resources.sql`, so the seed's own FK was broken and `db:reset` failed before this feature's seed additions could even run. Fixed to insert/use a `resources` row for the seeded admin.
- **Still-open pre-existing bug, not touched:** `member_update_object()` (base schema, section 5) still checks the pre-`0013` `object_assignments.profile_id` column, which no longer exists (assignments were repointed to `resource_id`) — it likely fails today for any member self-updating an assigned object. Unaffected by anything in this addendum (the ticket RPCs were written correctly from scratch), flagged here since it was noticed along the way.
- **`supabase/tests/rls_smoke_test.sql`** (the original, non-ticket smoke test) is similarly stale for the same `object_assignments.profile_id` reason — `supabase/tests/tickets_rls_smoke_test.sql` (this addendum's own test) is written correctly against the current schema and is unaffected.

## 24. SLA escalation ladder (added post-launch, amends sections 4/16/18/19)

A second, independent SLA mechanism layered on top of the per-criticality `sla_policies` targets in section 16 — a flat, project-wide escalation ladder: **SL1 → SL2 → SL3**, each tier with its own "still open after N minutes" threshold and its own list of email recipients. If a ticket sits unresolved past a tier's threshold, everyone on that tier's list is emailed; if it's *still* unresolved once the next tier's (longer) threshold passes, that tier fires too — independent of the ticket's criticality-driven `sla_due_at`/breach check, which keeps running in parallel.

- **`sla_escalation_tiers`** — `project_id`, `tier` (`SL1|SL2|SL3`), `threshold_mins`. Unique (`project_id`, `tier`).
- **`sla_escalation_recipients`** — `tier_id`, `resource_id` (resolved straight to `resources.email` — no login required at all, unlike ticket routing/assignment, since this is a pure FYI broadcast, not ticket ownership). Unique (`tier_id`, `resource_id`).
- **`tickets`** gains `sl1_alerted_at`/`sl2_alerted_at`/`sl3_alerted_at` (same idempotency idiom as `sla_breach_alerted_at`/`sla_warning_alerted_at` — cleared on reopen by `raiser_close_or_reopen_ticket()`, so a re-breached ticket can escalate through all three tiers again).
- **RLS:** read for project members, write for `is_org_admin()`/`is_project_editor()` — same shape as `support_routing`/`sla_policies`.
- **Detection:** folded into the existing `sla-scan` job (not a separate cron, to stay within the Hobby-plan one-cron-schedule-per-day-per-route constraint noted in section 18) — after the per-criticality breach/warning pass, it separately scans every open ticket on any project with escalation tiers configured, and for each tier whose threshold has been crossed and not yet alerted, sends **one broadcast email** (all that tier's recipients in a single `to:` list, not one send per recipient) via `notifySlaEscalation()` / `emails/sla-escalation-email.tsx`, logged to `email_log` as a new `sla_escalation` type.
- **Settings UI:** `components/settings/sla-escalation-form.tsx`, rendered below the SLA policy editor — one card per tier (SL1/SL2/SL3) with an hours-until-escalate input and an add/remove recipient list, sourced from the same full-org-roster resource picker routing uses. A tier's recipient list can't be edited until its threshold has been saved once (needs the tier row to exist to attach recipients to).

## 25. Ticket reassign-to-anyone and ticket delete (added post-launch, amends sections 17/19)

- **Reassign, widened:** the ticket detail drawer's Reassign picker now offers the **full org resource roster** (invited or not), same as routing's picker (section 24) — previously it was restricted to already-invited project members. `tickets.assigned_to` still has to be a `profiles` id (someone who can actually log in and work the ticket), so `reassignTicket()` resolves the picked resource's `profile_id` itself and returns a plain-language message ("X hasn't accepted their invite yet — invite them from Resources first...") instead of silently failing or hiding uninvited people from the list.
- **Delete ticket:** `tickets` never had a DELETE policy at all (section 17 only specified SELECT/INSERT/UPDATE) — nobody could delete a ticket. `0033_ticket_delete_policy.sql` adds `tickets_delete` (`is_org_admin()`/`is_project_editor()`, same scope as UPDATE). `deleteTicket()` action + a confirm-to-delete button (`components/support/delete-ticket-button.tsx`, same inline Yes/Cancel pattern as `DeleteResourceButton`) in the ticket detail drawer, visible only to PM/technical_lead/org_admin. `ticket_comments`/`ticket_events` cascade automatically (both already `on delete cascade` from `ticket_id`).
