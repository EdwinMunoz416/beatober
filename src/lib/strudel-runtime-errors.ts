"use client";

export type StrudelErrorKind = "boot" | "eval" | "scheduler" | "draw" | "unknown";

export type StrudelRuntimeError = {
  kind: StrudelErrorKind;
  message: string;
  detail?: string;
  at: number;
};

type Listener = (error: StrudelRuntimeError | null) => void;

let current: StrudelRuntimeError | null = null;
const listeners = new Set<Listener>();

function notify(): void {
  for (const fn of listeners) fn(current);
}

export function getStrudelRuntimeError(): StrudelRuntimeError | null {
  return current;
}

export function subscribeStrudelRuntimeError(fn: Listener): () => void {
  listeners.add(fn);
  fn(current);
  return () => listeners.delete(fn);
}

export function clearStrudelRuntimeError(): void {
  if (!current) return;
  current = null;
  notify();
}

export function reportStrudelRuntimeError(
  kind: StrudelErrorKind,
  err: unknown,
  detail?: string,
): void {
  current = {
    kind,
    message: formatStrudelErrorMessage(err),
    detail,
    at: Date.now(),
  };
  notify();
}

export function formatStrudelErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const stack = err.stack?.split("\n").slice(0, 4).join("\n");
    return stack && stack.includes(err.message)
      ? stack
      : err.message + (stack ? `\n${stack}` : "");
  }
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export function strudelErrorKindLabel(kind: StrudelErrorKind): string {
  switch (kind) {
    case "boot":
      return "Engine failed to start";
    case "eval":
      return "Pattern error";
    case "scheduler":
      return "Playback error";
    case "draw":
      return "Visual error";
    default:
      return "Error";
  }
}
