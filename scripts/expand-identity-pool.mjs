#!/usr/bin/env node
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

import { neon } from "@neondatabase/serverless";
import {
  ensureIdentityPoolCapacity,
  loadIdentityPool,
  getUsedVisitorSlots,
  countAssignableFree,
} from "./identity-pool-db.mjs";

const url =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_PRISMA_URL;

if (!url) {
  console.error("[expand-identity-pool] DATABASE_URL required.");
  process.exit(1);
}

const sql = neon(url);
const minFree = Number(process.env.IDENTITY_POOL_MIN_FREE ?? 15);
const targetNew = Number(process.env.IDENTITY_POOL_TARGET_NEW ?? 60);

await ensureIdentityPoolCapacity(sql, { minFree, targetNew });

const pool = await loadIdentityPool(sql);
const { usedChars, usedNames } = await getUsedVisitorSlots(sql);
const free = countAssignableFree(pool, usedChars, usedNames);

console.log(
  `[expand-identity-pool] Done — ${pool.length} in pool, ${free} assignable free.`,
);
