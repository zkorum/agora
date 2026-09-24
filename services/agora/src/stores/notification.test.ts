import { createPinia, setActivePinia } from "pinia";
import { Dto, type FetchNotificationsResponse } from "src/shared/types/dto";
import { zodSSENotificationData } from "src/shared/types/sse";
import type {
  RegularNotificationItem,
  SecurityAddEmailNotification,
} from "src/shared/types/zod";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchNotifications } = vi.hoisted(() => ({
  fetchNotifications: vi.fn(),
}));

vi.mock("src/utils/api/notification/notification", () => ({
  useNotificationApi: () => ({ fetchNotifications }),
}));

import { useNotificationStore } from "./notification";

function notification({
  slugId,
  createdAt,
  isRead = false,
}: {
  slugId: string;
  createdAt: string;
  isRead?: boolean;
}): RegularNotificationItem {
  return {
    type: "import_started",
    slugId,
    createdAt: new Date(createdAt),
    isRead,
    routeTarget: {
      type: "import",
      importSlugId: `import-${slugId}`,
    },
  };
}

function securityNotification(): SecurityAddEmailNotification {
  return {
    type: "security_add_email",
    slugId: "security",
    createdAt: new Date("2026-07-20T12:00:00Z"),
    isRead: false,
    isSticky: true,
    routeTarget: { type: "settings" },
  };
}

function deferredResponse(): {
  promise: Promise<FetchNotificationsResponse>;
  resolve: (response: FetchNotificationsResponse) => void;
} {
  let resolvePromise:
    | ((response: FetchNotificationsResponse) => void)
    | undefined;
  const promise = new Promise<FetchNotificationsResponse>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: (response) => resolvePromise?.(response),
  };
}

