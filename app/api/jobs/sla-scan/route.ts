import { NextResponse, type NextRequest } from "next/server";
import { runSlaScan } from "@/lib/jobs/sla-scan";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runSlaScan();
  return NextResponse.json(result);
}
