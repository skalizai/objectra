"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { IconSearch } from "@tabler/icons-react";
import { useModules } from "@/components/providers/picklist-provider";
import { BacklogStatusPill } from "@/components/backlog/backlog-status-pill";
import { BacklogItemDrawer } from "@/components/backlog/backlog-item-drawer";
import { BacklogDashboard } from "@/components/backlog/backlog-dashboard";
import { sendForApproval, sendToClient } from "@/lib/actions/backlog";
import { BACKLOG_STREAMS, type BacklogItem, type BacklogItemStatus, type BacklogPackage, type BacklogStream } from "@/lib/types/database";

const STATUS_OPTIONS: (BacklogItemStatus | "all")[] = [
  "all", "registered", "sent_for_approval", "approved", "rejected", "on_hold", "moved_to_objects",
];

/** Registered -> sent_for_approval, notifying the project's PM Approver --
 * the internal review gate. No client reference needed here; that's
 * SendToClientBar's job, once an item has actually cleared this step. */
function SendForApprovalBar({
  projectId,
  selectedIds,
  approverName,
  onClear,
  onSent,
}: {
  projectId: string;
  selectedIds: string[];
  approverName: string | null;
  onClear: () => void;
  onSent: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setError(null);
    setPending(true);
    const result = await sendForApproval(projectId, selectedIds);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onSent();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-control border px-3 py-2.5 text-sm" style={{ borderColor: "var(--brass)" }}>
      <span className="text-text-2">
        {selectedIds.length} item{selectedIds.length === 1 ? "" : "s"} selected
        {approverName && <> — notifies <span className="text-text">{approverName}</span></>}
      </span>
      <button
        onClick={send}
        disabled={pending}
        className="h-8 rounded-[7px] px-3 text-xs font-medium text-on-brass disabled:opacity-50"
        style={{ background: "var(--brass)" }}
      >
        {pending ? "Sending…" : "Send for approval"}
      </button>
      <button onClick={onClear} className="text-xs text-text-3 hover:text-text-2">Cancel</button>
      {error && <span className="text-xs" style={{ color: "var(--status-overdue)" }}>{error}</span>}
    </div>
  );
}

/** Approved items only -- a separate, optional step to loop the client in
 * once an item has already cleared internal PM review. Doesn't change the
 * item's status; just stamps a client reference and sends the summary
 * email that used to fire directly off "Send for approval". */
function SendToClientBar({
  projectId,
  selectedIds,
  onClear,
  onSent,
}: {
  projectId: string;
  selectedIds: string[];
  onClear: () => void;
  onSent: () => void;
}) {
  const [crNo, setCrNo] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setError(null);
    setPending(true);
    const result = await sendToClient(projectId, selectedIds, crNo);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setCrNo("");
    onSent();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-control border px-3 py-2.5 text-sm" style={{ borderColor: "var(--status-live)" }}>
      <span className="text-text-2">{selectedIds.length} approved item{selectedIds.length === 1 ? "" : "s"} selected</span>
      <input
        value={crNo}
        onChange={(e) => setCrNo(e.target.value)}
        placeholder="CR number (e.g. CR002)"
        className="h-8 rounded-[7px] border border-border-2 bg-surface-2 px-2.5 text-xs text-text focus:border-brass focus-visible:outline-none"
      />
      <button
        onClick={send}
        disabled={pending || !crNo.trim()}
        className="h-8 rounded-[7px] px-3 text-xs font-medium text-white disabled:opacity-50"
        style={{ background: "var(--status-live)" }}
      >
        {pending ? "Sending…" : "Send to client"}
      </button>
      <button onClick={onClear} className="text-xs text-text-3 hover:text-text-2">Cancel</button>
      {error && <span className="text-xs" style={{ color: "var(--status-overdue)" }}>{error}</span>}
    </div>
  );
}

