import { httpErrors } from "@fastify/sensible";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
    ConversationType,
    DeviceLoginStatusExtended,
    EventSlug,
    ParticipationBlockedReason,
    ParticipationMode,
    SurveyGateStatus,
} from "@/shared/types/zod.js";
import { useCommonPost } from "./common.js";
import * as authUtilService from "./authUtil.js";
import * as zupassService from "./zupass.js";
import { getSurveyGateSummary } from "./survey.js";

interface ResolveParticipantIdentityResultSuccess {
    success: true;
    participantId: string | undefined;
}

interface ResolveParticipantIdentityResultFailure {
    success: false;
    reason: ParticipationBlockedReason;
}

type ResolveParticipantIdentityResult =
    | ResolveParticipantIdentityResultSuccess
    | ResolveParticipantIdentityResultFailure;

interface ResolveParticipantIdentityFromDeviceStatusParams {
    deviceStatus: DeviceLoginStatusExtended;
    participationMode: ParticipationMode;
    hasStrongVerification: boolean;
    hasEmailVerification: boolean;
}

export interface CheckConversationParticipationSuccess {
    success: true;
    conversationId: number;
    conversationContentId: number;
    conversationType: ConversationType;
    participantId: string;
    participationMode: ParticipationMode;
    requiresEventTicket: EventSlug | null;
}

export interface CheckConversationParticipationFailure {
    success: false;
    reason: ParticipationBlockedReason;
}

export type CheckConversationParticipationResult =
    | CheckConversationParticipationSuccess
    | CheckConversationParticipationFailure;

function requiresRegisteredLoggedInUser({
    participationMode,
}: {
    participationMode: ParticipationMode;
}): boolean {
    return participationMode !== "guest";
}

export function getParticipationBlockedReasonFromSurveyGateStatus({
    surveyGateStatus,
    isOptional = false,
}: {
    surveyGateStatus: SurveyGateStatus;
    isOptional?: boolean;
}): ParticipationBlockedReason | undefined {
    if (isOptional) {
        return undefined;
    }

    switch (surveyGateStatus) {
        case "needs_update":
            return "survey_outdated";
        case "not_started":
        case "in_progress":
            return "survey_required";
        case "no_survey":
        case "complete_valid":
            return undefined;
    }
}

export function resolveParticipantIdentityFromDeviceStatus({
    deviceStatus,
    participationMode,
    hasStrongVerification,
    hasEmailVerification,
}: ResolveParticipantIdentityFromDeviceStatusParams): ResolveParticipantIdentityResult {
    if (!deviceStatus.isKnown) {
        switch (participationMode) {
            case "guest":
                return { success: true, participantId: undefined };
            case "account_required":
                return { success: false, reason: "account_required" };
            case "strong_verification":
                return {
                    success: false,
                    reason: "strong_verification_required",
                };
            case "email_verification":
                return {
                    success: false,
                    reason: "email_verification_required",
                };
        }
    }

    if (participationMode === "guest") {
        if (deviceStatus.isRegistered && !deviceStatus.isLoggedIn) {
            return { success: false, reason: "account_required" };
        }
        return { success: true, participantId: deviceStatus.userId };
    }

    if (!deviceStatus.isRegistered || !deviceStatus.isLoggedIn) {
        switch (participationMode) {
            case "account_required":
                return { success: false, reason: "account_required" };
            case "strong_verification":
                return {
                    success: false,
                    reason: "strong_verification_required",
                };
            case "email_verification":
                return {
                    success: false,
                    reason: "email_verification_required",
                };
        }
    }

    if (participationMode === "strong_verification" && !hasStrongVerification) {
        return {
            success: false,
            reason: "strong_verification_required",
        };
    }

    if (participationMode === "email_verification" && !hasEmailVerification) {
        return {
            success: false,
            reason: "email_verification_required",
        };
    }

    return { success: true, participantId: deviceStatus.userId };
}

