/** Placeholder Strudel editor content for locked / unreleased days. */
export function comingSoonPattern(
  day: number,
  title?: string,
  themeLabel?: string,
): string {
  const pad = String(day).padStart(2, "0");
  const name = title ?? themeLabel ?? `day ${day}`;
  return [
    "// coming soon",
    `// ${pad} · ${name}`,
    "// this beat unlocks when the day is approved and its calendar date arrives.",
  ].join("\n");
}