export function BacklogRegister({
  projectId,
  items,
  canEdit,
  approverName,
}: {
  projectId: string;
  items: BacklogItem[];
  canEdit: boolean;
  approverName: string | null;
}) {
  const router = useRouter();
  const modules = useModules();
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [streamFilter, setStreamFilter] = useState<BacklogStream | "all">("all");
  const [statusFilter, setStatusFilter] = useState<BacklogItemStatus | "all">("all");
  const [packageFilter, setPackageFilter] = useState<BacklogPackage | "all">("all");
  const [devCompletedFilter, setDevCompletedFilter] = useState<"all" | "yes" | "no">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openItem, setOpenItem] = useState<BacklogItem | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (q && !`${i.description} ${i.item_no ?? ""}`.toLowerCase().includes(q)) return false;
      if (moduleFilter !== "all" && i.module !== moduleFilter) return false;
      if (streamFilter !== "all" && i.stream !== streamFilter) return false;
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (packageFilter !== "all" && i.package !== packageFilter) return false;
      if (devCompletedFilter !== "all" && i.dev_completed !== (devCompletedFilter === "yes")) return false;
      return true;
    });
  }, [items, search, moduleFilter, streamFilter, statusFilter, packageFilter, devCompletedFilter]);

  // Checkboxes are selectable on both registered (-> send for approval)
  // and approved (-> send to client) rows; which action bar shows depends
  // on which subset the current selection falls into.
  const registeredIds = filtered.filter((i) => i.status === "registered").map((i) => i.id);
  const approvedIds = filtered.filter((i) => i.status === "approved").map((i) => i.id);
  const selectedRegisteredIds = Array.from(selected).filter((id) => registeredIds.includes(id));
  const selectedApprovedIds = Array.from(selected).filter((id) => approvedIds.includes(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function refresh() {
    setOpenItem(null);
    setSelected(new Set());
    router.refresh();
  }

  const selectClass =
    "h-9 rounded-control border border-border-2 bg-surface-2 px-2.5 text-sm text-text-2 focus:border-brass focus-visible:outline-none";

  return (
    <div>
      <BacklogDashboard items={items} packageFilter={packageFilter} onPackageFilterChange={setPackageFilter} />

      <div className="flex flex-wrap items-center gap-2 pb-4">
        <div className="relative flex-1 min-w-[200px]">
          <IconSearch size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description or item no…"
            className="h-9 w-full rounded-control border border-border-2 bg-surface-2 pl-9 pr-3 text-sm text-text placeholder:text-text-3 focus:border-brass focus-visible:outline-none"
          />
        </div>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as BacklogItemStatus | "all")} className={selectClass}>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === "all" ? "All statuses" : s.replace(/_/g, " ")}</option>)}
        </select>

        {modules.length > 0 && (
          <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className={selectClass}>
            <option value="all">All modules</option>
            {modules.map((m) => <option key={m.id} value={m.value}>{m.value}</option>)}
          </select>
        )}

        <select value={streamFilter} onChange={(e) => setStreamFilter(e.target.value as BacklogStream | "all")} className={selectClass}>
          <option value="all">All streams</option>
          {BACKLOG_STREAMS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={devCompletedFilter} onChange={(e) => setDevCompletedFilter(e.target.value as "all" | "yes" | "no")} className={selectClass}>
          <option value="all">Dev completed: all</option>
          <option value="yes">Dev completed: yes</option>
          <option value="no">Dev completed: no</option>
        </select>
      </div>

      {canEdit && (selectedRegisteredIds.length > 0 || selectedApprovedIds.length > 0) && (
        <div className="space-y-2 pb-4">
          {selectedRegisteredIds.length > 0 && (
            <SendForApprovalBar
              projectId={projectId}
              selectedIds={selectedRegisteredIds}
              approverName={approverName}
              onClear={() => setSelected(new Set())}
              onSent={refresh}
            />
          )}
          {selectedApprovedIds.length > 0 && (
            <SendToClientBar
              projectId={projectId}
              selectedIds={selectedApprovedIds}
              onClear={() => setSelected(new Set())}
              onSent={refresh}
            />
          )}
        </div>
      )}

      <div className="scroll-x-top overflow-x-auto rounded-card border border-border">
        <table className="w-full min-w-[1450px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-left text-xs text-text-3">
              {canEdit && <th className="w-10 px-4 py-2.5"></th>}
              <th className="px-4 py-2.5 font-medium">Item no</th>
              <th className="px-4 py-2.5 font-medium">Package</th>
              <th className="px-4 py-2.5 font-medium">Stream</th>
              <th className="px-4 py-2.5 font-medium">Description</th>
              <th className="px-4 py-2.5 font-medium">Module</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Complexity</th>
              <th className="px-4 py-2.5 font-medium">Dev days</th>
              <th className="px-4 py-2.5 font-medium">Func days</th>
              <th className="px-4 py-2.5 font-medium">Fiori days</th>
              <th className="px-4 py-2.5 font-medium">CR no</th>
              <th className="px-4 py-2.5 font-medium">Dev completed</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, i) => (
              <motion.tr
                key={item.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.4) }}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-2"
              >
                {canEdit && (
                  <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                    {(item.status === "registered" || item.status === "approved") && (
                      <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} />
                    )}
                  </td>
                )}
                <td className="px-4 py-2.5 font-mono text-xs text-text-2" onClick={() => setOpenItem(item)}>{item.item_no || "—"}</td>
                <td className="px-4 py-2.5 text-text-2" onClick={() => setOpenItem(item)}>{item.package || "—"}</td>
                <td className="px-4 py-2.5 text-text-2" onClick={() => setOpenItem(item)}>{item.stream || "—"}</td>
                <td className="px-4 py-2.5" onClick={() => setOpenItem(item)}>
                  <span className="line-clamp-1 max-w-[320px] text-text">{item.description}</span>
                </td>
                <td className="px-4 py-2.5 text-text-2" onClick={() => setOpenItem(item)}>{item.module || "—"}</td>
                <td className="px-4 py-2.5 text-text-2" onClick={() => setOpenItem(item)}>{item.dev_type || "—"}</td>
                <td className="px-4 py-2.5 text-text-2" onClick={() => setOpenItem(item)}>{item.complexity || "—"}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-text-2" onClick={() => setOpenItem(item)}>{item.dev_days.toFixed(1)}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-text-2" onClick={() => setOpenItem(item)}>{item.func_days.toFixed(1)}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-text-2" onClick={() => setOpenItem(item)}>{item.fiori_days.toFixed(1)}</td>
                <td className="px-4 py-2.5 text-text-2" onClick={() => setOpenItem(item)}>{item.cr_no || "—"}</td>
                <td className="px-4 py-2.5 text-text-2" onClick={() => setOpenItem(item)}>{item.dev_completed ? "Yes" : "No"}</td>
                <td className="px-4 py-2.5" onClick={() => setOpenItem(item)}>
                  <BacklogStatusPill status={item.status} />
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-text-3">No backlog items match these filters.</p>
        )}
      </div>

      <BacklogItemDrawer
        item={openItem}
        projectId={projectId}
        canEdit={canEdit}
        approverName={approverName}
        onClose={() => setOpenItem(null)}
        onChanged={refresh}
      />
    </div>
  );
}
