import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

/**
 * Database client singleton.
 * Uses Neon serverless driver with HTTP mode (no WebSocket needed).
 * DATABASE_URL must be set in environment variables.
 */
function getDb() {
  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
        "Please configure it in Settings → Environment.",
    );
  }
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

/** Lazy singleton to avoid creating connections on import. */
let _db: ReturnType<typeof getDb> | undefined;

export function getDatabase() {
  if (!_db) {
    _db = getDb();
  }
  return _db;
}
