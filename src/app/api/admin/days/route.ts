import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { loadBeatoberStateSafe } from "@/lib/day-store";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { manifest } = await loadBeatoberStateSafe();
  return NextResponse.json({
    year: manifest.year,
    month: manifest.month,
    days: manifest.days.map((d) => ({
      day: d.day,
      title: d.title,
      approved: d.approved,
      audioUrl: d.audioUrl ?? null,
    })),
  });
}
