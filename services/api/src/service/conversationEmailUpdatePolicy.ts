export type ConversationEmailUpdateScopeKind = "project" | "no_project";

export type ConversationEmailParticipantPreferenceScope =
    | "project"
    | "conversation";

export function resolveConversationEmailParticipantPreferenceScope({
    scopeKind,
    projectDefaultEnabled,
    conversationOverrideEnabled,
}: {
    scopeKind: ConversationEmailUpdateScopeKind;
    projectDefaultEnabled: boolean;
    conversationOverrideEnabled: boolean | null | undefined;
}): ConversationEmailParticipantPreferenceScope | undefined {
    const configuredEnabled =
        conversationOverrideEnabled ?? projectDefaultEnabled;
    if (!configuredEnabled) return undefined;
    if (scopeKind === "no_project") return "conversation";
    return projectDefaultEnabled ? "project" : "conversation";
}

export interface ConversationEmailPreferenceState {
    globalPaused: boolean;
    projectEnabled: boolean | undefined;
    conversationEnabled: boolean | undefined;
    scopeKind: ConversationEmailUpdateScopeKind;
}

export function resolveConversationEmailPreference({
    globalPaused,
    projectEnabled,
    conversationEnabled,
    scopeKind,
}: ConversationEmailPreferenceState): boolean {
    if (globalPaused) return false;
    if (scopeKind === "no_project") return conversationEnabled === true;
    return projectEnabled === true && conversationEnabled !== false;
}

export type ConversationEmailSendingUnavailableReason =
    | "operationally_disabled"
    | "feature_not_available"
    | "legal_or_abuse_block"
    | "configuration_disabled"
    | "missing_participant_contact_email";

export type ConversationEmailSendingAvailability =
    | { available: true }
    | {
          available: false;
          reason: ConversationEmailSendingUnavailableReason;
      };

export function resolveConversationEmailSendingAvailability({
    operationallyEnabled,
    featureAvailable,
    safetyBlocked,
    configuredEnabled,
    hasParticipantContactEmail,
}: {
    operationallyEnabled: boolean;
    featureAvailable: boolean;
    safetyBlocked: boolean;
    configuredEnabled: boolean;
    hasParticipantContactEmail: boolean;
}): ConversationEmailSendingAvailability {
    if (!operationallyEnabled) {
        return { available: false, reason: "operationally_disabled" };
    }
    if (!featureAvailable) {
        return { available: false, reason: "feature_not_available" };
    }
    if (safetyBlocked) {
        return { available: false, reason: "legal_or_abuse_block" };
    }
    if (!configuredEnabled) {
        return { available: false, reason: "configuration_disabled" };
    }
    if (!hasParticipantContactEmail) {
        return {
            available: false,
            reason: "missing_participant_contact_email",
        };
    }
    return { available: true };
}

export type ConversationEmailOnboardingAction =
    | {
          operation: "set_project_preference";
          projectSlug: string;
          conversationSlugId: string;
          initialEnabled: boolean;
      }
    | {
          operation: "set_conversation_preference";
          conversationSlugId: string;
          initialEnabled: boolean;
      };

export function resolveConversationEmailOnboardingAction({
    hasVerifiedEmail,
    preferenceState,
    availability,
    scope,
}: {
    hasVerifiedEmail: boolean;
    preferenceState: "disabled" | "enabled" | "undisclosed";
    availability: ConversationEmailSendingAvailability;
    scope:
        | {
              kind: "project";
              projectSlug: string;
              conversationSlugId: string;
          }
        | { kind: "conversation"; conversationSlugId: string };
}): ConversationEmailOnboardingAction | undefined {
    if (
        !hasVerifiedEmail ||
        preferenceState !== "undisclosed" ||
        !availability.available
    ) {
        return undefined;
    }
    return scope.kind === "project"
        ? {
              operation: "set_project_preference",
              projectSlug: scope.projectSlug,
              conversationSlugId: scope.conversationSlugId,
              initialEnabled: true,
          }
        : {
              operation: "set_conversation_preference",
              conversationSlugId: scope.conversationSlugId,
              initialEnabled: true,
          };
}

const TEST_HOURLY_LIMIT = 10;
const TEST_DAILY_LIMIT = 30;
const HOUR_MS = 60 * 60 * 1_000;
const DAY_MS = 24 * HOUR_MS;

