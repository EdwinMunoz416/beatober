import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Load `.env.local` when DATABASE_URL is not already set (Node CLI scripts). */
export function loadEnvLocal() {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const file = path.join(root, ".env.local");
  if (!fs.existsSync(file)) return;

  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}
