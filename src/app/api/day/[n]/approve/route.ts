import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "node:fs";
import { loadManifest, manifestPath, type Manifest } from "@/lib/content";

function authorOk(request: Request): boolean {
  if (process.env.NODE_ENV === "development") return true;
  const secret = process.env.BEATOBER_AUTHOR_SECRET;
  if (!secret) return false;
  return request.headers.get("x-beatober-author") === secret;
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ n: string }> },
) {
  if (!authorOk(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { n } = await ctx.params;
  const day = Number.parseInt(n, 10);
  if (!Number.isFinite(day) || day < 1 || day > 31) {
    return NextResponse.json({ error: "Invalid day" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    approved?: boolean;
  };
  const approved = body.approved !== false;

  const path = manifestPath();
  const manifest = JSON.parse(readFileSync(path, "utf8")) as Manifest;
  const idx = manifest.days.findIndex((d) => d.day === day);
  const prior = idx >= 0 ? manifest.days[idx]! : undefined;
  const entry = {
    strudelFile: `${String(day).padStart(2, "0")}.strudel`,
    title: `Day ${day}`,
    ...prior,
    day,
    approved,
  };
  if (idx >= 0) manifest.days[idx] = entry;
  else manifest.days.push(entry);

  try {
    writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  } catch {
    return NextResponse.json(
      {
        error:
          "Could not write manifest (read-only deploy). Set approved in content/manifest.json and redeploy.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ day, approved });
}
