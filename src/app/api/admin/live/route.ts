import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { fetchLiveSnapshot, type LiveAudience } from "@/lib/analytics-live";
import { dbConfigured } from "@/lib/db";

function parseAudience(raw: string | null): LiveAudience {
  if (raw === "internal" || raw === "all") return raw;
  return "visitor";
}

export async function GET(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!dbConfigured()) {
    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      windowSeconds: 120,
      activeCount: 0,
      visitors: [],
      dbConfigured: false,
      hint: "Set DATABASE_URL in .env.local (vercel env pull) to see live visitors on localhost.",
    });
  }

  const { searchParams } = new URL(request.url);
  const audience = parseAudience(searchParams.get("audience"));

  try {
    const snapshot = await fetchLiveSnapshot(audience);
    return NextResponse.json(snapshot);
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
