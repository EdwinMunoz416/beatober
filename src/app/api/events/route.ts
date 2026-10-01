import { NextResponse } from "next/server";
import { isAllowedEvent } from "@/lib/analytics-events";
import { insertAnalyticsEvent } from "@/lib/analytics-store";
import { dbConfigured } from "@/lib/db";

export async function POST(request: Request) {
  if (!dbConfigured()) {
    return NextResponse.json({ ok: true, stored: false });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    eventName,
    visitorId,
    sessionId,
    day,
    props,
    path,
    referrerBucket,
  } = body as {
    eventName?: string;
    visitorId?: string;
    sessionId?: string;
    day?: number;
    props?: Record<string, unknown>;
    path?: string;
    referrerBucket?: string;
  };

  if (!eventName || !isAllowedEvent(eventName)) {
    return NextResponse.json({ error: "Unknown event" }, { status: 400 });
  }

  const dayNum =
    typeof day === "number" && day >= 1 && day <= 31 ? day : undefined;

  try {
    const result = await insertAnalyticsEvent({
      eventName,
      visitorId: typeof visitorId === "string" ? visitorId.slice(0, 64) : undefined,
      sessionId: typeof sessionId === "string" ? sessionId.slice(0, 64) : undefined,
      day: dayNum,
      props: props as Record<string, string | number | boolean | null | undefined>,
      path: typeof path === "string" ? path.slice(0, 256) : undefined,
      referrerBucket:
        typeof referrerBucket === "string"
          ? referrerBucket.slice(0, 32)
          : undefined,
    });
    return NextResponse.json({
      ok: true,
      stored: result.stored,
      audience: result.audience,
    });
  } catch {
    return NextResponse.json({ error: "Store failed" }, { status: 503 });
  }
}
