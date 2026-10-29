/**
 * Server Function wrappers for Primary Account operations.
 *
 * These are used by route components via useServerFn().
 * The actual implementations live in primary-account.ts which imports Playwright.
 * By wrapping them here with createServerFn, Vite keeps Playwright out of the client bundle.
 */

import { createServerFn } from "@tanstack/react-start";
import {
  getPrimaryAccount as _getPrimaryAccount,
  connectPrimaryAccount as _connectPrimaryAccount,
  detectAccountFromBrowser as _detectAccountFromBrowser,
  restorePrimarySession as _restorePrimarySession,
} from "./primary-account";
import type { PrimaryAccount, ConnectResult, SessionRestoreResult } from "./primary-account";

export const getPrimaryAccountFn = createServerFn({ method: "GET" })
  .handler(async (): Promise<PrimaryAccount | null> => {
    return _getPrimaryAccount();
  });

export const connectPrimaryAccountFn = createServerFn({ method: "POST" })
  .handler(async (): Promise<ConnectResult> => {
    return _connectPrimaryAccount();
  });

export const detectAccountFromBrowserFn = createServerFn({ method: "POST" })
  .validator((sessionId: string) => sessionId)
  .handler(async ({ data: sessionId }): Promise<{ detected: boolean; username?: string; displayName?: string }> => {
    return _detectAccountFromBrowser(sessionId);
  });

export const restorePrimarySessionFn = createServerFn({ method: "POST" })
  .handler(async (): Promise<SessionRestoreResult> => {
    return _restorePrimarySession();
  });
