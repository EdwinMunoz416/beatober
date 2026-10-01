import { NextResponse } from "next/server";
import { resolveAudience } from "@/lib/device-registry";
import { dbConfigured } from "@/lib/db";
import { getSql } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const visitorId = searchParams.get("visitorId")?.slice(0, 64);

  if (!visitorId) {
    return NextResponse.json({ role: "visitor" as const });
  }

  if (!dbConfigured()) {
    return NextResponse.json({ role: "visitor" as const });
  }

  const role = await resolveAudience(visitorId);
  if (role === "visitor") {
    return NextResponse.json({ role: "visitor" as const });
  }

  const sql = getSql();
  const rows = (await sql`
    SELECT label FROM device_registry WHERE visitor_id = ${visitorId}
  `) as { label: string | null }[];

  return NextResponse.json({
    role,
    label: rows[0]?.label ?? null,
  });
}
