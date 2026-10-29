/**
 * AI Module — exports all public AI functionality.
 */

export { getAiProvider, isAiConfigured, getAiStatus } from "./provider";
export {
  runAiCycle,
  recordObservation,
  getRecentObservations,
  storeFact,
  storeDecision,
  storeResult,
  storeLearning,
  getMemoryByKind,
  createHumanTask,
  getPendingHumanTasks,
  completeHumanTask,
  recordAiActivity,
  getRecentAiActivity,
} from "./brain";
export type { HumanTaskType } from "./brain";
export type {
  AiDecision,
  AiContext,
  AiAction,
  AiPriority,
  ObservationType,
  GrowthGoal,
} from "./types";
