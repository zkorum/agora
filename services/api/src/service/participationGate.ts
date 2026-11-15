import { httpErrors } from "@fastify/sensible";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
    ConversationEmailUpdateOnboardingAction,
    ConversationOnboardingStep,
    ConversationParticipationRejection,
    ConversationParticipationStatus,
} from "@/shared/types/dto.js";
import type {
    ConversationType,
    DeviceLoginStatusExtended,
    ParticipationBlockedReason,
    ParticipationMode,
    RankingMode,
    SurveyGateStatus,
} from "@/shared/types/zod.js";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import { useCommonPost } from "./common.js";
import * as authUtilService from "./authUtil.js";
import { getSurveyParticipationStatus } from "./survey.js";

interface ResolveParticipantIdentityResultSuccess {
    success: true;
    participantId: string | undefined;
}

interface ResolveParticipantIdentityResultFailure {
    success: false;
    reason: Extract<
        ParticipationBlockedReason,
        | "account_required"
        | "email_verification_required"
        | "strong_verification_required"
    >;
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
    rankingMode: RankingMode | null;
    prioritizationType: "comparisons" | "qv" | null;
    participantId: string;
    participationMode: ParticipationMode;
}

export type CheckConversationParticipationFailure =
    ConversationParticipationRejection;

const verificationStepKinds = {
    account_required: "account",
    email_verification_required: "email",
    strong_verification_required: "identity",
} satisfies Record<
    Exclude<
        ParticipationBlockedReason,
        | "survey_required"
        | "survey_outdated"
        | "conversation_closed"
        | "conversation_locked"
    >,
    Exclude<ConversationOnboardingStep["kind"], "survey">
>;

function rejectParticipation({
    reason,
    deviceStatus,
}: {
    reason: Exclude<
        ParticipationBlockedReason,
        "survey_required" | "survey_outdated"
    >;
    deviceStatus: DeviceLoginStatusExtended;
}): CheckConversationParticipationFailure {
    return {
        success: false,
        reason,
        participationStatus:
            reason === "conversation_closed" || reason === "conversation_locked"
                ? { status: "blocked", reason }
                : {
                      status: "onboarding_required",
                      nextStep: {
                          kind: verificationStepKinds[reason],
                          purpose: deviceStatus.isLoggedIn
                              ? "credential"
                              : "login",
                      },
                  },
    };
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
}):
    | Extract<ParticipationBlockedReason, "survey_required" | "survey_outdated">
    | undefined {
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
    if (
        participationMode === "guest" ||
        !deviceStatus.isKnown ||
        !deviceStatus.isRegistered ||
        !deviceStatus.isLoggedIn
    ) {
        return resolveParticipantIdentityFromDeviceStatus({
            deviceStatus,
            participationMode,
            hasStrongVerification: false,
            hasEmailVerification: false,
        });
    }

    const hasStrongVerification =
        participationMode === "strong_verification"
            ? deviceStatus.credentials.phone !== null ||
              deviceStatus.credentials.rarimo !== null ||
              (await authUtilService.hasStrongVerification({
                  db,
                  userId: deviceStatus.userId,
              }))
            : false;
    const hasEmailVerification =
        participationMode === "email_verification"
            ? deviceStatus.credentials.email !== null ||
              (await authUtilService.hasEmailVerification({
                  db,
                  userId: deviceStatus.userId,
              }))
            : false;

    return resolveParticipantIdentityFromDeviceStatus({
        deviceStatus,
        participationMode,
        hasStrongVerification,
        hasEmailVerification,
    });
}

type ParticipationEligibility =
    | (Omit<CheckConversationParticipationSuccess, "participantId"> & {
          participantId: string | undefined;
      })
    | CheckConversationParticipationFailure;

export async function resolveConversationParticipation({
    db,
    conversationSlugId,
    deviceStatus,
    requireCompletedSurvey = true,
    skipLockCheck = false,
    skipClosedCheck = false,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    deviceStatus: DeviceLoginStatusExtended;
    requireCompletedSurvey?: boolean;
    skipLockCheck?: boolean;
    skipClosedCheck?: boolean;
}): Promise<ParticipationEligibility> {
    const { getPostParticipationMetadataFromSlugId, isConversationIdLocked } =
        useCommonPost();
    const metadata = await getPostParticipationMetadataFromSlugId({
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
            return rejectParticipation({
                reason: "conversation_locked",
                deviceStatus,
            });
        }
    }

    if (!skipClosedCheck && metadata.isClosed) {
        return rejectParticipation({
            reason: "conversation_closed",
            deviceStatus,
        });
    }

    const identityResolution = await resolveParticipantIdentity({
        db,
        deviceStatus,
        participationMode: metadata.participationMode,
    });
    if (!identityResolution.success) {
        return rejectParticipation({
            reason: identityResolution.reason,
            deviceStatus,
        });
    }

    const participantId = identityResolution.participantId;

    const surveyStatus = requireCompletedSurvey
        ? await getSurveyParticipationStatus({
              db,
              conversationId: metadata.id,
              participantId,
          })
        : undefined;
    if (surveyStatus !== undefined) {
        const { surveyGate } = surveyStatus;
        const surveyBlockedReason =
            getParticipationBlockedReasonFromSurveyGateStatus({
                surveyGateStatus: surveyGate.status,
                isOptional: surveyGate.isOptional,
            });
        if (surveyBlockedReason !== undefined) {
            return {
                success: false,
                reason: surveyBlockedReason,
                participationStatus: {
                    status: "onboarding_required",
                    nextStep: {
                        kind: "survey",
                        routeResolution: surveyStatus.routeResolution,
                    },
                },
            };
        }
    }

    return {
        success: true,
        conversationId: metadata.id,
        conversationContentId: metadata.contentId,
        conversationType: metadata.conversationType,
        rankingMode: metadata.rankingMode,
        prioritizationType: metadata.prioritizationType,
        participantId,
        participationMode: metadata.participationMode,
    };
}

