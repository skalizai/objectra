import { NextResponse, type NextRequest } from "next/server";
import { runWeeklyDigest } from "@/lib/jobs/weekly-digest";

export const maxDuration = 60;

// Runs daily via vercel.json; each project's own notification_settings.digest_day
// decides whether runWeeklyDigest() actually sends anything for it today.
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runWeeklyDigest();
  return NextResponse.json(result);
}
