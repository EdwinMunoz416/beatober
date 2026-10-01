import { isAdminSession } from "@/lib/admin-auth";

export async function authorOk(request: Request): Promise<boolean> {
  if (process.env.NODE_ENV === "development") return true;
  const secret = process.env.BEATOBER_AUTHOR_SECRET;
  if (secret && request.headers.get("x-beatober-author") === secret) {
    return true;
  }
  return isAdminSession();
}