describe("notification store request ordering", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    fetchNotifications.mockReset();
  });

  it("keeps the security reminder unread when ordinary notifications are cleared", async () => {
    fetchNotifications.mockResolvedValueOnce({
      numNewNotifications: 1,
      stickyNotificationList: [securityNotification()],
      notificationList: [
        notification({
          slugId: "ordinary",
          createdAt: "2026-07-21T12:00:00Z",
        }),
      ],
    });
    const store = useNotificationStore();
    await store.refreshNotificationData();

    expect(store.numNewNotifications).toBe(2);
    store.clearBadgeCount();
    store.markNotificationAsRead("security");
    expect(store.numNewNotifications).toBe(1);
    expect(store.stickyNotificationList[0]?.isRead).toBe(false);

    fetchNotifications.mockResolvedValueOnce({
      numNewNotifications: 0,
      stickyNotificationList: [],
      notificationList: [],
    });
    await store.refreshNotificationData();
    expect(store.numNewNotifications).toBe(0);
    expect(store.stickyNotificationList).toEqual([]);
  });

  it("keeps an SSE notification added while a refresh is in flight", async () => {
    const pendingRefresh = deferredResponse();
    fetchNotifications.mockReturnValueOnce(pendingRefresh.promise);
    const store = useNotificationStore();

    const refreshPromise = store.refreshNotificationData();
    store.addNewNotification(
      notification({ slugId: "sse", createdAt: "2026-07-21T12:01:00Z" })
    );
    pendingRefresh.resolve({
      numNewNotifications: 0,
      stickyNotificationList: [],
      notificationList: [
        notification({
          slugId: "sse",
          createdAt: "2026-07-21T12:01:00Z",
          isRead: true,
        }),
        notification({ slugId: "http", createdAt: "2026-07-21T12:00:00Z" }),
      ],
    });
    await refreshPromise;

    expect(store.notificationList.map(({ slugId }) => slugId)).toEqual([
      "sse",
      "http",
    ]);
    expect(store.notificationList[0]?.isRead).toBe(false);
    expect(store.numNewNotifications).toBe(1);
  });

  it("keeps a newer read mutation when a stale refresh completes", async () => {
    const store = useNotificationStore();
    fetchNotifications.mockResolvedValueOnce({
      numNewNotifications: 1,
      stickyNotificationList: [],
      notificationList: [
        notification({ slugId: "existing", createdAt: "2026-07-21T12:00:00Z" }),
      ],
    });
    await store.refreshNotificationData();

    const pendingRefresh = deferredResponse();
    fetchNotifications.mockReturnValueOnce(pendingRefresh.promise);
    const refreshPromise = store.refreshNotificationData();
    store.markNotificationAsRead("existing");
    pendingRefresh.resolve({
      numNewNotifications: 1,
      stickyNotificationList: [],
      notificationList: [
        notification({ slugId: "existing", createdAt: "2026-07-21T12:00:00Z" }),
      ],
    });
    await refreshPromise;

    expect(store.notificationList[0]?.isRead).toBe(true);
  });

  it("merges pagination with a notification received in flight", async () => {
    const store = useNotificationStore();
    fetchNotifications.mockResolvedValueOnce({
      numNewNotifications: 0,
      stickyNotificationList: [],
      notificationList: [
        notification({ slugId: "first", createdAt: "2026-07-21T12:00:00Z" }),
      ],
    });
    await store.refreshNotificationData();

    const pendingPage = deferredResponse();
    fetchNotifications.mockReturnValueOnce(pendingPage.promise);
    const pagePromise = store.loadMoreNotificationData();
    store.addNewNotification(
      notification({ slugId: "sse", createdAt: "2026-07-21T12:01:00Z" })
    );
    pendingPage.resolve({
      numNewNotifications: 0,
      stickyNotificationList: [],
      notificationList: [
        notification({ slugId: "older", createdAt: "2026-07-21T11:00:00Z" }),
      ],
    });
    await pagePromise;

    expect(store.notificationList.map(({ slugId }) => slugId)).toEqual([
      "sse",
      "first",
      "older",
    ]);
  });

  it("does not repopulate notifications after session data is cleared", async () => {
    const pendingRefresh = deferredResponse();
    fetchNotifications.mockReturnValueOnce(pendingRefresh.promise);
    const store = useNotificationStore();

    const refreshPromise = store.refreshNotificationData();
    store.clearNotificationData();
    pendingRefresh.resolve({
      numNewNotifications: 1,
      stickyNotificationList: [securityNotification()],
      notificationList: [
        notification({ slugId: "stale", createdAt: "2026-07-21T12:00:00Z" }),
      ],
    });
    await refreshPromise;

    expect(store.notificationList).toEqual([]);
    expect(store.stickyNotificationList).toEqual([]);
    expect(store.numNewNotifications).toBe(0);
  });

  it("ignores an older refresh that finishes after a newer refresh", async () => {
    const olderRefresh = deferredResponse();
    const newerRefresh = deferredResponse();
    fetchNotifications
      .mockReturnValueOnce(olderRefresh.promise)
      .mockReturnValueOnce(newerRefresh.promise);
    const store = useNotificationStore();

    const olderPromise = store.refreshNotificationData();
    const newerPromise = store.refreshNotificationData();
    newerRefresh.resolve({
      numNewNotifications: 1,
      stickyNotificationList: [securityNotification()],
      notificationList: [
        notification({ slugId: "newer", createdAt: "2026-07-21T12:01:00Z" }),
      ],
    });
    await newerPromise;
    olderRefresh.resolve({
      numNewNotifications: 0,
      stickyNotificationList: [],
      notificationList: [
        notification({ slugId: "older", createdAt: "2026-07-21T12:00:00Z" }),
      ],
    });
    await olderPromise;

    expect(store.notificationList.map(({ slugId }) => slugId)).toEqual([
      "newer",
    ]);
    expect(store.stickyNotificationList.map(({ slugId }) => slugId)).toEqual([
      "security",
    ]);
    expect(store.numNewNotifications).toBe(2);
  });
});

describe("security notification channel boundaries", () => {
  it("keeps sticky reminders out of the paginated feed and SSE events", () => {
    expect(
      Dto.fetchNotificationsResponse.safeParse({
        numNewNotifications: 0,
        notificationList: [securityNotification()],
        stickyNotificationList: [],
      }).success
    ).toBe(false);
    expect(
      zodSSENotificationData.safeParse({
        notification: securityNotification(),
      }).success
    ).toBe(false);
  });
});
