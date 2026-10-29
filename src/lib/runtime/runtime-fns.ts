/**
 * Runtime Server Functions
 *
 * TanStack Start server function wrappers for runtime operations.
 * Keeps Playwright and browser code server-side only.
 */

import { createServerFn } from "@tanstack/react-start";
import {
  startRuntime as _startRuntime,
  stopRuntime as _stopRuntime,
  getRuntimeStatus as _getRuntimeStatus,
  getRuntimeHeartbeat as _getRuntimeHeartbeat,
  runObservation as _runObservation,
  getRuntimeState as _getRuntimeState,
  getObservationSchedule as _getSchedule,
  isRuntimeActive,
} from "./manager";
import type { RuntimeSource } from "./types";

export const startRuntimeFn = createServerFn({ method: "POST" })
  .validator((source: RuntimeSource) => source)
  .handler(async ({ data: source }) => {
    const started = await _startRuntime(source);
    return {
      started,
      state: JSON.parse(JSON.stringify(_getRuntimeState())),
    };
  });

export const stopRuntimeFn = createServerFn({ method: "POST" })
  .handler(async () => {
    await _stopRuntime();
    return JSON.parse(JSON.stringify(_getRuntimeState()));
  });

export const getRuntimeStatusFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const status = await _getRuntimeStatus();
    const state = _getRuntimeState();
    const schedule = _getSchedule();
    return {
      status,
      state: JSON.parse(JSON.stringify(state)),
      schedule: JSON.parse(JSON.stringify(schedule)),
    };
  });

export const getRuntimeHeartbeatFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const result = await _getRuntimeHeartbeat();
    return result ? JSON.parse(JSON.stringify(result)) : null;
  });

export const runObservationFn = createServerFn({ method: "POST" })
  .validator((target: string) => target)
  .handler(async ({ data: target }) => {
    const result = await _runObservation(target);
    if (!result) return null;
    return JSON.parse(JSON.stringify(result)) as Record<string, string>;
  });

export const getRuntimeStateFn = createServerFn({ method: "GET" })
  .handler(async () => {
    return JSON.parse(JSON.stringify(_getRuntimeState()));
  });

export const getScheduleFn = createServerFn({ method: "GET" })
  .handler(async () => {
    return JSON.parse(JSON.stringify(_getSchedule()));
  });

export const isRuntimeActiveFn = createServerFn({ method: "GET" })
  .handler(async () => {
    return isRuntimeActive();
  });
