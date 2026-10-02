import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import {
  fetchOnlineVisitorIds,
  LIVE_PRESENCE_WINDOW_SECONDS,
  type LiveAudience,
} from "@/lib/analytics-live";
import { dbConfigured } from "@/lib/db";

function parseAudience(raw: string | null): LiveAudience {
  if (raw === "internal" || raw === "all") return raw;
  return "visitor";
}

/** Lightweight poll for metrics online indicators. */
export async function GET(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!dbConfigured()) {
    return NextResponse.json({
      visitorIds: [],
      windowSeconds: LIVE_PRESENCE_WINDOW_SECONDS,
    });
  }

  const { searchParams } = new URL(request.url);
  const audience = parseAudience(searchParams.get("audience"));

  try {
    const visitorIds = await fetchOnlineVisitorIds(audience);
    return NextResponse.json({
      visitorIds,
      windowSeconds: LIVE_PRESENCE_WINDOW_SECONDS,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Query failed";
    return NextResponse.json(
      {
        error: "Query failed",
        ...(process.env.NODE_ENV === "development" ? { detail: message } : {}),
      },
      { status: 503 },
    );
  }
}
