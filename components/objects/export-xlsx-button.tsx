"use client";

import { IconDownload } from "@tabler/icons-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import type { ObjectWithAssignees } from "@/lib/data/objects";

function consultantName(obj: ObjectWithAssignees, role: "functional" | "developer") {
  return obj.assignees.find((a) => a.assigned_role === role)?.resource.full_name ?? "";
}

/** Exports whatever rows the caller currently has visible (post search/type/
 * status/module filters) as an .xlsx workbook, entirely client-side — same
 * `xlsx` package already used server-side for import, loaded on demand so it
 * doesn't add to every page's initial bundle. */
export function ExportXlsxButton({
  objects,
  projectName,
}: {
  objects: ObjectWithAssignees[];
  projectName: string;
}) {
  async function handleExport() {
    const XLSX = await import("xlsx");

    const rows = objects.map((o) => ({
      "Object ID": o.wricef_id ?? "",
      Title: o.title,
      Type: o.object_type,
      Module: o.module ?? "",
      Complexity: o.complexity ?? "",
      "Company code": o.company_code ?? "",
      "Business unit": o.business_unit ?? "",
      Stream: o.stream ?? "",
      Wave: o.wave ?? "",
      Priority: o.priority ?? "",
      "Functional consultant": consultantName(o, "functional"),
      "Technical consultant": consultantName(o, "developer"),
      "FDS received": o.fds_received ? "Yes" : "No",
      "Due date": o.due_date ? format(new Date(o.due_date), "yyyy-MM-dd") : "",
      Status: o.status,
      Description: o.description ?? "",
      Comments: o.comments ?? "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Objects");

    const safeName = projectName.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "objects";
    XLSX.writeFile(workbook, `${safeName}-objects-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={objects.length === 0} className="gap-2">
      <IconDownload size={15} />
      Export .xlsx
    </Button>
  );
}
