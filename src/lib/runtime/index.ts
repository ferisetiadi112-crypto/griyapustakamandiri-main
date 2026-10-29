/**
 * AI Agent Runtime
 *
 * The runtime is the engine that keeps the AI Agent working.
 * It manages browser sessions, observation scheduling, and state.
 */

export type {
  AgentRuntime,
  RuntimeSource,
  RuntimeStatus,
  RuntimeState,
  HeartbeatResult,
  ObservationTarget,
  ObservationPriority,
  ObservationScheduleEntry,
  AgentContext,
} from "./types";

export {
  startRuntime,
  stopRuntime,
  getRuntimeStatus,
  getRuntimeHeartbeat,
  runObservation,
  getRuntimeState,
  getObservationSchedule,
  isRuntimeActive,
} from "./manager";

export {
  getState,
  getStatus,
  getSource,
  getSessionId,
  getCurrentPhase,
  getCurrentTask,
  getNextTaskTarget,
  getNextTaskRunAt,
  formatStatus,
  formatSource,
} from "./state";

export { performHeartbeat } from "./heartbeat";

export {
  getSchedule,
  getEnabledTargets,
  getNextTarget,
  markObserved,
  loadLastObservations,
  buildTargetUrl,
} from "./scheduler";