export async function getConversationParticipationStatus({
    db,
    conversationSlugId,
    deviceStatus,
    getEmailUpdateOnboardingAction,
    skipEmailUpdateConsent,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    deviceStatus: DeviceLoginStatusExtended;
    getEmailUpdateOnboardingAction: (params: {
        userId: string;
        conversationSlugId: string;
    }) => Promise<ConversationEmailUpdateOnboardingAction | undefined>;
    skipEmailUpdateConsent: boolean;
}): Promise<ConversationParticipationStatus> {
    const eligibility = await resolveConversationParticipation({
        db,
        conversationSlugId,
        deviceStatus,
    });
    if (
        !eligibility.success &&
        eligibility.reason !== "survey_required" &&
        eligibility.reason !== "survey_outdated"
    )
        return eligibility.participationStatus;
    const emailUpdateAction =
        !skipEmailUpdateConsent &&
        deviceStatus.isKnown &&
        deviceStatus.isRegistered &&
        deviceStatus.isLoggedIn &&
        deviceStatus.credentials.email !== null &&
        (await getEmailUpdateOnboardingAction({
            userId: deviceStatus.userId,
            conversationSlugId,
        }));
    if (emailUpdateAction)
        return {
            status: "onboarding_required",
            nextStep: { kind: "email_updates", action: emailUpdateAction },
        };
    if (!eligibility.success) return eligibility.participationStatus;
    return { status: "ready" };
}

export async function checkConversationParticipation({
    db,
    conversationSlugId,
    didWrite,
    userAgent,
    now,
    currentDisplayLanguage,
    requireCompletedSurvey = true,
    skipLockCheck = false,
    skipClosedCheck = false,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    didWrite: string;
    userAgent: string;
    now: Date;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
    requireCompletedSurvey?: boolean;
    skipLockCheck?: boolean;
    skipClosedCheck?: boolean;
}): Promise<CheckConversationParticipationResult> {
    const deviceStatus = await authUtilService.getDeviceStatus({
        db,
        didWrite,
        now,
    });
    return await checkConversationParticipationWithDeviceStatus({
        db,
        conversationSlugId,
        didWrite,
        userAgent,
        now,
        currentDisplayLanguage,
        requireCompletedSurvey,
        skipLockCheck,
        skipClosedCheck,
        deviceStatus,
    });
}

/** Reuse a device snapshot resolved at the caller's lifecycle/identity boundary. */
export async function checkConversationParticipationWithDeviceStatus({
    db,
    conversationSlugId,
    didWrite,
    userAgent,
    now,
    currentDisplayLanguage,
    requireCompletedSurvey = true,
    skipLockCheck = false,
    skipClosedCheck = false,
    deviceStatus,
}: Parameters<typeof checkConversationParticipation>[0] & {
    deviceStatus: DeviceLoginStatusExtended;
}): Promise<CheckConversationParticipationResult> {
    const eligibility = await resolveConversationParticipation({
        db,
        conversationSlugId,
        deviceStatus,
        requireCompletedSurvey,
        skipLockCheck,
        skipClosedCheck,
    });
    if (!eligibility.success) return eligibility;
    let participantId = eligibility.participantId;
    if (participantId === undefined) {
        if (
            !requiresRegisteredLoggedInUser({
                participationMode: eligibility.participationMode,
            })
        ) {
            participantId =
                await authUtilService.getOrRegisterUserIdFromDeviceStatus({
                    db,
                    didWrite,
                    participationMode: eligibility.participationMode,
                    userAgent,
                    now,
                    currentDisplayLanguage,
                });
        } else {
            throw httpErrors.unauthorized(
                "Device is not authorized to participate",
            );
        }
    }

    return {
        ...eligibility,
        participantId,
    };
}
