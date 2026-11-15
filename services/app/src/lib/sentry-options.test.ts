import type { Event } from "@sentry/sveltekit";
import {
  defaultStackParser,
  NodeClient,
  requestDataIntegration,
} from "@sentry/sveltekit";
import { describe, expect, it } from "vitest";

import { sentryOptions } from "./sentry-options.js";

function createOfflineClient() {
  // Exercise SDK filtering without installing global instrumentation or sending data.
  return new NodeClient({
    ...sentryOptions,
    integrations: [],
    stackParser: defaultStackParser,
    transport: () => ({
      send: () => Promise.resolve({ statusCode: 200 }),
      flush: () => Promise.resolve(true),
    }),
  });
}

describe("Sentry 11 privacy migration", () => {
  it("keeps newly enabled content categories off in the resolved SDK policy", async () => {
    const client = createOfflineClient();
    try {
      expect(client.getDataCollectionOptions()).toEqual({
        userInfo: false,
        cookies: false,
        httpHeaders: {
          request: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
          response: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
        },
        httpBodies: [],
        urlQueryParams: {
          deny: ["forwarded", "-ip", "remote-", "via", "-user"],
        },
        genAI: { inputs: false, outputs: false },
        mcp: { inputs: false, outputs: false },
        databaseQueryData: false,
        graphQL: { document: false, variables: false },
        queues: false,
        stackFrameVariables: true,
        frameContextLines: 7,
      });
    } finally {
      await client.close(0);
    }
  });

  it("filters request credentials and identity through the real SDK integration", async () => {
    const client = createOfflineClient();
    const integration = requestDataIntegration();
    const event: Event = {
      sdkProcessingMetadata: {
        normalizedRequest: {
          method: "GET",
          url: "https://example.com/resources?token=private-token&x-user=private-user&view=full",
          headers: {
            cookie: "session=private-session; theme=dark",
            authorization: "Bearer private-authorization",
            "x-forwarded-for": "198.51.100.17",
            "x-user-id": "private-user",
            accept: "application/json",
          },
        },
        ipAddress: "198.51.100.17",
      },
    };
    try {
      const processed = await integration.processEvent?.(event, {}, client);
      expect(processed?.request?.headers?.accept).toBe("application/json");
      expect(processed?.request?.cookies).toBeUndefined();
      expect(processed?.request?.headers?.cookie).toBeUndefined();
      expect(processed?.user?.ip_address).toBeUndefined();
      // Processing metadata deliberately contains the synthetic source request;
      // it is SDK-internal and is not part of the request/user event payload.
      const collected = JSON.stringify({
        request: processed?.request,
        user: processed?.user,
      });
      for (const value of [
        "private-token",
        "private-user",
        "private-session",
        "private-authorization",
        "198.51.100.17",
      ]) {
        expect(collected).not.toContain(value);
      }
    } finally {
      await client.close(0);
    }
  });
});
