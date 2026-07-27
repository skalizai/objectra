import type { Metadata } from "next";
import {
  IconBrandNextjs,
  IconBrandReact,
  IconBrandTypescript,
  IconBrandTailwind,
  IconDatabase,
  IconLock,
  IconMail,
  IconChartBar,
  IconWand,
  IconIcons,
  IconBrandVercel,
  IconBrandGithub,
  IconServer2,
  IconArrowDown,
} from "@tabler/icons-react";

export const metadata: Metadata = { title: "Architecture" };

const STACK = [
  {
    icon: IconBrandNextjs,
    name: "Next.js 16",
    detail: "App Router, Server Components, and Turbopack — the framework the whole app runs on, front and back.",
  },
  {
    icon: IconBrandReact,
    name: "React 19",
    detail: "The UI layer underneath Next.js — components, hooks, and Server Actions for every form and edit.",
  },
  {
    icon: IconBrandTypescript,
    name: "TypeScript",
    detail: "Every file in the app is typed end to end, from the database rows to the React props.",
  },
  {
    icon: IconBrandTailwind,
    name: "Tailwind CSS v4",
    detail: "CSS-based theme (app/globals.css) — colors, spacing, and the brass/dark palette all live there.",
  },
  {
    icon: IconDatabase,
    name: "Supabase Postgres",
    detail: "The database — every project, object, resource, and picklist lives in Postgres, managed by Supabase.",
  },
  {
    icon: IconLock,
    name: "Row-Level Security",
    detail: "Multi-tenancy is enforced in the database itself — every table's policies scope rows to your org, not just the UI.",
  },
  {
    icon: IconServer2,
    name: "Supabase Auth",
    detail: "Login, sessions, and invites — @supabase/ssr keeps your session in sync between the browser and the server.",
  },
  {
    icon: IconMail,
    name: "Resend + React Email",
    detail: "Every email (status changes, weekly digest, deadline alerts, invites) is a React component, sent via Resend.",
  },
  {
    icon: IconWand,
    name: "Framer Motion",
    detail: "Page transitions, hover states, and the animated bits on the landing page and dashboard.",
  },
  {
    icon: IconChartBar,
    name: "Recharts",
    detail: "The charts on the dashboard — status distribution, objects by module, and project progress bars.",
  },
  {
    icon: IconIcons,
    name: "Tabler Icons",
    detail: "Every icon in the app, including the one this card is showing you right now.",
  },
  {
    icon: IconBrandVercel,
    name: "Vercel",
    detail: "Where the app itself is hosted and deployed — every push to main can go live here.",
  },
];

const FLOW = [
  { label: "Your browser", detail: "The app you're using right now" },
  { label: "Next.js on Vercel", detail: "Renders pages, runs Server Actions, sends the response" },
  { label: "Supabase (Postgres + Auth)", detail: "Every read/write goes through Row-Level Security" },
  { label: "Resend", detail: "Fired only when something worth emailing happens" },
];

export default function ArchitecturePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Architecture</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-2">
          What Objectra Labs is actually built on — the stack, and how a request flows through it.
        </p>
      </div>

      <div className="rounded-card border border-border bg-surface p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <h2 className="font-display text-sm font-semibold">Request lifecycle</h2>
        <p className="mt-1 text-xs text-text-3">
          What happens between you clicking something and seeing the result.
        </p>

        <div className="mt-5 flex flex-col items-center">
          {FLOW.map((step, i) => (
            <div key={step.label} className="flex w-full max-w-md flex-col items-center">
              <div
                className="w-full rounded-control border border-border-2 bg-surface-2 px-4 py-3 text-center"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="text-sm font-semibold text-text">{step.label}</div>
                <div className="mt-0.5 text-xs text-text-3">{step.detail}</div>
              </div>
              {i < FLOW.length - 1 && (
                <IconArrowDown size={18} className="my-2 shrink-0 text-text-3" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-card border border-border bg-surface p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <h2 className="font-display text-sm font-semibold">Multi-tenancy &amp; security</h2>
        <p className="mt-2 max-w-3xl text-sm text-text-2">
          Every organisation&apos;s data lives in the same database, in the same tables — what keeps one org from
          ever seeing another org&apos;s projects isn&apos;t application code, it&apos;s Postgres Row-Level
          Security policies attached directly to the tables. Even a bug in the app&apos;s own queries can&apos;t
          leak data across orgs, because the database itself refuses the query. Sign-up is invite-only —
          there&apos;s no public registration, every account is created by an org admin or an invite link.
        </p>
      </div>

      <div className="rounded-card border border-border bg-surface p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <h2 className="font-display text-sm font-semibold">Deployment</h2>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-2">
          <IconBrandGithub size={16} className="text-text-3" />
          Code is pushed to GitHub, deployed to Vercel — database schema changes are tracked as migrations and
          applied through the Supabase CLI, never by hand against the live database.
        </p>
      </div>

      <div>
        <h2 className="mb-3 font-display text-sm font-semibold">Technology stack</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STACK.map((item) => (
            <div
              key={item.name}
              className="rounded-card border border-border bg-surface p-4"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div
                className="mb-3 flex h-9 w-9 items-center justify-center rounded-control"
                style={{ background: "var(--surface-2)", color: "var(--brass)" }}
              >
                <item.icon size={18} stroke={1.75} />
              </div>
              <h3 className="font-display text-sm font-semibold">{item.name}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-text-2">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
