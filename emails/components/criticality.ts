// Shared between the ticket email templates and the in-app criticality
// pill (components/support/criticality-pill.tsx) — section 19's fixed
// 4-color map, same 1.5px-border-on-transparent-fill treatment as status
// pills elsewhere in the app.
export const CRITICALITY_COLOR: Record<string, string> = {
  P1_critical: "#F0574B",
  P2_high: "#E0A340",
  P3_medium: "#4C8DF6",
  P4_low: "#7A8492",
};

export const CRITICALITY_LABEL: Record<string, string> = {
  P1_critical: "P1 · Critical",
  P2_high: "P2 · High",
  P3_medium: "P3 · Medium",
  P4_low: "P4 · Low",
};
