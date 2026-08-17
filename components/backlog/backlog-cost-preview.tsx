"use client";

import { useCallback, useMemo, useState } from "react";
import type { BacklogRateSettings } from "@/lib/types/database";

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** Live Dev/Fiori/Functional cost preview as the user types days into the
 * create/edit form -- mirrors the Excel workbook's live formulas. PMO/PGLS
 * cost isn't shown here since it depends on the project's final registered
 * item count, only known after saving (see lib/data/backlog.ts). */
export function useCostPreview(rates: BacklogRateSettings) {
  const [devDays, setDevDays] = useState(0);
  const [fioriDays, setFioriDays] = useState(0);
  const [funcDays, setFuncDays] = useState(0);

  const devCost = devDays * rates.hours_per_day * rates.tech_rate;
  const fioriCost = fioriDays * rates.hours_per_day * rates.fiori_rate;
  const funcCost = funcDays * rates.hours_per_day * rates.func_rate;
  const totalDays = devDays + fioriDays + funcDays;
  const totalCost = devCost + fioriCost + funcCost;

  const reset = useCallback(() => {
    setDevDays(0);
    setFioriDays(0);
    setFuncDays(0);
  }, []);

  return useMemo(
    () => ({ devDays, fioriDays, funcDays, devCost, fioriCost, funcCost, totalDays, totalCost, setDevDays, setFioriDays, setFuncDays, reset }),
    [devDays, fioriDays, funcDays, devCost, fioriCost, funcCost, totalDays, totalCost, reset],
  );
}

export function BacklogCostPreview({ preview }: { preview: ReturnType<typeof useCostPreview> }) {
  return (
    <div className="rounded-control border border-border-2 bg-surface-2 px-3 py-2.5 text-xs text-text-2">
      <div className="flex items-center justify-between">
        <span>Dev {money(preview.devCost)} + Fiori {money(preview.fioriCost)} + Functional {money(preview.funcCost)}</span>
        <span className="font-mono font-medium text-text">{preview.totalDays.toFixed(1)}d</span>
      </div>
      <p className="mt-1 text-[11px] text-text-3">
        PMO/PGLS allocation and the final total are calculated after saving, based on all registered items.
      </p>
    </div>
  );
}
