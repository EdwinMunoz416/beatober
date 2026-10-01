"use client";

/** Strudel repl logs transpile failures via console.error; Next dev treats that as an overlay issue. */
function isExpectedPatternConsoleError(arg: unknown): boolean {
  if (!(arg instanceof Error)) return false;
  if (arg instanceof SyntaxError) return true;
  if (arg.name === "SyntaxError") return true;
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
