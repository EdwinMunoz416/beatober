export function authorOk(request: Request): boolean {
  if (process.env.NODE_ENV === "development") return true;
  const secret = process.env.BEATOBER_AUTHOR_SECRET;
  if (!secret) return false;
  return request.headers.get("x-beatober-author") === secret;
}
