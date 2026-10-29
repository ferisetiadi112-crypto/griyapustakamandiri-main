/**
 * Server-only environment reader for browser provider configuration.
 *
 * Serverless runtimes (Vercel functions, Cloudflare/Nitro workers) do not
 * always expose configuration through `process.env` at module-evaluation
 * time — some inject it into a runtime env object instead. This helper looks
 * in every place the value may live, and is only ever called from server code.
 *
 * NOTE: values returned here are secrets. Never log or return them to clients.
 */

type EnvBag = Record<string, string | undefined>;

function candidateBags(): EnvBag[] {
  const bags: EnvBag[] = [];
  const g = globalThis as unknown as Record<string, any>;

  try {
    if (typeof process !== "undefined" && process.env) bags.push(process.env as EnvBag);
  } catch { /* no process */ }

  // Nitro / Cloudflare style runtime env bindings
  for (const key of ["__env__", "env", "__NITRO_ENV__"]) {
    const bag = g[key];
    if (bag && typeof bag === "object") bags.push(bag as EnvBag);
  }

  return bags;
}

/** Read a server-side env var from any available runtime env source. */
export function readServerEnv(name: string): string | undefined {
  for (const bag of candidateBags()) {
    const value = bag[name];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

/** Presence check that never reveals the value. */
export function hasServerEnv(name: string): boolean {
  return !!readServerEnv(name);
}

/** True when running in a serverless runtime with no writable filesystem. */
export function isServerlessRuntime(): boolean {
  if (
    readServerEnv("VERCEL") ||
    readServerEnv("VERCEL_ENV") ||
    readServerEnv("AWS_LAMBDA_FUNCTION_NAME") ||
    readServerEnv("CF_PAGES") ||
    readServerEnv("NETLIFY")
  ) {
    return true;
  }
  try {
    if (typeof process !== "undefined" && typeof process.cwd === "function") {
      return process.cwd().startsWith("/var/task");
    }
  } catch { /* ignore */ }
  // No `process` at all → worker runtime.
  return typeof process === "undefined";
}
