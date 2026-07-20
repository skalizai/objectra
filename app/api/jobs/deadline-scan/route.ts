import { NextResponse, type NextRequest } from "next/server";
import { runDeadlineScan } from "@/lib/jobs/deadline-scan";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runDeadlineScan();
  return NextResponse.json(result);
}
