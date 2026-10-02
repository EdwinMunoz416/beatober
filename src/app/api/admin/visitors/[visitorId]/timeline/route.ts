import { NextResponse } from "next/server";
import type { MetricsAudience } from "@/lib/analytics-query";
import { fetchVisitorTimeline } from "@/lib/analytics-visitor-profiles";
import { isAdminSession } from "@/lib/admin-auth";
import { dbConfigured } from "@/lib/db";

type Props = { params: Promise<{ visitorId: string }> };

function parseAudience(raw: string | null): MetricsAudience {
  if (raw === "internal" || raw === "all") return raw;
  return "visitor";
}

function parseVisitorId(raw: string): string | null {
  const id = decodeURIComponent(raw).trim();
  if (!id || id.length > 64) return null;
  return id;
}

export async function GET(request: Request, { params }: Props) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!dbConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL not configured" },
      { status: 503 },
    );
  }

  const { visitorId: rawId } = await params;
  const visitorId = parseVisitorId(rawId);
  if (!visitorId) {
    return NextResponse.json({ error: "Invalid visitor id" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const audience = parseAudience(searchParams.get("audience"));

  try {
    const events = await fetchVisitorTimeline(visitorId, audience);
    return NextResponse.json({ visitorId, events });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Query failed";
    if (process.env.NODE_ENV === "development") {
      console.error("[admin/visitors/timeline]", err);
    }
    return NextResponse.json(
      {
        error: "Query failed",
        ...(process.env.NODE_ENV === "development" ? { detail: message } : {}),
      },
      { status: 503 },
    );
  }
}
