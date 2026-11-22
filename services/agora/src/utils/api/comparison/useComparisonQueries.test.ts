import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia } from "pinia";
import type {
  ComparisonLoadResponse,
  ComparisonSaveRequest,
} from "src/shared/types/dto";
import { createComparisonEngine } from "src/shared/utils/comparisonEngine";
import type { useComparisonApi } from "src/utils/api/comparison/comparison";
import { participationRejectionFixture } from "src/utils/api/participation/participationTestFixtures";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "vue";

const save = vi.hoisted(() =>
  vi.fn<ReturnType<typeof useComparisonApi>["saveComparisonResponse"]>()
);
const refreshSession = vi.hoisted(() => vi.fn<() => Promise<void>>());
vi.mock("./comparison", () => ({
  useComparisonApi: () => ({ saveComparisonResponse: save }),
}));
vi.mock("src/utils/api/auth", () => ({
  useBackendAuthApi: () => ({
    ensureParticipationAuthState: refreshSession,
  }),
}));

import { useComparisonSaveMutation } from "./useComparisonQueries";

const cleanups: Array<() => void> = [];
beforeEach(() => {
  refreshSession.mockResolvedValue();
});
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  vi.resetAllMocks();
});

function mountSaveMutation(
  comparisonMethod: ComparisonSaveRequest["comparisonMethod"]
) {
  const queryClient = new QueryClient();
  const rollback = vi.fn();
  const blocked = vi.fn();
  const networkError = vi.fn();
  const sessionError = vi.fn();
  let mutation: ReturnType<typeof useComparisonSaveMutation> | undefined;
  const app = createApp({
    setup() {
      mutation = useComparisonSaveMutation({
        conversationSlugId: "example",
        comparisonMethod,
        onRollback: rollback,
        onBlocked: blocked,
        onNetworkError: networkError,
        onSessionRefreshError: sessionError,
      });
      return () => null;
    },
  });
  app.use(createPinia());
  app.use(VueQueryPlugin, { queryClient });
  app.mount(document.createElement("div"));
  cleanups.push(() => {
    app.unmount();
    queryClient.clear();
  });
  if (mutation === undefined) throw new Error("Mutation was not mounted");
  return {
    queryClient,
    mutation,
    rollback,
    blocked,
    networkError,
    sessionError,
  };
}

function saveParams(): Parameters<
  ReturnType<typeof useComparisonSaveMutation>["mutateAsync"]
>[0] {
  return {
    ranking: null,
    comparisons: [{ best: "first", worst: "second", set: ["second", "first"] }],
    isComplete: false,
    context: {
      previousState: createComparisonEngine([
        "first",
        "second",
        "third",
      ]).exportState(),
      previousCandidates: ["second", "first"],
      isCurrent: () => true,
      isParticipationCurrent: () => true,
    },
  };
}

describe.each(["bws", "pairwise"] as const)(
  "comparison participation handoff lifetime (%s)",
  (comparisonMethod) => {
    it.each([false, true])(
      "always rolls back, but routes only the current onboarding session (current=%s)",
      async (current) => {
        const { mutation, rollback, blocked } =
          mountSaveMutation(comparisonMethod);
        save.mockResolvedValue({
          status: "success",
          data: participationRejectionFixture("account_required"),
        });
        await mutation.mutateAsync({
          ranking: null,
          comparisons: [],
          isComplete: false,
          context: {
            previousState: createComparisonEngine([
              "first",
              "second",
              "third",
            ]).exportState(),
            previousCandidates: ["first", "second", "third"],
            isCurrent: () => true,
            isParticipationCurrent: () => current,
          },
        });
        expect(rollback).toHaveBeenCalledOnce();
        expect(save).toHaveBeenCalledWith(
          expect.objectContaining({ comparisonMethod })
        );
        expect(blocked).toHaveBeenCalledTimes(current ? 1 : 0);
        if (current) expect(rollback).toHaveBeenCalledBefore(blocked);
      }
    );

    it("forwards the explicit method and caches accepted displayed history", async () => {
      const { mutation, queryClient, rollback } =
        mountSaveMutation(comparisonMethod);
      save.mockResolvedValue({
        status: "success",
        data: { success: true, candidateSets: [["third", "first"]] },
      });
      const params = saveParams();
      await mutation.mutateAsync(params);
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          comparisonMethod,
          comparisons: params.comparisons,
        })
      );
      expect(
        queryClient
          .getQueriesData<ComparisonLoadResponse>({
            queryKey: ["comparison-load", "example"],
          })
          .map(([, data]) => data)
      ).toEqual([
        expect.objectContaining({
          comparisons: params.comparisons,
          candidateSets: [["third", "first"]],
        }),
      ]);
      expect(rollback).not.toHaveBeenCalled();
    });

    it("does not roll back an accepted save when session refresh fails", async () => {
      const { mutation, queryClient, rollback, networkError, sessionError } =
        mountSaveMutation(comparisonMethod);
      save.mockResolvedValue({
        status: "success",
        data: { success: true, candidateSets: [["third", "first"]] },
      });
      refreshSession.mockRejectedValue(new Error("Session refresh failed"));
      await expect(mutation.mutateAsync(saveParams())).resolves.toMatchObject({
        success: true,
      });
      expect(rollback).not.toHaveBeenCalled();
      expect(networkError).not.toHaveBeenCalled();
      expect(sessionError).toHaveBeenCalledOnce();
      expect(
        queryClient.getQueriesData({ queryKey: ["comparison-load", "example"] })
      ).toEqual([]);
    });

    it("ignores accepted responses from an obsolete session", async () => {
      const { mutation, queryClient, rollback, sessionError } =
        mountSaveMutation(comparisonMethod);
      save.mockResolvedValue({
        status: "success",
        data: { success: true, candidateSets: [] },
      });
      const params = saveParams();
      params.context.isCurrent = () => false;
      await mutation.mutateAsync(params);
      expect(refreshSession).not.toHaveBeenCalled();
      expect(rollback).not.toHaveBeenCalled();
      expect(sessionError).not.toHaveBeenCalled();
      expect(
        queryClient.getQueriesData({ queryKey: ["comparison-load", "example"] })
      ).toEqual([]);
    });

    it("ignores a response invalidated during session refresh", async () => {
      const { mutation, queryClient, rollback } =
        mountSaveMutation(comparisonMethod);
      save.mockResolvedValue({
        status: "success",
        data: { success: true, candidateSets: [] },
      });
      let current = true;
      refreshSession.mockImplementation(() => {
        current = false;
        return Promise.resolve();
      });
      const params = saveParams();
      params.context.isCurrent = () => current;
      await mutation.mutateAsync(params);
      expect(rollback).not.toHaveBeenCalled();
      expect(
        queryClient.getQueriesData({ queryKey: ["comparison-load", "example"] })
      ).toEqual([]);
    });
  }
);
