/**
 * Server Functions for Account Dashboard Data
 *
 * Provides primary account info, activity, and observations
 * to dashboard components without leaking browser/API imports into the client.
 */

import { createServerFn } from "@tanstack/react-start";
import { getPrimaryAccount, getRecentObservations } from "./primary-account";
import type { PrimaryAccount } from "./primary-account";
import {
  getRuntimeState,
  getObservationSchedule,
  isRuntimeActive,
} from "@/lib/runtime/manager";
import { getRecentAiActivity, getPendingHumanTasks } from "@/lib/ai/brain";

import type { RuntimeStatus, RuntimeState, ObservationScheduleEntry } from "@/lib/runtime/types";

export type AccountDashboardData = {
  account: PrimaryAccount | null;
  runtime: {
    status: RuntimeStatus;
    state: RuntimeState;
    schedule: ObservationScheduleEntry[];
    isActive: boolean;
  };
  activity: Array<{
    id: number;
    type: string;
    summary: string;
    createdAt: string;
  }>;
  humanTasks: Array<{
    id: number;
    type: string;
    title: string;
    description: string;
    status: string;
    createdAt: string;
  }>;
  observations: Array<{
    id: number;
    page: string;
    category: string;
    rawSummary: string | null;
    confidence: string;
    observedAt: string;
    structuredData: string | null;
  }>;
};

export const getAccountDashboardFn = createServerFn({ method: "GET" })
  .handler(async (): Promise<AccountDashboardData> => {
    const [account, runtimeState, schedule, active, activity, humanTasks, observations] =
      await Promise.all([
        getPrimaryAccount(),
        Promise.resolve(getRuntimeState()),
        Promise.resolve(getObservationSchedule()),
        Promise.resolve(isRuntimeActive()),
        getRecentAiActivity(15),
        getPendingHumanTasks(),
        getRecentObservations(5),
      ]);

    return {
      account,
      runtime: {
        status: runtimeState.status,
        state: JSON.parse(JSON.stringify(runtimeState)),
        schedule: JSON.parse(JSON.stringify(schedule)),
        isActive: active,
      },
      activity: activity.map((a) => ({
        id: a.id,
        type: a.type,
        summary: a.summary,
        createdAt: a.createdAt.toISOString(),
      })),
      humanTasks: humanTasks.map((t) => ({
        id: t.id,
        type: t.type,
        title: t.title,
        description: t.description,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
      })),
      observations: observations.map((o) => ({
        id: o.id,
        page: o.page,
        category: o.category,
        rawSummary: o.rawSummary,
        confidence: o.confidence,
        observedAt: o.observedAt.toISOString(),
        structuredData: o.structuredData ? JSON.stringify(o.structuredData) : null,
      })),
    };
  });


