import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import {
  deleteDevice,
  listDevices,
  upsertDevice,
  type DeviceRole,
} from "@/lib/device-registry";
import { dbConfigured } from "@/lib/db";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!dbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }
  const devices = await listDevices();
  return NextResponse.json({ devices });
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!dbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  const body = (await request.json()) as {
    visitorId?: string;
    role?: DeviceRole;
    label?: string;
  };

  const visitorId = body.visitorId?.trim().slice(0, 64);
  const role = body.role;

  if (!visitorId || (role !== "internal" && role !== "ignore")) {
    return NextResponse.json({ error: "Invalid visitorId or role" }, { status: 400 });
  }

  await upsertDevice(visitorId, role, body.label);
  return NextResponse.json({
    ok: true,
    visitorId,
    role,
    label: body.label?.trim().slice(0, 64) || null,
  });
}

export async function DELETE(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!dbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  const { visitorId } = (await request.json()) as { visitorId?: string };
  if (!visitorId) {
    return NextResponse.json({ error: "Missing visitorId" }, { status: 400 });
  }

  await deleteDevice(visitorId.slice(0, 64));
  return NextResponse.json({ ok: true });
}