export type ConversationEmailTestRateLimitDecision =
    | { allowed: true }
    | { allowed: false; retryAt: Date };

export function decideConversationEmailTestRateLimit({
    now,
    attemptCreatedAt,
}: {
    now: Date;
    attemptCreatedAt: readonly Date[];
}): ConversationEmailTestRateLimitDecision {
    const hourly = attemptCreatedAt
        .filter((createdAt) => createdAt.getTime() >= now.getTime() - HOUR_MS)
        .sort((left, right) => left.getTime() - right.getTime());
    const daily = attemptCreatedAt
        .filter((createdAt) => createdAt.getTime() >= now.getTime() - DAY_MS)
        .sort((left, right) => left.getTime() - right.getTime());
    const retryCandidates: Date[] = [];
    if (hourly.length >= TEST_HOURLY_LIMIT) {
        const limitingAttempt = hourly.at(hourly.length - TEST_HOURLY_LIMIT);
        if (limitingAttempt !== undefined) {
            retryCandidates.push(new Date(limitingAttempt.getTime() + HOUR_MS));
        }
    }
    if (daily.length >= TEST_DAILY_LIMIT) {
        const limitingAttempt = daily.at(daily.length - TEST_DAILY_LIMIT);
        if (limitingAttempt !== undefined) {
            retryCandidates.push(new Date(limitingAttempt.getTime() + DAY_MS));
        }
    }
    if (retryCandidates.length === 0) return { allowed: true };
    return {
        allowed: false,
        retryAt: new Date(
            Math.max(
                ...retryCandidates.map((candidate) => candidate.getTime()),
            ),
        ),
    };
}

export interface ConversationEmailTestedBasis {
    authorizingOrganizationId: number;
    authorizingEntitlementId: number;
    replyToName: string;
    replyToEmail: string;
    conversationIds: readonly number[];
}

export type ConversationEmailFinalSendDecision =
    | { allowed: true }
    | {
          allowed: false;
          reason:
              | "test_not_found"
              | "test_not_accepted"
              | "test_used"
              | "delivery_already_active"
              | "authorization_changed"
              | "contact_changed"
              | "scope_changed"
              | "sending_disabled";
      };

function haveSameIds(
    left: readonly number[],
    right: readonly number[],
): boolean {
    if (left.length !== right.length) return false;
    const leftIds = new Set(left);
    return (
        leftIds.size === right.length && right.every((id) => leftIds.has(id))
    );
}

export function decideConversationEmailFinalSend({
    testStatus,
    testUsed,
    activeDelivery,
    testedBasis,
    currentBasis,
    everyConversationSendingEnabled,
}: {
    testStatus:
        | "pending"
        | "claimed"
        | "attempting"
        | "provider_accepted"
        | "retryable_rejected"
        | "permanent_rejected"
        | "unknown"
        | undefined;
    testUsed: boolean;
    activeDelivery: boolean;
    testedBasis: ConversationEmailTestedBasis | undefined;
    currentBasis: ConversationEmailTestedBasis | undefined;
    everyConversationSendingEnabled: boolean;
}): ConversationEmailFinalSendDecision {
    if (testStatus === undefined || testedBasis === undefined) {
        return { allowed: false, reason: "test_not_found" };
    }
    if (testStatus !== "provider_accepted") {
        return { allowed: false, reason: "test_not_accepted" };
    }
    if (testUsed) return { allowed: false, reason: "test_used" };
    if (activeDelivery) {
        return { allowed: false, reason: "delivery_already_active" };
    }
    if (currentBasis === undefined || !everyConversationSendingEnabled) {
        return { allowed: false, reason: "sending_disabled" };
    }
    if (
        testedBasis.authorizingOrganizationId !==
            currentBasis.authorizingOrganizationId ||
        testedBasis.authorizingEntitlementId !==
            currentBasis.authorizingEntitlementId
    ) {
        return { allowed: false, reason: "authorization_changed" };
    }
    if (
        testedBasis.replyToName !== currentBasis.replyToName ||
        testedBasis.replyToEmail !== currentBasis.replyToEmail
    ) {
        return { allowed: false, reason: "contact_changed" };
    }
    if (
        !haveSameIds(testedBasis.conversationIds, currentBasis.conversationIds)
    ) {
        return { allowed: false, reason: "scope_changed" };
    }
    return { allowed: true };
}
