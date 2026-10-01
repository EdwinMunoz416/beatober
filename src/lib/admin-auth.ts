import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "beatober_admin";

function adminSecret(): string | null {
  return process.env.BEATOBER_AUTHOR_SECRET ?? null;
}

export function adminToken(): string | null {
  const secret = adminSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update("beatober-admin-v1").digest("hex");
}

export function verifyAdminPassword(password: string): boolean {
  if (process.env.NODE_ENV === "development" && !adminSecret()) {
    return password.length > 0;
  }
  const secret = adminSecret();
  if (!secret) return false;
  if (password.length !== secret.length) return false;
  try {
    return timingSafeEqual(Buffer.from(password), Buffer.from(secret));
  } catch {
    return false;
  }
}

export async function isAdminSession(): Promise<boolean> {
  if (process.env.NODE_ENV === "development" && !adminSecret()) {
    return true;
  }
  const expected = adminToken();
  if (!expected) return false;
  const jar = await cookies();
  const got = jar.get(ADMIN_COOKIE)?.value;
  if (!got || got.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(got), Buffer.from(expected));
  } catch {
    return false;
  }
}
