/** Admin display helpers (identity comes from DB, not hash). */

export function hash32(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function visitorDisplayLabel(
  deviceLabel: string | null | undefined,
  lockedNickname: string | null | undefined,
): string {
  if (deviceLabel?.trim()) return deviceLabel.trim();
  return lockedNickname?.trim() || "Guest";
}

export function visitorDisplayShow(
  deviceLabel: string | null | undefined,
  lockedShowTitle: string | null | undefined,
): string | null {
  if (deviceLabel?.trim()) return null;
  return lockedShowTitle?.trim() || null;
}
