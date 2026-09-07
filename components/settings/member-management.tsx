"use client";

import { useState } from "react";
import { IconAlertCircle } from "@tabler/icons-react";
import { setMemberActive, updateMemberEmail, updateMemberName, updateMemberProjectRole } from "@/lib/actions/settings";
import type { MemberWithMemberships } from "@/lib/data/members";
import type { ProjectMemberRole } from "@/lib/types/database";

const ROLE_LABEL: Record<ProjectMemberRole, string> = {
  project_manager: "Project manager",
  technical_lead: "Technical lead",
  pmo: "PMO",
  member: "Member",
  client: "Client",
  super_user: "Super user",
};

const selectClass =
  "h-8 rounded-[7px] border border-border-2 bg-surface-2 px-2 text-xs text-text-2 focus:border-brass focus-visible:outline-none";
const inputClass =
  "h-8 rounded-[7px] border border-border-2 bg-transparent px-2 text-sm text-text focus:border-brass focus-visible:outline-none";

export function MemberManagement({ members }: { members: MemberWithMemberships[] }) {
  const [rows, setRows] = useState(members);
  // See ResourcesTable for why this resync is needed.
  const [prevMembers, setPrevMembers] = useState(members);
  if (members !== prevMembers) {
    setPrevMembers(members);
    setRows(members);
  }
  const [emailErrors, setEmailErrors] = useState<Record<string, string>>({});

  async function saveEmail(memberId: string, currentEmail: string, nextEmail: string, input: HTMLInputElement) {
    if (nextEmail === currentEmail) return;
    setEmailErrors((prev) => {
      const next = { ...prev };
      delete next[memberId];
      return next;
    });
    const result = await updateMemberEmail(memberId, nextEmail);
    if (result.error) {
      setEmailErrors((prev) => ({ ...prev, [memberId]: result.error! }));
      input.value = currentEmail; // the rejected value would otherwise keep showing — this input is uncontrolled
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === memberId ? { ...r, email: nextEmail } : r)));
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <h3 className="font-display text-sm font-semibold">Member management</h3>
      <p className="mt-1 text-xs text-text-3">
        Edit a member&apos;s name, login email, or their role on each project — Project Manager and
        Technical Lead can manage the project; PMO can&apos;t edit but can be added to a project&apos;s
        object status emails from that project&apos;s Settings; Member is invite-only and can only update
        status/comments on their own assigned objects. Changing the email here changes what they sign in
        with.
      </p>

      <ul className="mt-4 divide-y divide-border">
        {rows.map((m) => (
          <li key={m.id} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <input
                  defaultValue={m.full_name}
                  className={`${inputClass} w-full max-w-xs`}
                  onBlur={(e) => {
                    const fullName = e.target.value;
                    if (fullName === m.full_name) return;
                    setRows((prev) => prev.map((r) => (r.id === m.id ? { ...r, full_name: fullName } : r)));
                    void updateMemberName(m.id, fullName);
                  }}
                />
                <input
                  type="email"
                  defaultValue={m.email}
                  className={`${inputClass} mt-0.5 w-full max-w-xs text-xs text-text-3`}
                  onBlur={(e) => void saveEmail(m.id, m.email, e.target.value.trim(), e.target)}
                />
                {emailErrors[m.id] && (
                  <div className="mt-0.5 flex items-center gap-1 text-[11px]" style={{ color: "var(--status-overdue)" }}>
                    <IconAlertCircle size={11} />
                    {emailErrors[m.id]}
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 text-xs text-text-2">
                <input
                  type="checkbox"
                  checked={m.is_active}
                  onChange={(e) => {
                    const isActive = e.target.checked;
                    setRows((prev) => prev.map((r) => (r.id === m.id ? { ...r, is_active: isActive } : r)));
                    void setMemberActive(m.id, isActive);
                  }}
                />
                Active
              </label>
            </div>

            {m.memberships.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 pl-1">
                {m.memberships.map((membership) => (
                  <div
                    key={membership.id}
                    className="flex items-center gap-1.5 rounded-control border border-border bg-surface-2 px-2 py-1"
                  >
                    <span className="text-xs text-text-3">{membership.project_name}</span>
                    <select
                      className={selectClass}
                      defaultValue={membership.role}
                      onChange={(e) => {
                        const role = e.target.value as ProjectMemberRole;
                        void updateMemberProjectRole(membership.id, role);
                      }}
                    >
                      {Object.entries(ROLE_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
