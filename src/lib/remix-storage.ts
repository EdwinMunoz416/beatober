const PREFIX = "studiodaze-beatober-remix-";

function key(day: number): string {
  return `${PREFIX}${day}`;
}

export function loadRemix(day: number): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    return sessionStorage.getItem(key(day));
  } catch {
    return null;
  }
}

export function saveRemix(day: number, code: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(key(day), code);
  } catch {
    /* quota / private mode */
  }
}

export function clearRemix(day: number): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(key(day));
  } catch {
    /* ignore */
  }
}
