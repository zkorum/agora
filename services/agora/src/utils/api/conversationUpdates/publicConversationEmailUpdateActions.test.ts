import { describe, expect, it } from "vitest";

import {
  createPublicConversationEmailUpdateActionsApi,
  type PublicActionHttpClient,
} from "./publicConversationEmailUpdateActions";

const token = "abcdefghijklmnopqrstuv";

function createClient({ responseData }: { responseData: unknown }): {
  client: PublicActionHttpClient;
  requests: Array<Parameters<PublicActionHttpClient["request"]>[0]>;
} {
  const requests: Array<Parameters<PublicActionHttpClient["request"]>[0]> = [];
  return {
    client: {
      request: (config) => {
        requests.push(config);
        return Promise.resolve({ data: responseData });
      },
    },
    requests,
  };
}

describe("public conversation Email Updates actions API", () => {
  it("constructs and parses the public resolve request without auth config", async () => {
    const responseData = {
      success: true,
      action: "unsubscribe_conversation",
      scope: {
        kind: "conversation",
        conversationSlugId: "conv1",
        title: "A conversation",
      },
    };
    const { client, requests } = createClient({ responseData });
    const actionsApi = createPublicConversationEmailUpdateActionsApi({
      client,
    });

    await expect(actionsApi.resolve({ token })).resolves.toEqual(responseData);
    expect(requests).toEqual([
      {
        method: "POST",
        url: "/api/v1/conversation/email-update/action/resolve",
        data: { token },
      },
    ]);
  });

  it("constructs unsubscribe, opt-out, and report requests", async () => {
    const { client, requests } = createClient({
      responseData: { success: true },
    });
    const actionsApi = createPublicConversationEmailUpdateActionsApi({
      client,
    });

    await actionsApi.unsubscribe({ token });
    await actionsApi.optOut({
      token,
      target: { kind: "conversation", conversationSlugId: "conv1" },
    });
    await actionsApi.report({
      token,
      reason: "other",
      details: "  Useful context  ",
    });

    expect(requests).toEqual([
      {
        method: "POST",
        url: "/api/v1/conversation/email-update/action/unsubscribe",
        data: { token },
      },
      {
        method: "POST",
        url: "/api/v1/conversation/email-update/action/manage/opt-out",
        data: {
          token,
          target: { kind: "conversation", conversationSlugId: "conv1" },
        },
      },
      {
        method: "POST",
        url: "/api/v1/conversation/email-update/action/report",
        data: { token, reason: "other", details: "Useful context" },
      },
    ]);
  });

  it("rejects invalid input before making a request", async () => {
    const { client, requests } = createClient({
      responseData: { success: true },
    });
    const actionsApi = createPublicConversationEmailUpdateActionsApi({
      client,
    });

    await expect(actionsApi.resolve({ token: "short" })).rejects.toBeDefined();
    expect(requests).toHaveLength(0);
  });

  it("rejects an unparsed response", async () => {
    const { client } = createClient({ responseData: { success: "yes" } });
    const actionsApi = createPublicConversationEmailUpdateActionsApi({
      client,
    });

    await expect(actionsApi.unsubscribe({ token })).rejects.toBeDefined();
  });
});
