import { NextResponse } from "next/server";
import { isAllowedEvent } from "@/lib/analytics-events";
import { insertAnalyticsEvent } from "@/lib/analytics-store";
import { dbConfigured } from "@/lib/db";
import { allowAnalyticsEvent, ipHashForProps } from "@/lib/event-rate-limit";

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

  const visitor =
    typeof visitorId === "string" ? visitorId.slice(0, 64) : undefined;

  try {
    if (!(await allowAnalyticsEvent(request, visitor))) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }
  } catch {
    /* allow on rate-limit query failure */
  }

  const dayNum =
    typeof day === "number" && day >= 1 && day <= 31 ? day : undefined;

  const mergedProps = {
    ...(props as Record<string, string | number | boolean | null | undefined>),
    ...ipHashForProps(request),
  };

  try {
    const result = await insertAnalyticsEvent({
      eventName,
      visitorId: visitor,
      sessionId: typeof sessionId === "string" ? sessionId.slice(0, 64) : undefined,
      day: dayNum,
      props: mergedProps,
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
