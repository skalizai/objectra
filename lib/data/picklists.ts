import { createClient } from "@/lib/supabase/server";
import type { Picklist, PicklistType } from "@/lib/types/database";

export interface PicklistBundle {
  modules: Picklist[];
  complexities: Picklist[];
  statuses: Picklist[];
  companyCodes: Picklist[];
  streams: Picklist[];
  projectRoles: Picklist[];
}

export async function getPicklists(orgId: string): Promise<PicklistBundle> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("picklists")
    .select("*")
    .eq("org_id", orgId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const rows = (data ?? []) as Picklist[];
  const byType = (type: PicklistType) => rows.filter((r) => r.type === type);

  return {
    modules: byType("module"),
    complexities: byType("complexity"),
    statuses: byType("status"),
    companyCodes: byType("company_code"),
    streams: byType("stream"),
    projectRoles: byType("project_role"),
  };
}
