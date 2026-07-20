import * as XLSX from "xlsx";
import type { ObjectStatus, ObjectType } from "@/lib/types/database";

export interface ParsedObjectRow {
  wricef_id: string | null;
  object_type: ObjectType;
  title: string;
  description: string | null;
  module: string | null;
  wave: string | null;
  sprint: string | null;
  lob: string | null;
  clean_core: string | null;
  complexity: string | null;
  go_live_critical: boolean;
  priority: string | null;
  priority_rank: number | null;
  status: ObjectStatus;
  company_code: string | null;
  customizing_request: string | null;
  transport_requests: string | null;
  transport_type: string | null;
  efforts: string | null;
  impact_code: string | null;
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
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Excel's date epoch is 1899-12-30 (it treats 1900 as a leap year, which it
 * wasn't — 25569 is the day-count offset between that epoch and 1970-01-01). */
function excelSerialToIso(serial: number): string | null {
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/**
 * Parses the mixed date formats found in WRICEF trackers: ISO, dd.mm.yy /
 * dd-mm-yy / dd/mm/yy, dd-Mon-yyyy, and 5-digit Excel serials. Unparseable
 * values return iso: null but keep the raw string so nothing is lost.
 */
export function parseFlexibleDate(value: unknown): { iso: string | null; raw: string } {
  if (value === null || value === undefined || value === "") return { iso: null, raw: "" };
  const raw = String(value).trim();
  if (!raw) return { iso: null, raw: "" };

  if (typeof value === "number" && value > 20000 && value < 60000) {
    const iso = excelSerialToIso(value);
    if (iso) return { iso, raw };
  }
  if (/^\d{4,6}$/.test(raw)) {
    const iso = excelSerialToIso(Number(raw));
    if (iso) return { iso, raw };
  }

  let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const iso = `${m[1]}-${m[2]}-${m[3]}`;
    if (!Number.isNaN(new Date(`${iso}T00:00:00Z`).getTime())) return { iso, raw };
  }

  m = raw.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2}|\d{4})$/);
  if (m) {
    const [, dd, mm, yy] = m;
    const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
    const day = Number(dd);
    const month = Number(mm);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (!Number.isNaN(new Date(`${iso}T00:00:00Z`).getTime())) return { iso, raw };
    }
  }

  m = raw.match(/^(\d{1,2})-([A-Za-z]{3,})-(\d{2}|\d{4})$/);
  if (m) {
    const [, dd, mon, yy] = m;
    const monthIndex = MONTHS.indexOf(mon.slice(0, 3).toLowerCase());
    if (monthIndex >= 0) {
      const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
      const iso = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${dd.padStart(2, "0")}`;
      if (!Number.isNaN(new Date(`${iso}T00:00:00Z`).getTime())) return { iso, raw };
    }
  }

  return { iso: null, raw };
}

export function derivePriorityRank(priority: string | null): number | null {
  if (!priority) return null;
  const m = priority.trim().match(/^(\d+)/);
  return m ? Number(m[1]) : null;
}

const OBJECT_TYPES: ObjectType[] = [
  "Workflow",
  "Report",
  "Interface",
  "Conversion",
  "Enhancement",
  "Form",
  "Application",
];
const TYPE_BY_LETTER: Record<string, ObjectType> = {
  W: "Workflow",
  R: "Report",
  I: "Interface",
  C: "Conversion",
  E: "Enhancement",
  F: "Form",
  A: "Application",
};

function normalizeObjectType(raw: string | null, wricefId: string | null): ObjectType {
  if (raw) {
    const match = OBJECT_TYPES.find((t) => t.toLowerCase() === raw.trim().toLowerCase());
    if (match) return match;
    const byLetter = TYPE_BY_LETTER[raw.trim()[0]?.toUpperCase()];
    if (byLetter) return byLetter;
  }
  const prefix = wricefId?.trim()[0]?.toUpperCase();
  return (prefix && TYPE_BY_LETTER[prefix]) || "Application";
}

// Maps common tracker phrasings onto the default status picklist seeded in
// supabase/seed.sql. If the org has since renamed/replaced its statuses in
// Settings, an unrecognized value just passes through as-is — status is
// free text, so it still imports, it just won't match a known colour until
// an admin adds it (or renames an existing entry) in Settings.
const STATUS_ALIASES: Record<string, string> = {
  "in progress": "In Progress",
  "dev/func testing": "Dev/Func Testing",
  "dev func testing": "Dev/Func Testing",
  "development": "Dev/Func Testing",
  "functional testing": "Dev/Func Testing",
  "testing in q": "Testing in QA",
  "testing in qa": "Testing in QA",
  "qa testing": "Testing in QA",
  "validation": "Validation",
  "uat": "Validation",
  "live": "Live",
  "go live": "Live",
  "completed": "Live",
  "done": "Live",
  "process pending": "Process/Pending",
  "pending": "Process/Pending",
  "not started": "Process/Pending",
};

function normalizeStatus(raw: string | null): ObjectStatus {
  if (!raw || !raw.trim()) return "Process/Pending";
  return STATUS_ALIASES[raw.trim().toLowerCase()] ?? raw.trim();
}

// Sheet header -> canonical field, matched after lowercasing and stripping
// everything but letters/digits (so "WRICEF ID", "wricef_id", "Wricef-Id"
// all normalize to "wricefid"). Tune this map to the client's actual
// column headers if they differ from the reference tracker template.
const HEADER_MAP: Record<string, string> = {
  wricefid: "wricef_id",
  objecttype: "object_type",
  type: "object_type",
  title: "title",
  description: "description",
  module: "module",
  wave: "wave",
  sprint: "sprint",
  lob: "lob",
  cleancore: "clean_core",
  complexity: "complexity",
  golivecritical: "go_live_critical",
  fdsreceived: "fds_received",
  fds: "fds_received",
  priority: "priority",
  status: "status",
  companycode: "company_code",
  customizingrequest: "customizing_request",
  transportrequests: "transport_requests",
  transportrequest: "transport_requests",
  transporttype: "transport_type",
  efforts: "efforts",
  effort: "efforts",
  impactcode: "impact_code",
  duedate: "due_date",
  plannedfsd: "planned_fsd",
  fsd: "planned_fsd",
  devstart: "dev_start",
  devbaseline: "dev_baseline",
  devplanned: "dev_planned",
  devactual: "dev_actual",
  adminnote: "admin_note",
  comments: "comments",
  comments2: "comments2",
  comment2: "comments2",
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const DATE_FIELDS = ["due_date", "planned_fsd", "dev_start", "dev_baseline", "dev_planned", "dev_actual"] as const;

export function parseWricefWorkbook(buffer: ArrayBuffer): ParsedObjectRow[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const sheetName = workbook.SheetNames.includes("Details") ? "Details" : workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  return rows
    .map((row): ParsedObjectRow | null => {
      const mapped: Record<string, unknown> = {};
      for (const [header, value] of Object.entries(row)) {
        const field = HEADER_MAP[normalizeHeader(header)];
        if (field) mapped[field] = value;
      }

      const title = String(mapped.title ?? "").trim();
      if (!title) return null; // skip blank/separator rows

      const wricefId = mapped.wricef_id ? String(mapped.wricef_id).trim() : null;
      const priority = mapped.priority ? String(mapped.priority).trim() : null;

      const dates: Record<string, { iso: string | null; raw: string }> = {};
      for (const field of DATE_FIELDS) {
        dates[field] = parseFlexibleDate(mapped[field]);
      }

      return {
        wricef_id: wricefId,
        object_type: normalizeObjectType(mapped.object_type ? String(mapped.object_type) : null, wricefId),
        title,
        description: mapped.description ? String(mapped.description) : null,
        module: mapped.module ? String(mapped.module).trim() : null,
        wave: mapped.wave ? String(mapped.wave).trim() : null,
        sprint: mapped.sprint ? String(mapped.sprint).trim() : null,
        lob: mapped.lob ? String(mapped.lob).trim() : null,
        clean_core: mapped.clean_core ? String(mapped.clean_core).trim() : null,
        complexity: mapped.complexity ? String(mapped.complexity).trim() : null,
        go_live_critical: /^(y|yes|true|1)$/i.test(String(mapped.go_live_critical ?? "").trim()),
        priority,
        priority_rank: derivePriorityRank(priority),
        status: normalizeStatus(mapped.status ? String(mapped.status) : null),
        company_code: mapped.company_code ? String(mapped.company_code).trim() : null,
        customizing_request: mapped.customizing_request ? String(mapped.customizing_request).trim() : null,
        transport_requests: mapped.transport_requests ? String(mapped.transport_requests).trim() : null,
        transport_type: mapped.transport_type ? String(mapped.transport_type).trim() : null,
        efforts: mapped.efforts ? String(mapped.efforts).trim() : null,
        impact_code: mapped.impact_code ? String(mapped.impact_code).trim() : null,
        due_date: dates.due_date.iso,
        due_date_raw: dates.due_date.raw || null,
        planned_fsd: dates.planned_fsd.iso,
        planned_fsd_raw: dates.planned_fsd.raw || null,
        dev_start: dates.dev_start.iso,
        dev_start_raw: dates.dev_start.raw || null,
        dev_baseline: dates.dev_baseline.iso,
        dev_baseline_raw: dates.dev_baseline.raw || null,
        dev_planned: dates.dev_planned.iso,
        dev_planned_raw: dates.dev_planned.raw || null,
        dev_actual: dates.dev_actual.iso,
        dev_actual_raw: dates.dev_actual.raw || null,
        admin_note: mapped.admin_note ? String(mapped.admin_note) : null,
        comments: mapped.comments ? String(mapped.comments) : null,
        comments2: mapped.comments2 ? String(mapped.comments2) : null,
        fds_received: /^(y|yes|true|1)$/i.test(String(mapped.fds_received ?? "").trim()),
      };
    })
    .filter((r): r is ParsedObjectRow => r !== null);
}
