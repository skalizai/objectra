"use client";

import { useActionState, useState } from "react";
import { IconAlertCircle, IconCircleCheck, IconUpload } from "@tabler/icons-react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { importObjectsFromXlsx, type ImportState } from "@/lib/actions/import";

const initialState: ImportState = { error: null, imported: null };

export function ImportXlsxButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const boundAction = importObjectsFromXlsx.bind(null, projectId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <IconUpload size={15} />
        Import .xlsx
      </Button>

      <Drawer open={open} onClose={() => setOpen(false)} title="Import WRICEF objects">
        <form action={formAction} className="space-y-4">
          <p className="text-sm text-text-2">
            Upload the WRICEF Status Tracker workbook. Rows are read from the{" "}
            <span className="font-mono text-text">Details</span> sheet and added to this project — existing
            objects aren&apos;t touched, so re-importing adds another batch.
          </p>

          {state.error && (
            <div
              className="flex items-start gap-2 rounded-control border px-3 py-2.5 text-sm"
              style={{ borderColor: "var(--status-overdue)", color: "var(--status-overdue)" }}
            >
              <IconAlertCircle size={16} className="mt-0.5 shrink-0" />
              {state.error}
            </div>
          )}

          {state.imported !== null && !state.error && (
            <div
              className="flex items-start gap-2 rounded-control border px-3 py-2.5 text-sm"
              style={{ borderColor: "var(--status-live)", color: "var(--status-live)" }}
            >
              <IconCircleCheck size={16} className="mt-0.5 shrink-0" />
              Imported {state.imported} object{state.imported === 1 ? "" : "s"}.
            </div>
          )}

          <div>
            <Label htmlFor="file">Workbook (.xlsx)</Label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".xlsx"
              required
              className="block w-full text-sm text-text-2 file:mr-3 file:rounded-control file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-sm file:text-text hover:file:bg-border-2"
            />
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Importing…" : "Import objects"}
          </Button>
        </form>
      </Drawer>
    </>
  );
}
