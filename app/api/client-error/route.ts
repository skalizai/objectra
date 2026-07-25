import { NextResponse, type NextRequest } from "next/server";

/** Fire-and-forget sink for client-side errors that React error boundaries
 * can't catch (event handlers, router navigation code, unhandled promise
 * rejections). Logs to the server console — visible via `vercel logs` —
 * so a crash can be diagnosed from what a real user hit without needing
 * them to copy text out of DevTools. No auth: this only ever runs for a
 * signed-in user hitting a real crash, and the payload is not sensitive. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.error("[client-error]", JSON.stringify(body));
  } catch {
    // Malformed payload — nothing to log.
  }
  return NextResponse.json({ ok: true });
}
