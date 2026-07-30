"use client";

import { useState } from "react";
import { IconAlertCircle, IconPencil } from "@tabler/icons-react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useModules } from "@/components/providers/picklist-provider";
import { updateResource } from "@/lib/actions/resources";
import type { ResourceWithAllocation } from "@/lib/data/resources";

const selectClass =
  "h-10 w-full rounded-control border border-border-2 bg-surface-2 px-3 text-sm text-text focus:border-brass focus-visible:outline-none";
const ALLOCATIONS = [25, 50, 75, 100];

export function EditResourceButton({ resource }: { resource: ResourceWithAllocation }) {
  const modules = useModules();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(resource.full_name);
  const [email, setEmail] = useState(resource.email);
  const [consultantType, setConsultantType] = useState(resource.consultant_type ?? "");
  const [roleTitle, setRoleTitle] = useState(resource.role_title ?? "");
  const [primaryModule, setPrimaryModule] = useState(resource.primary_module ?? "");
  const [location, setLocation] = useState(resource.location ?? "");
  const [allocationPct, setAllocationPct] = useState(resource.allocation_pct ?? 50);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDrawer() {
    setFullName(resource.full_name);
    setEmail(resource.email);
    setConsultantType(resource.consultant_type ?? "");
    setRoleTitle(resource.role_title ?? "");
    setPrimaryModule(resource.primary_module ?? "");
    setLocation(resource.location ?? "");
    setAllocationPct(resource.allocation_pct ?? 50);
    setError(null);
    setOpen(true);
  }

  async function handleSave() {
    setPending(true);
    setError(null);
    const result = await updateResource(resource.id, {
      full_name: fullName,
      email,
      consultant_type: consultantType || null,
      role_title: roleTitle || null,
      primary_module: primaryModule || null,
      location: location || null,
      allocation_pct: allocationPct,
    });
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={openDrawer}
        className="flex items-center gap-1 text-xs text-text-3 hover:text-brass"
      >
        <IconPencil size={13} />
        Edit
      </button>

      <Drawer open={open} onClose={() => setOpen(false)} title="Edit resource">
        <div className="space-y-4">
          {error && (
            <div
              className="flex items-start gap-2 rounded-control border px-3 py-2.5 text-sm"
              style={{ borderColor: "var(--status-overdue)", color: "var(--status-overdue)" }}
            >
              <IconAlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="edit_full_name">Name</Label>
            <Input id="edit_full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="edit_email">Email</Label>
            <Input id="edit_email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit_type">Functional, Technical or PMO</Label>
              <select
                id="edit_type"
                className={selectClass}
                value={consultantType}
                onChange={(e) => setConsultantType(e.target.value)}
              >
                <option value="">—</option>
                <option value="functional">Functional</option>
                <option value="technical">Technical</option>
                <option value="pmo">PMO</option>
              </select>
            </div>
            <div>
              <Label htmlFor="edit_role">Role</Label>
              <Input
                id="edit_role"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="Senior Consultant"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit_area">Area</Label>
              <select
                id="edit_area"
                className={selectClass}
                value={primaryModule}
                onChange={(e) => setPrimaryModule(e.target.value)}
              >
                <option value="">—</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.value}>{m.value}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="edit_location">Onsite or offshore</Label>
              <select
                id="edit_location"
                className={selectClass}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                <option value="">—</option>
                <option value="onsite">Onsite</option>
                <option value="offshore">Offshore</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="edit_allocation">Allocation %</Label>
            <select
              id="edit_allocation"
              className={selectClass}
              value={allocationPct}
              onChange={(e) => setAllocationPct(Number(e.target.value))}
            >
              {ALLOCATIONS.map((pct) => (
                <option key={pct} value={pct}>{pct}%</option>
              ))}
            </select>
          </div>

          <Button onClick={handleSave} className="w-full" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </Drawer>
    </>
  );
}
