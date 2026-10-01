import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "node:fs";
import { authorOk } from "@/lib/author";
import { manifestPath, type Manifest } from "@/lib/content";
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

  const { audioUrl } = (await request.json()) as { audioUrl?: string };
  if (typeof audioUrl !== "string" || !audioUrl.startsWith("https://")) {
    return NextResponse.json({ error: "Invalid audioUrl" }, { status: 400 });
  }

  if (dbConfigured()) {
    await upsertDay(day, { audioUrl });
    return NextResponse.json({ day, audioUrl, storage: "neon" });
  }

  const path = manifestPath();
  const manifest = JSON.parse(readFileSync(path, "utf8")) as Manifest;
  const idx = manifest.days.findIndex((d) => d.day === day);
  const prior = idx >= 0 ? manifest.days[idx]! : undefined;
  const entry = {
    strudelFile: `${String(day).padStart(2, "0")}.strudel`,
    title: `Day ${day}`,
    approved: false,
    ...prior,
    day,
    audioUrl,
  };
  if (idx >= 0) manifest.days[idx] = entry;
  else manifest.days.push(entry);

  try {
    writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  } catch {
    return NextResponse.json(
      {
        error:
          "Could not write manifest. Configure Neon DATABASE_URL or set audioUrl in git.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ day, audioUrl, storage: "file" });
}
