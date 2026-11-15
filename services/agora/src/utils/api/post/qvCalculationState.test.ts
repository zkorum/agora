import { QueryClient } from "@tanstack/vue-query";
import { describe, expect, it } from "vitest";
import { computed } from "vue";

import {
  acceptQvResultRead,
  beginQvLifecycleChange,
  clearQvCalculationFrontiers,
  getQvCalculationFrontier,
  retainQvCalculationEvent,
  settleQvLifecycleChange,
} from "./qvCalculationState";

const slug = "qvtest01";
describe("QV calculation lifecycle frontier", () => {
  it("rejects late ready events after reopen and regressing states after publication", () => {
    const queryClient = new QueryClient();
    const ready = {
      conversationSlugId: slug,
      generation: 1,
      status: "ready",
    } as const;
    expect(retainQvCalculationEvent({ queryClient, data: ready })).toBe(true);
    expect(
      retainQvCalculationEvent({
        queryClient,
        data: { ...ready, status: "calculating" },
      })
    ).toBe(false);
    expect(
      retainQvCalculationEvent({
        queryClient,
        data: { ...ready, status: "open", generation: 2 },
      })
    ).toBe(true);
    expect(retainQvCalculationEvent({ queryClient, data: ready })).toBe(false);
    expect(getQvCalculationFrontier({ queryClient, slug })).toMatchObject({
      generation: 2,
      status: "open",
    });
  });
  it("hides cached results during local lifecycle changes until a new writer read completes", () => {
    const queryClient = new QueryClient();
    retainQvCalculationEvent({
      queryClient,
      data: { conversationSlugId: slug, generation: 1, status: "ready" },
    });
    const change = beginQvLifecycleChange({ queryClient, slug });
    expect(getQvCalculationFrontier({ queryClient, slug })).toMatchObject({
      generation: 1,
      pending: true,
      requiresFreshRead: true,
    });
    settleQvLifecycleChange({ queryClient, slug, change });
    expect(getQvCalculationFrontier({ queryClient, slug })).toMatchObject({
      pending: false,
      requiresFreshRead: true,
    });
    expect(
      acceptQvResultRead({
        queryClient,
        slug,
        epoch: change.epoch,
        result: { status: "open", generation: 2 },
      })
    ).toBeDefined();
    expect(getQvCalculationFrontier({ queryClient, slug })).toMatchObject({
      generation: 2,
      status: "open",
      requiresFreshRead: false,
    });
  });
  it("does not invent extra server generations or unblock early when local commands overlap", () => {
    const queryClient = new QueryClient();
    const first = beginQvLifecycleChange({ queryClient, slug });
    const second = beginQvLifecycleChange({ queryClient, slug });
    settleQvLifecycleChange({ queryClient, slug, change: second });
    expect(getQvCalculationFrontier({ queryClient, slug }).pending).toBe(true);
    expect(
      acceptQvResultRead({
        queryClient,
        slug,
        epoch: second.epoch,
        result: { status: "calculating", generation: 1 },
      })
    ).toBeUndefined();
    settleQvLifecycleChange({ queryClient, slug, change: first });
    expect(
      acceptQvResultRead({
        queryClient,
        slug,
        epoch: second.epoch,
        result: { status: "calculating", generation: 1 },
      })
    ).toBeDefined();
    expect(getQvCalculationFrontier({ queryClient, slug }).generation).toBe(1);
  });
  it("rejects late HTTP reads from an earlier local command epoch", () => {
    const queryClient = new QueryClient();
    const change = beginQvLifecycleChange({ queryClient, slug });
    settleQvLifecycleChange({ queryClient, slug, change });
    expect(
      acceptQvResultRead({
        queryClient,
        slug,
        epoch: 0,
        result: { status: "open", generation: 0 },
      })
    ).toBeUndefined();
    expect(
      acceptQvResultRead({
        queryClient,
        slug,
        epoch: change.epoch,
        result: { status: "open", generation: 0 },
      })
    ).toBeDefined();
  });
  it("never rolls back a newer server event when a local HTTP command fails late", () => {
    const queryClient = new QueryClient();
    const change = beginQvLifecycleChange({ queryClient, slug });
    retainQvCalculationEvent({
      queryClient,
      data: { conversationSlugId: slug, generation: 3, status: "ready" },
    });
    settleQvLifecycleChange({ queryClient, slug, change });
    expect(getQvCalculationFrontier({ queryClient, slug })).toMatchObject({
      generation: 3,
      status: "ready",
      pending: false,
    });
    expect(
      acceptQvResultRead({
        queryClient,
        slug,
        epoch: change.epoch,
        result: { status: "calculating", generation: 3 },
      })
    ).toBeUndefined();
  });
  it("isolates clients and does not let an old settlement clear a post-resync command", () => {
    const queryClient = new QueryClient();
    const observed = computed(() =>
      getQvCalculationFrontier({ queryClient, slug })
    );
    const old = beginQvLifecycleChange({ queryClient, slug });
    expect(observed.value.pending).toBe(true);
    expect(
      getQvCalculationFrontier({ queryClient: new QueryClient(), slug })
        .generation
    ).toBe(0);
    clearQvCalculationFrontiers(queryClient);
    expect(observed.value.pending).toBe(false);
    const current = beginQvLifecycleChange({ queryClient, slug });
    settleQvLifecycleChange({ queryClient, slug, change: old });
    expect(getQvCalculationFrontier({ queryClient, slug }).pending).toBe(true);
    settleQvLifecycleChange({ queryClient, slug, change: current });
    expect(getQvCalculationFrontier({ queryClient, slug }).pending).toBe(false);
  });
});
