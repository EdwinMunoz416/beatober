import { NextResponse } from "next/server";
import {
  fetchAdminMetrics,
  type MetricsAudience,
} from "@/lib/analytics-query";
import { isAdminSession } from "@/lib/admin-auth";
import { dbConfigured } from "@/lib/db";

function parseAudience(raw: string | null): MetricsAudience {
  if (raw === "internal" || raw === "all") return raw;
  return "visitor";
}

export async function GET(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!dbConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL not configured" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const audience = parseAudience(searchParams.get("audience"));

  try {
    const metrics = await fetchAdminMetrics(audience);
    return NextResponse.json(metrics);
  } catch {
    return NextResponse.json({ error: "Query failed" }, { status: 503 });
  }
}
