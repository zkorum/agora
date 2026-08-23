import { describe, expect, it } from "vitest";
import type { ConversationEmailProviderMessage } from "../provider.js";
import { parseDevExerciseEnvironment } from "./guard.js";
import { createInstrumentedSimulatedProvider } from "./instrumentedProvider.js";
import type { ExerciseArtifactStore } from "./manifestStore.js";
import { createExercisePlan } from "./schemas.js";

function planForScenario(
    scenario:
        | "success"
        | "owner_permanent_rejection"
        | "participant_retry_then_success"
        | "mixed_participant_outcomes",
) {
    return createExercisePlan(
        parseDevExerciseEnvironment({
            NODE_ENV: "development",
            AGORA_DEV_MODE: "true",
            CONNECTION_STRING:
                "postgresql://postgres@127.0.0.1/agora_email_exercise_test",
            CONVERSATION_EMAIL_UPDATES_ENABLED: "true",
            CONVERSATION_EMAIL_UPDATES_KILL_SWITCH: "false",
            CONVERSATION_EMAIL_UPDATE_PROVIDER: "simulated",
            CONVERSATION_EMAIL_UPDATE_SIMULATOR_ENABLED: "true",
            CONVERSATION_EMAIL_UPDATE_SITE_BASE_URL: "http://127.0.0.1:8080",
            CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_EXPECTED_DB_NAME:
                "agora_email_exercise_test",
            CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_DATABASE_MARKER: "m".repeat(
                32,
            ),
            CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CONVERSATION_SLUG_ID:
                "Ab12Cd34",
            CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_PARTICIPANT_COUNT: "6",
            CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_NAMESPACE: `provider-${scenario.replaceAll("_", "-")}`,
            CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_SCENARIO: scenario,
            CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CAPTURE_BODIES: "false",
        }),
    );
}

function message({
    to,
    kind,
    recipientId = "101",
}: {
    to: string;
    kind: "test" | "owner_copy" | "participant";
    recipientId?: string;
}): ConversationEmailProviderMessage {
    return {
        to,
        subject: "Local update",
        html: "<p>Local body</p>",
        text: "Local body",
        replyToName: "Project contact",
        replyToEmail: "owner@local.test",
        tags:
            kind === "test"
                ? {
                      message_type: "conversation_update_test",
                      conversation_update_id: "42",
                      conversation_update_test_id:
                          "00000000-0000-4000-8000-000000000001",
                  }
                : {
                      message_type: "conversation_update",
                      conversation_update_id: "42",
                      conversation_update_recipient_id: recipientId,
                  },
        unsubscribeUrl:
            kind === "participant" ? "http://127.0.0.1/unsubscribe" : undefined,
    };
}

function artifacts(capturedMessages: unknown[]): ExerciseArtifactStore {
    return {
        createManifest: async () => await Promise.reject(new Error("unused")),
        readManifest: async () => await Promise.reject(new Error("unused")),
        transitionManifest: async () =>
            await Promise.reject(new Error("unused")),
        writeReport: async () => await Promise.reject(new Error("unused")),
        readReport: async () => await Promise.reject(new Error("unused")),
        readReportIfExists: async () =>
            await Promise.reject(new Error("unused")),
        writeCapturedMessage: async ({ message: capturedMessage }) => {
            await Promise.resolve();
            capturedMessages.push(capturedMessage);
            return "/local/captured-message.json";
        },
    };
}

function identityFor({
    plan,
    cohort,
}: {
    plan: ReturnType<typeof planForScenario>;
    cohort: ReturnType<typeof planForScenario>["identities"][number]["cohort"];
}) {
    const identity = plan.identities.find(
        (candidate) => candidate.cohort === cohort,
    );
    if (identity === undefined) throw new Error(`Missing ${cohort} identity`);
    return identity;
}

describe("instrumented development exercise provider", () => {
    it("always accepts test messages and identifies owner copies without fixture emails", async () => {
        const plan = planForScenario("owner_permanent_rejection");
        const instrumented = createInstrumentedSimulatedProvider({
            plan,
            captureBodies: false,
            artifacts: artifacts([]),
        });
        expect(
            (
                await instrumented.provider.send(
                    message({ to: "owner@local.test", kind: "test" }),
                )
            ).kind,
        ).toBe("provider_accepted");
        expect(
            (
                await instrumented.provider.send(
                    message({ to: "owner@local.test", kind: "owner_copy" }),
                )
            ).kind,
        ).toBe("permanent_rejected");
        expect(instrumented.snapshot().observations).toMatchObject([
            {
                messageType: "conversation_update_test",
                recipientKind: "test",
                updateId: 42,
            },
            {
                messageType: "conversation_update",
                recipientKind: "owner_copy",
                updateId: 42,
                recipientId: "101",
            },
        ]);
    });

    it("retries an exact fixture participant and then succeeds", async () => {
        const plan = planForScenario("participant_retry_then_success");
        const instrumented = createInstrumentedSimulatedProvider({
            plan,
            captureBodies: false,
            artifacts: artifacts([]),
        });
        const identity = identityFor({
            plan,
            cohort: "participant_retry",
        });
        const retryMessage = message({
            to: identity.email,
            kind: "participant",
        });

        expect((await instrumented.provider.send(retryMessage)).kind).toBe(
            "retryable_rejected",
        );
        expect((await instrumented.provider.send(retryMessage)).kind).toBe(
            "provider_accepted",
        );
        expect(instrumented.snapshot().observations[0]).toMatchObject({
            cohort: "participant_retry",
            participantOrdinal: identity.ordinal,
            recipientKind: "participant",
        });
    });

    it("records mixed outcomes and captures bodies only when requested", async () => {
        const plan = planForScenario("mixed_participant_outcomes");
        const capturedMessages: unknown[] = [];
        const instrumented = createInstrumentedSimulatedProvider({
            plan,
            captureBodies: true,
            artifacts: artifacts(capturedMessages),
        });
        const success = identityFor({ plan, cohort: "participant_success" });
        const retry = identityFor({ plan, cohort: "participant_retry" });
        const failure = identityFor({
            plan,
            cohort: "participant_permanent_failure",
        });

        await instrumented.provider.send(
            message({
                to: success.email,
                kind: "participant",
                recipientId: "1",
            }),
        );
        const retryMessage = message({
            to: retry.email,
            kind: "participant",
            recipientId: "2",
        });
        await instrumented.provider.send(retryMessage);
        await instrumented.provider.send(retryMessage);
        await instrumented.provider.send(
            message({
                to: failure.email,
                kind: "participant",
                recipientId: "3",
            }),
        );
        const snapshot = instrumented.snapshot();

        expect(snapshot.aggregate).toEqual({
            sendCalls: 4,
            providerAccepted: 2,
            retryableRejected: 1,
            permanentRejected: 1,
            unknown: 0,
        });
        expect(snapshot.observations[0]).not.toHaveProperty("to");
        expect(snapshot.observations[0]?.recipientHash).toMatch(
            /^[a-f0-9]{64}$/,
        );
        expect(capturedMessages).toHaveLength(4);
        expect(capturedMessages[0]).toMatchObject({
            html: "<p>Local body</p>",
        });
    });

    it("refuses a participant address outside the exact fixture set", async () => {
        const plan = planForScenario("success");
        const instrumented = createInstrumentedSimulatedProvider({
            plan,
            captureBodies: false,
            artifacts: artifacts([]),
        });
        await expect(
            instrumented.provider.send(
                message({
                    to: "not-a-fixture@exercise.invalid",
                    kind: "participant",
                }),
            ),
        ).rejects.toThrow("outside the exact fixture email set");
    });
});
