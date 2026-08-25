import { IconLoader2 } from "@tabler/icons-react";

/** Rendered automatically by loading.tsx files as the Suspense fallback for
 * a route segment -- gives immediate feedback that a click registered while
 * the destination page's data loads. Fades in after a short delay (see
 * .page-loading-fade in globals.css) so a fast navigation doesn't flash it. */
export function PageLoading() {
  return (
    <div className="page-loading-fade flex flex-col items-center justify-center gap-3 py-24 text-center">
      <IconLoader2 size={26} className="animate-spin" style={{ color: "var(--brass)" }} />
      <p className="text-sm text-text-3">Loading…</p>
    </div>
  );
}
