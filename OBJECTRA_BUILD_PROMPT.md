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

1. **Seed** an org (Yash Technologies) and one **org_admin** (email + password) in `supabase/seed.sql`.
2. A PM/admin creates a **resource profile** on a project: name, email, role, allocation %. Server action inserts an `invitations` row, then calls `supabase.auth.admin.generateLink({ type: 'invite', email })` to get the action link and **sends it via Resend** using a branded React Email template (so delivery + branding is Resend, identity is Supabase Auth).
3. Invitee clicks the link → `/accept-invite` → sets their password. On signup, `handle_new_user` creates their `profiles` row; a follow-up server action consumes the matching `invitations` row to create the `project_members` entry (role + allocation) and any pending `object_assignments`, then marks the invite `accepted`.
4. They land in the app seeing **only their assigned objects** (My work).

Sessions via `@supabase/ssr` in middleware; protect all `/app/**` routes; redirect unauthenticated users to `/sign-in`.

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
- **Landing** (`/`) — dark, animated marketing page: nav (Platform, Resources, Pricing, Sign in, Get started), hero with animated headline + counters, a floating product-preview card, feature grid (Any project/any object · Resource allocation % · Automated emails · See only what's yours), footer. This is the page everyone sees first.
- **Sign in** (`/sign-in`), **Accept invite / set password** (`/accept-invite`).

**App (authenticated, console shell)**
- **Dashboard** — org level for admins (portfolio across projects), project level for PMs: KPIs (total, live, in-flight, at-risk), status-distribution donut, objects-by-module bar, wave progress, deadline monitor.
- **Projects** — list + create project (name, client, code, target go-live, PM).
- **Project workspace** with tabbed views: **Objects register** (search, filter by module/type/status/wave/owner, sort, detail drawer with all fields), **Pipeline board** (kanban by stage), **Assignments** (PM inline-edits developer/stage/due date/note, add object, deadline-monitor tiles, audit trail).
- **Resources** — directory of people with skills and **allocation %** per project; capacity view flags anyone over 100% across active projects; "Invite resource" action → the flow in section 6.
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