async function resolveParticipantIdentity({
    db,
    deviceStatus,
    participationMode,
}: {
    db: PostgresJsDatabase;
    deviceStatus: DeviceLoginStatusExtended;
    participationMode: ParticipationMode;
}): Promise<ResolveParticipantIdentityResult> {
    if (participationMode === "guest") {
        return resolveParticipantIdentityFromDeviceStatus({
            deviceStatus,
            participationMode,
            hasStrongVerification: false,
            hasEmailVerification: false,
        });
    }

    const hasStrongVerification =
        deviceStatus.isKnown && participationMode === "strong_verification"
            ? await authUtilService.hasStrongVerification({
                  db,
                  userId: deviceStatus.userId,
              })
            : false;
    const hasEmailVerification =
        deviceStatus.isKnown && participationMode === "email_verification"
            ? await authUtilService.hasEmailVerification({
                  db,
                  userId: deviceStatus.userId,
              })
            : false;

    return resolveParticipantIdentityFromDeviceStatus({
        deviceStatus,
        participationMode,
        hasStrongVerification,
        hasEmailVerification,
    });
}

export async function checkConversationParticipation({
    db,
    conversationSlugId,
    didWrite,
    userAgent,
    now,
    requireCompletedSurvey = true,
    skipLockCheck = false,
    skipClosedCheck = false,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    didWrite: string;
    userAgent: string;
    now: Date;
    requireCompletedSurvey?: boolean;
    skipLockCheck?: boolean;
    skipClosedCheck?: boolean;
}): Promise<CheckConversationParticipationResult> {
    const { getPostMetadataFromSlugId, isConversationIdLocked } = useCommonPost();
    const metadata = await getPostMetadataFromSlugId({
        db,
        conversationSlugId,
    });

    if (metadata.contentId === null) {
        throw httpErrors.gone("Cannot participate in a deleted conversation");
    }

    if (!skipLockCheck) {
        const isLocked = await isConversationIdLocked({
            db,
            conversationId: metadata.id,
        });
        if (isLocked) {
            return {
                success: false,
                reason: "conversation_locked",
            };
        }
    }

    if (!skipClosedCheck && metadata.isClosed) {
        return {
            success: false,
            reason: "conversation_closed",
        };
    }

    const deviceStatus = await authUtilService.getDeviceStatus({
        db,
        didWrite,
        now,
    });
    const identityResolution = await resolveParticipantIdentity({
        db,
        deviceStatus,
        participationMode: metadata.participationMode,
    });
    if (!identityResolution.success) {
        return identityResolution;
    }

    let participantId = identityResolution.participantId;

    if (metadata.requiresEventTicket !== null) {
        if (participantId === undefined) {
            return {
                success: false,
                reason: "event_ticket_required",
            };
        }

        const hasEventTicket = await zupassService.hasEventTicket({
            db,
            userId: participantId,
            eventSlug: metadata.requiresEventTicket,
        });
        if (!hasEventTicket) {
            return {
                success: false,
                reason: "event_ticket_required",
            };
        }
    }

    if (requireCompletedSurvey) {
        const surveyGate = await getSurveyGateSummary({
            db,
            conversationId: metadata.id,
            participantId,
        });
        const surveyBlockedReason = getParticipationBlockedReasonFromSurveyGateStatus(
            {
                surveyGateStatus: surveyGate.status,
                isOptional: surveyGate.isOptional,
            },
        );
        if (surveyBlockedReason !== undefined) {
            return {
                success: false,
                reason: surveyBlockedReason,
            };
        }
    }

    if (participantId === undefined) {
        if (!requiresRegisteredLoggedInUser({
            participationMode: metadata.participationMode,
        })) {
            participantId = await authUtilService.getOrRegisterUserIdFromDeviceStatus({
                db,
                didWrite,
                participationMode: metadata.participationMode,
                userAgent,
                now,
            });
        } else {
            throw httpErrors.unauthorized("Device is not authorized to participate");
        }
    }

    return {
        success: true,
        conversationId: metadata.id,
        conversationContentId: metadata.contentId,
        conversationType: metadata.conversationType,
        participantId,
        participationMode: metadata.participationMode,
        requiresEventTicket: metadata.requiresEventTicket,
    };
}
