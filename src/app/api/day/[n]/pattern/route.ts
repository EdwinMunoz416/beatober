import { NextResponse } from "next/server";
import { writeFileSync } from "node:fs";
import { authorOk } from "@/lib/author";
import { loadManifest, patternPath } from "@/lib/content";
import { dbConfigured } from "@/lib/db";
import { upsertDay } from "@/lib/day-store";

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

  const { code } = (await request.json()) as { code?: string };
  if (typeof code !== "string") {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  if (dbConfigured()) {
    await upsertDay(day, { pattern: code });
    return NextResponse.json({ day, storage: "neon" });
  }

  const manifest = loadManifest();
  const entry = manifest.days.find((d) => d.day === day);
  const file = entry?.strudelFile ?? `${String(day).padStart(2, "0")}.strudel`;

  try {
    writeFileSync(patternPath(file), code, "utf8");
  } catch {
    return NextResponse.json(
      { error: "Could not write pattern file." },
      { status: 503 },
    );
  }

  return NextResponse.json({ day, strudelFile: file, storage: "file" });
}
