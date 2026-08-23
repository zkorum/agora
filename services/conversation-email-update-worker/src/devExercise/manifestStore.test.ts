import { randomUUID } from "node:crypto";
import { rm, stat } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { parseDevExerciseEnvironment } from "./guard.js";
import {
    createExerciseArtifactStore,
    getExerciseArtifactDirectory,
} from "./manifestStore.js";
import { createExercisePlan, exerciseReportSchema } from "./schemas.js";

const createdNamespaces: string[] = [];

function planForTest() {
    const namespace = `manifest-${randomUUID().replaceAll("-", "").slice(0, 12)}`;
    createdNamespaces.push(namespace);
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
            CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_PARTICIPANT_COUNT: "3",
            CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_NAMESPACE: namespace,
            CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_SCENARIO: "success",
            CONVERSATION_EMAIL_UPDATE_DEV_EXERCISE_CAPTURE_BODIES: "false",
        }),
    );
}

afterEach(async () => {
    await Promise.all(
        createdNamespaces.splice(0).flatMap((namespace) =>
            [
                `${getExerciseArtifactDirectory()}/${namespace}.manifest.json`,
                `${getExerciseArtifactDirectory()}/${namespace}.report.json`,
            ].map(async (path) => {
                await rm(path, { force: true });
            }),
        ),
    );
});

describe("development exercise artifact store", () => {
    it("allows only one concurrent manifest creator", async () => {
        const artifacts = createExerciseArtifactStore();
        const plan = planForTest();
        const results = await Promise.allSettled([
            artifacts.createManifest(plan),
            artifacts.createManifest(plan),
        ]);
        expect(
            results.filter((result) => result.status === "fulfilled"),
        ).toHaveLength(1);
        expect(
            results.filter((result) => result.status === "rejected"),
        ).toHaveLength(1);
    });

    it("atomically stores mode-0600 manifests and exact transitions", async () => {
        const artifacts = createExerciseArtifactStore();
        const plan = planForTest();
        const created = await artifacts.createManifest(plan);
        const path = `${getExerciseArtifactDirectory()}/${plan.namespace}.manifest.json`;

        expect(created.state).toBe("planned");
        expect((await stat(path)).mode & 0o777).toBe(0o600);
        const prepared = await artifacts.transitionManifest({
            namespace: plan.namespace,
            to: "fixture_prepared",
            fixture: {
                projectId: 10,
                projectSlug: "local-project",
                conversationId: 20,
                conversationContentId: 21,
                conversationSlugId: plan.conversationSlugId,
                opinionId: 30,
                opinionContentId: 31,
                preparedAt: new Date().toISOString(),
                participantCount: plan.participantCount,
                participantReferences: plan.identities.map(
                    (identity, index) => ({
                        userId: identity.userId,
                        emailId: 100 + index,
                        projectPreference: {
                            userId: identity.userId,
                            projectId: 10,
                        },
                        conversationPreference: {
                            userId: identity.userId,
                            conversationId: 20,
                        },
                        voteId: 200 + index,
                        voteContentId: 300 + index,
                    }),
                ),
            },
        });
        expect(prepared.revision).toBe(1);
        expect(prepared.state).toBe("fixture_prepared");
        await expect(
            artifacts.transitionManifest({
                namespace: plan.namespace,
                to: "verified",
            }),
        ).rejects.toThrow("fixture_prepared -> verified");
    });

    it("round-trips strict reports", async () => {
        const artifacts = createExerciseArtifactStore();
        const plan = planForTest();
        await artifacts.createManifest(plan);
        const report = exerciseReportSchema.parse({
            schemaVersion: 2,
            namespace: plan.namespace,
            fixtureId: plan.fixtureId,
            status: "incomplete",
            observedAt: new Date().toISOString(),
            provider: {
                aggregate: {
                    sendCalls: 0,
                    providerAccepted: 0,
                    retryableRejected: 0,
                    permanentRejected: 0,
                    unknown: 0,
                },
                observations: [],
            },
            failures: ["Observation pending"],
        });
        await artifacts.writeReport(report);
        expect(await artifacts.readReport(plan.namespace)).toEqual(report);
        expect(await artifacts.readReportIfExists(plan.namespace)).toEqual(
            report,
        );
    });

    it("returns no optional report before one exists", async () => {
        const artifacts = createExerciseArtifactStore();
        const plan = planForTest();
        await artifacts.createManifest(plan);
        await expect(
            artifacts.readReportIfExists(plan.namespace),
        ).resolves.toBeUndefined();
    });
});
