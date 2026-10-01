"use client";

/** Strudel repl logs transpile failures via console.error; Next dev treats that as an overlay issue. */
function isExpectedPatternConsoleError(arg: unknown): boolean {
  if (!(arg instanceof Error)) return false;
  if (arg instanceof SyntaxError) return true;
  if (arg.name === "SyntaxError") return true;
  if (/AudioWorkletGlobalScope|AudioWorkletNode cannot be created/i.test(arg.message))
    return true;
  if (/is not defined$/i.test(arg.message)) return true;
  if (/is not a function$/i.test(arg.message)) return true;
  return /unexpected token|parse error|unterminated|expected/i.test(arg.message);
}

export async function withQuietPatternEvalConsole<T>(
  fn: () => Promise<T>,
): Promise<T> {
  const prevError = console.error;
  console.error = (...args: unknown[]) => {
    if (args.some(isExpectedPatternConsoleError)) {
      return;
    }
    prevError.apply(console, args as Parameters<typeof console.error>);
  };
  try {
    return await fn();
  } finally {
    console.error = prevError;
  }
}
