import { createClient } from "@/lib/supabase/server";
import type { BacklogItem, BacklogItemWithCost, BacklogRateSettings } from "@/lib/types/database";

// Mirrors the defaults on backlog_rate_settings (0034_backlog_items.sql) --
// only used if a project somehow has no settings row yet (shouldn't happen,
// createProject() seeds one, but a fallback here keeps the register usable
// rather than dividing by undefined rates).
const DEFAULT_RATES: Omit<BacklogRateSettings, "id" | "project_id" | "created_at" | "updated_at"> = {
  tech_rate: 40,
  func_rate: 45,
  pmo_rate: 50,
  fiori_rate: 40,
  hours_per_day: 8,
  monthly_hours: 160,
  pmo_half_time_factor: 0.5,
  project_months: 3,
  pgls_months: 1,
};

export async function getBacklogRateSettings(projectId: string): Promise<BacklogRateSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("backlog_rate_settings")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  if (data) return data as BacklogRateSettings;
  return {
    id: "",
    project_id: projectId,
    ...DEFAULT_RATES,
    created_at: "",
    updated_at: "",
  };
}

/** PMO/PGLS cost, Total Days, and Total Cost are computed here rather than
 * stored -- see the design note in 0034_backlog_items.sql. PMO/PGLS cost is
 * a project-wide pool (rate x hours x factors) divided evenly across every
 * *registered* item (any status other than 'rejected' -- a rejected item
 * never consumed PM/support capacity, so it shouldn't shrink everyone
 * else's share). Items with zero Dev Days are treated as email/
 * notification-only, same rule the Excel version used: half the standard
 * PMO share, and PGLS covers the functional portion only. */
export function withComputedCost(items: BacklogItem[], rates: BacklogRateSettings): BacklogItemWithCost[] {
  const poolItems = items.filter((i) => i.status !== "rejected");
  const itemCount = poolItems.length || 1;

  const pmoTotalPool = rates.pmo_rate * rates.monthly_hours * rates.pmo_half_time_factor * rates.project_months;
  const pmoPerItem = pmoTotalPool / itemCount;
  const pglsPerItemFull = (rates.pgls_months * rates.monthly_hours * (rates.tech_rate + rates.func_rate)) / itemCount;
  const pglsPerItemFuncOnly = (rates.pgls_months * rates.monthly_hours * rates.func_rate) / itemCount;

  return items.map((item) => {
    const isNotification = item.dev_days === 0;
    const isRejected = item.status === "rejected";
    const pmoCost = isRejected ? 0 : isNotification ? pmoPerItem / 2 : pmoPerItem;
    const pglsCost = isRejected ? 0 : isNotification ? pglsPerItemFuncOnly : pglsPerItemFull;
    const totalDays = item.dev_days + item.fiori_days + item.func_days;
    const totalCost = item.dev_cost + item.fiori_cost + item.func_cost + pmoCost + pglsCost;
    return { ...item, pmo_cost: pmoCost, pgls_cost: pglsCost, total_days: totalDays, total_cost: totalCost };
  });
}

/** RLS (backlog_items_select) scopes this to org_admin/PM/technical_lead --
 * every other role gets zero rows, matching the "cost data stays internal"
 * decision. */
export async function getBacklogItems(projectId: string): Promise<BacklogItemWithCost[]> {
  const supabase = await createClient();
  const [{ data }, rates] = await Promise.all([
    supabase.from("backlog_items").select("*").eq("project_id", projectId).order("created_at", { ascending: true }),
    getBacklogRateSettings(projectId),
  ]);

  return withComputedCost((data ?? []) as BacklogItem[], rates);
}

export async function getBacklogItemWithCost(itemId: string, projectId: string): Promise<BacklogItemWithCost | null> {
  const items = await getBacklogItems(projectId);
  return items.find((i) => i.id === itemId) ?? null;
}
