import { expect, it } from "vitest";
import { splitWorkspaceAudienceEstimateBatches } from "./conversationEmailUpdate.js";

it("splits workspaces at the 1,000-conversation query boundary", () => {
    const items = Array.from({ length: 1_001 }, (_, index) => index);

    const batches = splitWorkspaceAudienceEstimateBatches({ items });

    expect(batches).toHaveLength(2);
    expect(batches[0]).toHaveLength(1_000);
    expect(batches[1]).toEqual([1_000]);
});
