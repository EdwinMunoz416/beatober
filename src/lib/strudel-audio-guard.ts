"use client";

import { reportStrudelRuntimeError } from "@/lib/strudel-runtime-errors";

let installed = false;

/** Route decode failures to the REPL error banner instead of an unhandled Next overlay. */
export function installStrudelAudioErrorGuard(): void {
  if (typeof window === "undefined" || installed) return;
  installed = true;

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const name =
      reason instanceof DOMException
        ? reason.name
        : reason instanceof Error
          ? reason.name
          : "";
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : "";
    if (
      name === "EncodingError" ||
      message.includes("Unable to decode audio data") ||
      message.includes("decode audio")
    ) {
      reportStrudelRuntimeError("scheduler", reason);
      event.preventDefault();
    }
  });
}
