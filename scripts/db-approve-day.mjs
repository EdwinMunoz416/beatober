#!/usr/bin/env node
/** Approve a day in Neon (production source of truth when DATABASE_URL is set). */
import { neon } from "@neondatabase/serverless";

const day = Number(process.argv[2]);
const approved = process.argv[3] !== "false";

if (!Number.isFinite(day) || day < 1 || day > 31) {
  console.error("Usage: node scripts/db-approve-day.mjs <day> [true|false]");
  process.exit(1);
}

const url =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_PRISMA_URL;

if (!url) {
  console.error("Set DATABASE_URL (vercel env pull).");
  process.exit(1);
}

const sql = neon(url);
await sql`
  UPDATE beatober_days SET approved = ${approved}, updated_at = now() WHERE day = ${day}
`;
console.log(`Day ${day} approved=${approved}`);
