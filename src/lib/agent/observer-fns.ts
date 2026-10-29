/**
 * Server Function wrappers for Agent Observer operations.
 *
 * These are used by route components via useServerFn().
 * The actual implementations import Playwright through the browser provider.
 * By wrapping them here with createServerFn, Vite keeps Playwright out of the client bundle.
 */

import { createServerFn } from "@tanstack/react-start";
import { observePrimaryAccount as _observePrimaryAccount } from "./observer";
import type { ObservationReport } from "./report";

export const observePrimaryAccountFn = createServerFn({ method: "POST" })
  .handler(async (): Promise<ObservationReport | null> => {
    return _observePrimaryAccount();
  });
