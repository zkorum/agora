import { QueryClient } from "@tanstack/vue-query";
import type { GetOpinionBySlugIdListResponse } from "src/shared/types/dto";
import { zodDisplayedOpinionItem } from "src/shared/types/zod";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { OpinionCache } from "./opinionCache";
import { createOpinionManagementRefresher } from "./opinionManagementRefresh";
import {
  initialOpinionPageRequest,
  parseOpinionPageResponse,
} from "./opinionPageBoundary";

const opinion = zodDisplayedOpinionItem.parse({
  opinionSlugId: "editstat",
  opinion: "Statement",
  sourceLanguageCode: "en",
  username: "author",
  isSeed: true,
  createdAt: "2026-10-10T10:00:00Z",
  updatedAt: "2026-10-10T10:00:00Z",
  numParticipants: 5,
  numAgrees: 5,
  numDisagrees: 0,
  numPasses: 0,
  moderation: { status: "unmoderated" },
  management: { editing: { allowed: true }, canDelete: true },
  displayContent: {
    sourceVersion: "00000000-0000-4000-8000-000000000001",
    status: "available",
    mode: "original",
    content: { content: "Statement" },
    translationControl: null,
  },
});
const targets: GetOpinionBySlugIdListResponse = [
  {
    conversationSlugId: "editconv",
    isOwn: true,
    opinion: {
      ...opinion,
      numAgrees: 0,
      numParticipants: 0,
      management: {
        editing: { allowed: false, reason: "has_votes" },
        canDelete: true,
      },
    },
  },
];
const key = ["comments", "editconv", "new", "viewer"];
const targetKey = ["opinionTarget", "editstat", "viewer"];
const scheduled = {
  conversationSlugId: "editconv",
  userId: "viewer",
  opinionSlugIds: ["editstat"],
};
const clients: QueryClient[] = [];

function setup() {
  const queryClient = new QueryClient();
  clients.push(queryClient);
  const request = initialOpinionPageRequest({
    conversationSlugId: "editconv",
    filter: "new",
  });
  queryClient.setQueryData<OpinionCache>(key, {
    pages: [
      parseOpinionPageResponse({
        request,
        rawResponse: { items: [opinion], nextCursor: null },
      }),
    ],
    pageParams: [request],
  });
  queryClient.setQueryData(targetKey, opinion);
  const fetchOpinions = vi
    .fn<
      Parameters<typeof createOpinionManagementRefresher>[0]["fetchOpinions"]
    >()
    .mockResolvedValue(targets);
  const onError = vi.fn();
  const refresher = createOpinionManagementRefresher({
    queryClient,
    fetchOpinions,
    onError,
  });
  return { queryClient, fetchOpinions, onError, refresher };
}

describe("authoritative statement management refresh", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    for (const client of clients) client.clear();
    clients.length = 0;
    vi.useRealTimers();
  });

  it("coalesces vote events and updates only management, preserving live and optimistic counts", async () => {
    const { queryClient, fetchOpinions, refresher } = setup();
    refresher.schedule(scheduled);
    refresher.schedule(scheduled);
    await vi.advanceTimersByTimeAsync(100);
    expect(fetchOpinions).toHaveBeenCalledTimes(1);
    expect(fetchOpinions).toHaveBeenCalledWith(
      expect.objectContaining({ opinionSlugIdList: ["editstat"] })
    );
    const cached = queryClient
      .getQueryData<OpinionCache>(key)
      ?.pages.at(0)
      ?.items.at(0);
    expect(cached).toMatchObject({
      numAgrees: 5,
      numParticipants: 5,
      management: { editing: { allowed: false, reason: "has_votes" } },
    });
    expect(queryClient.getQueryData(targetKey)).toEqual(cached);
    refresher.clear();
  });

  it("discards an in-flight response after an authentication generation change", async () => {
    const { queryClient, fetchOpinions, refresher } = setup();
    fetchOpinions.mockImplementationOnce(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return targets;
    });
    refresher.schedule(scheduled);
    await vi.advanceTimersByTimeAsync(100);
    refresher.clear();
    await vi.advanceTimersByTimeAsync(200);
    expect(queryClient.getQueryData(targetKey)).toEqual(opinion);
  });

  it("does not replace a newer revision's management with a stale response", async () => {
    const { queryClient, refresher } = setup();
    const newer = {
      ...opinion,
      displayContent: {
        ...opinion.displayContent,
        sourceVersion: "00000000-0000-4000-8000-000000000002",
      },
    };
    queryClient.setQueryData(targetKey, newer);
    refresher.schedule(scheduled);
    await vi.advanceTimersByTimeAsync(100);
    expect(queryClient.getQueryData(targetKey)).toEqual(newer);
    refresher.clear();
  });

  it("does not apply another conversation's response or touch another viewer's cache", async () => {
    const { queryClient, fetchOpinions, refresher } = setup();
    const otherViewerKey = ["opinionTarget", "editstat", "other-viewer"];
    queryClient.setQueryData(otherViewerKey, opinion);
    fetchOpinions.mockResolvedValue(
      targets.map((target) => ({ ...target, conversationSlugId: "othercnv" }))
    );
    refresher.schedule(scheduled);
    await vi.advanceTimersByTimeAsync(100);
    expect(queryClient.getQueryData(targetKey)).toEqual(opinion);
    expect(queryClient.getQueryData(otherViewerKey)).toEqual(opinion);
    refresher.clear();
  });

  it("can refresh again after a failed request", async () => {
    const { queryClient, fetchOpinions, onError, refresher } = setup();
    const error = new Error("Connection interrupted");
    fetchOpinions.mockRejectedValueOnce(error);
    refresher.schedule(scheduled);
    await vi.advanceTimersByTimeAsync(100);
    expect(onError).toHaveBeenCalledWith(error);
    refresher.schedule(scheduled);
    await vi.advanceTimersByTimeAsync(100);
    expect(queryClient.getQueryData(targetKey)).toMatchObject({
      management: { editing: { allowed: false, reason: "has_votes" } },
    });
    refresher.clear();
  });
});
