import { type ConversationOnboardingStep, Dto } from "src/shared/types/dto";
import { emailUpdateActionFixture } from "src/utils/api/participation/participationTestFixtures";
import type { ParticipationStatus } from "src/utils/api/participation/useParticipationStatusQuery";
import type { ConversationRouteContext } from "src/utils/router/conversationRouteContext";
import { describe, expect, it } from "vitest";

import { resolveVerifyRouteDecision } from "./verifyRouteLogic";

const steps = [
  { step: { kind: "account", purpose: "login" }, suffix: "verify/hard" },
  { step: { kind: "email", purpose: "login" }, suffix: "verify/email" },
  {
    step: { kind: "identity", purpose: "credential" },
    suffix: "verify/identity",
  },
  {
    step: { kind: "email_updates", action: emailUpdateActionFixture },
    suffix: "complete",
  },
  {
    step: {
      kind: "survey",
      routeResolution: { kind: "question", questionSlugId: "question" },
    },
    suffix: "question/question",
  },
  {
    step: { kind: "survey", routeResolution: { kind: "summary" } },
    suffix: "summary",
  },
] satisfies Array<{ step: ConversationOnboardingStep; suffix: string }>;
const contexts = [
  { context: { kind: "normal" }, prefix: "/conversation/example" },
  { context: { kind: "embed" }, prefix: "/conversation/example/embed" },
  {
    context: { kind: "project", projectSlug: "project" },
    prefix: "/project/project/conversation/example",
  },
] satisfies Array<{ context: ConversationRouteContext; prefix: string }>;

describe("backend-owned onboarding route", () => {
  for (const { context, prefix } of contexts) {
    it.each(steps)(
      `maps the backend step to ${context.kind} /$suffix without other query data`,
      ({ step, suffix }) => {
        expect(
          resolveVerifyRouteDecision({
            exactVerifyRoute: true,
            participationStatus: {
              status: "onboarding_required",
              nextStep: step,
            },
            conversationSlugId: "example",
            routeContext: context,
          })
        ).toEqual({ kind: "redirect", path: `${prefix}/onboarding/${suffix}` });
      }
    );
  }

  it.each([
    { status: "checking" },
    { status: "unavailable" },
  ] satisfies ParticipationStatus[])(
    "does not navigate with $status status",
    (participationStatus) => {
      expect(
        resolveVerifyRouteDecision({
          exactVerifyRoute: true,
          participationStatus,
          conversationSlugId: "example",
          routeContext: { kind: "normal" },
        })
      ).toEqual({ kind: "none" });
    }
  );

  it("finishes directly when the backend reports nothing remains", () => {
    expect(
      resolveVerifyRouteDecision({
        exactVerifyRoute: true,
        participationStatus: { status: "ready" },
        conversationSlugId: "example",
        routeContext: { kind: "normal" },
      })
    ).toEqual({ kind: "complete" });
  });

  it("dismisses a closed conversation without announcing successful onboarding", () => {
    expect(
      resolveVerifyRouteDecision({
        exactVerifyRoute: true,
        participationStatus: {
          status: "blocked",
          reason: "conversation_closed",
        },
        conversationSlugId: "example",
        routeContext: { kind: "normal" },
      })
    ).toEqual({ kind: "dismiss" });
  });

  it("leaves an active credential form alone", () => {
    expect(
      resolveVerifyRouteDecision({
        exactVerifyRoute: false,
        participationStatus: { status: "ready" },
        conversationSlugId: "example",
        routeContext: { kind: "normal" },
      })
    ).toEqual({ kind: "none" });
  });

  it("requires the backend snapshot on participation rejection, but not a changed statement", () => {
    expect(
      Dto.castVoteResponse.safeParse({
        success: false,
        reason: "survey_required",
      }).success
    ).toBe(false);
    expect(
      Dto.castVoteResponse.safeParse({
        success: false,
        reason: "statement_changed",
      }).success
    ).toBe(true);
    expect(
      Dto.conversationParticipationRejection.safeParse({
        success: false,
        reason: "survey_required",
        participationStatus: { status: "ready" },
      }).success
    ).toBe(false);
  });
});
