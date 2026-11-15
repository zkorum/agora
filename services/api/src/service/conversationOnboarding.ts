import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    Dto,
    type ConversationOnboardingPreferenceSaveRequest,
    type ConversationOnboardingPreferenceSaveResponse,
} from "@/shared/types/dto.js";
import type { DeviceLoginStatusExtended } from "@/shared/types/zod.js";
import { createConversationEmailUpdateService } from "./conversationEmailUpdate.js";
import { getConversationParticipationStatus } from "./participationGate.js";

export async function saveConversationOnboardingPreference({
    db,
    deviceStatus,
    request,
    emailUpdateOptions,
}: {
    db: PostgresJsDatabase;
    deviceStatus: Extract<DeviceLoginStatusExtended, { isKnown: true }>;
    request: ConversationOnboardingPreferenceSaveRequest;
    emailUpdateOptions: Omit<
        Parameters<typeof createConversationEmailUpdateService>[0],
        "db"
    >;
}): Promise<ConversationOnboardingPreferenceSaveResponse> {
    return await db.transaction(async (tx) => {
        const emailUpdates = createConversationEmailUpdateService({
            ...emailUpdateOptions,
            db: tx,
        });
        const preferenceRequest =
            Dto.conversationEmailUpdatePreferenceUpdateRequest.parse(
                request.operation === "set_project_preference"
                    ? {
                          operation: request.operation,
                          projectSlug: request.projectSlug,
                          enabled: request.enabled,
                          source: {
                              kind: "onboarding",
                              conversationSlugId: request.conversationSlugId,
                          },
                      }
                    : {
                          operation: request.operation,
                          conversationSlugId: request.conversationSlugId,
                          enabled: request.enabled,
                          source: "onboarding",
                      },
            );
        const response = await emailUpdates.updatePreference({
            userId: deviceStatus.userId,
            request: preferenceRequest,
        });
        if (!response.success) return response;
        const participationStatus = await getConversationParticipationStatus({
            db: tx,
            deviceStatus,
            conversationSlugId: request.conversationSlugId,
            skipEmailUpdateConsent: false,
            getEmailUpdateOnboardingAction: (params) =>
                emailUpdates.getParticipationOnboardingAction({
                    database: tx,
                    ...params,
                }),
        });
        return { ...response, participationStatus };
    });
}
