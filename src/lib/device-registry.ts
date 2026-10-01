import { getSql } from "@/lib/db";

export type DeviceRole = "internal" | "ignore";

export type RegisteredDevice = {
  visitorId: string;
  role: DeviceRole;
  label: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ResolvedAudience = "visitor" | "internal" | "ignore";

export async function resolveAudience(
  visitorId: string | undefined | null,
): Promise<ResolvedAudience> {
  if (!visitorId) return "visitor";
  const sql = getSql();
  const rows = (await sql`
    SELECT role FROM device_registry WHERE visitor_id = ${visitorId}
  `) as { role: DeviceRole }[];
  const role = rows[0]?.role;
  if (role === "ignore" || role === "internal") return role;
  return "visitor";
}

export async function listDevices(): Promise<RegisteredDevice[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT visitor_id, role, label, created_at, updated_at
    FROM device_registry
    ORDER BY updated_at DESC
  `) as {
    visitor_id: string;
    role: DeviceRole;
    label: string | null;
    created_at: Date;
    updated_at: Date;
  }[];

  return rows.map((r) => ({
    visitorId: r.visitor_id,
    role: r.role,
    label: r.label,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  }));
}

export async function upsertDevice(
  visitorId: string,
  role: DeviceRole,
  label?: string | null,
): Promise<void> {
  const sql = getSql();
  const cleanLabel = label?.trim().slice(0, 64) || null;
  await sql`
    INSERT INTO device_registry (visitor_id, role, label)
    VALUES (${visitorId}, ${role}, ${cleanLabel})
    ON CONFLICT (visitor_id) DO UPDATE SET
      role = EXCLUDED.role,
      label = EXCLUDED.label,
      updated_at = now()
  `;
}

export async function deleteDevice(visitorId: string): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM device_registry WHERE visitor_id = ${visitorId}`;
}
