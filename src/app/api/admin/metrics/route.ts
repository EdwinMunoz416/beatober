import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { fetchAdminMetrics } from "@/lib/analytics-query";
import { dbConfigured } from "@/lib/db";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!dbConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL not configured" },
      { status: 503 },
    );
  }

  try {
    const metrics = await fetchAdminMetrics();
    return NextResponse.json(metrics);
  } catch {
    return NextResponse.json({ error: "Query failed" }, { status: 503 });
  }
}
