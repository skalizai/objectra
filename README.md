# Objectra Labs

A multi-tenant delivery-tracking platform for services organisations: track development objects
(WRICEF and custom) across client projects, manage resources and allocation %, invite people to
join with their own login, and let each member see only their assigned work. Deadline alerts and a
weekly status digest go out automatically. Nothing is hard-coded to one organisation — any company
can sign up and run their own projects on it.

Full spec: [`OBJECTRA_BUILD_PROMPT.md`](./OBJECTRA_BUILD_PROMPT.md).

## Stack

Next.js (App Router) + TypeScript · Tailwind CSS v4 · Framer Motion · Recharts · Tabler Icons ·
Supabase (Postgres, Auth, RLS, Storage) via `@supabase/ssr` · Resend + React Email · Vercel Cron ·
SheetJS for `.xlsx` import.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** (or run one locally with `npx supabase start`, which requires
   Docker) and copy `.env.example` to `.env.local`, filling in:

   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` —
     from your Supabase project's API settings.
   - `RESEND_API_KEY`, `EMAIL_FROM` — from [resend.com](https://resend.com); verify a sending
     domain before going to production.
   - `APP_URL` — `http://localhost:3000` in dev, your deployed URL in production.
   - `CRON_SECRET` — any random string; must match what you configure on the Vercel Cron job.

3. **Apply the database schema.** Against a linked/local Supabase project:

   ```bash
   npm run db:reset    # supabase db reset — runs every migration + seed.sql
   ```

   This creates the schema, RLS policies and helper functions (`supabase/migrations/`), and seeds
   a demo org with one org_admin plus a sample project. The seeded email/password live in
   `supabase/seed.sql` — **replace them with a placeholder before pushing to any shared repo**,
   since that file commits the password in plaintext.

   `npm run db:migrate` (`supabase migration up`) applies new migrations without reseeding.

4. **Verify RLS** by running `supabase/tests/rls_smoke_test.sql` against the database — it proves
   a member cannot `select` an object they aren't assigned to, at the database level.

5. **Run the app**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000`. Without Supabase env vars configured, the public marketing
   pages still render; authenticated routes redirect to `/sign-in`.

## Email templates

React Email templates live in `emails/`. Preview them locally:

```bash
npm run email:preview
```

## Scheduled jobs

`vercel.json` registers two daily [Vercel Cron](https://vercel.com/docs/cron-jobs) jobs:

- `/api/jobs/deadline-scan` — finds overdue/soon-due objects and emails assigned members + the PM.
- `/api/jobs/weekly-digest` — runs daily but only sends per project on that project's configured
  `digest_day`; emails PMs and clients the same summary the dashboard shows.

Both require `Authorization: Bearer $CRON_SECRET` and are safe to re-run (idempotent — a
recipient already emailed today for a given project is skipped). Trigger a one-off send from
**Settings → Notifications → Send test digest**.

## Project structure

- `app/` — routes. `(app)/` is the authenticated console shell (dashboard, projects, resources,
  my-work, client, settings); everything else is public.
- `components/` — UI, grouped by feature area.
- `lib/data/` — server-side read queries (RLS-scoped via the request's Supabase session).
- `lib/actions/` — Server Actions (writes).
- `lib/jobs/` — the deadline-scan and weekly-digest job logic, shared by the cron routes and the
  manual test-send action.
- `lib/supabase/` — browser/server/admin Supabase clients and the auth middleware.
- `supabase/migrations/` — schema, RLS, and helper functions, in order.

## Known gaps

- No automated test suite yet — RLS is verified via the manual SQL script above; UI flows haven't
  been exercised against a live Supabase project in this environment (no Docker available to run
  `supabase start`).
- The `.xlsx` column-header mapping (`lib/import/wricef-xlsx.ts`) matches the field names in
  section 4 of the build prompt; adjust `HEADER_MAP` if the client's actual tracker uses different
  column headers.
