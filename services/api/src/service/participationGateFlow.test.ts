import { drizzle } from "drizzle-orm/postgres-js";
import type { ConversationEmailUpdateOnboardingAction } from "@/shared/types/dto.js";
import type {
    DeviceLoginStatusExtended,
    ParticipationMode,
} from "@/shared/types/zod.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    metadata: vi.fn(),
    locked: vi.fn(),
    device: vi.fn(),
    strong: vi.fn(),
    email: vi.fn(),
    register: vi.fn(),
    survey: vi.fn(),
}));
vi.mock("./common.js", () => ({
    useCommonPost: () => ({
        getPostParticipationMetadataFromSlugId: mocks.metadata,
        isConversationIdLocked: mocks.locked,
    }),
}));
vi.mock("./authUtil.js", () => ({
    getDeviceStatus: mocks.device,
    hasStrongVerification: mocks.strong,
    hasEmailVerification: mocks.email,
    getOrRegisterUserIdFromDeviceStatus: mocks.register,
}));
vi.mock("./survey.js", () => ({ getSurveyParticipationStatus: mocks.survey }));

import {
    checkConversationParticipation,
    getConversationParticipationStatus,
} from "./participationGate.js";

const db = drizzle.mock();
const noSurvey = {
    surveyGate: {
        hasSurvey: false,
        isOptional: false,
        canParticipate: true,
        status: "no_survey",
    },
    routeResolution: { kind: "none" },
} as const;
const requiredSurvey = {
    surveyGate: {
        hasSurvey: true,
        isOptional: false,
        canParticipate: false,
        status: "not_started",
    },
    routeResolution: { kind: "question", questionSlugId: "question" },
} as const;
const metadata = {
    id: 42,
    contentId: 7,
    conversationType: "polis",
    rankingMode: null,
    isIndexed: true,
    participationMode: "guest",
    isClosed: false,
    // Legacy stored settings must not influence any remaining participation rule.
    requiresEventTicket: "devconnect-2025",
} as const;
const unknownDevice: DeviceLoginStatusExtended = {
    isKnown: false,
    isRegistered: false,
    isLoggedIn: false,
    credentials: { email: null, phone: null, rarimo: null },
};
const emailDevice: DeviceLoginStatusExtended = {
    isKnown: true,
    isRegistered: true,
    isLoggedIn: true,
    userId: "user-one",
    credentials: { email: "verified@example.com", phone: null, rarimo: null },
};
const emailAction: ConversationEmailUpdateOnboardingAction = {
    operation: "set_conversation_preference",
    conversationSlugId: "example",
    initialEnabled: true,
};

beforeEach(() => {
    vi.resetAllMocks();
    mocks.metadata.mockResolvedValue(metadata);
    mocks.locked.mockResolvedValue(false);
    mocks.device.mockResolvedValue(unknownDevice);
    mocks.strong.mockResolvedValue(false);
    mocks.email.mockResolvedValue(false);
    mocks.register.mockResolvedValue("guest-one");
    mocks.survey.mockResolvedValue(noSurvey);
});

describe("backend-owned participation snapshot", () => {
    it("preloads without creating a guest or exposing internal metadata", async () => {
        const getEmailUpdateOnboardingAction =
            vi.fn<
                () => Promise<
                    ConversationEmailUpdateOnboardingAction | undefined
                >
            >();
        const result = await getConversationParticipationStatus({
            db,
            conversationSlugId: "example",
            deviceStatus: unknownDevice,
            getEmailUpdateOnboardingAction,
            skipEmailUpdateConsent: false,
        });
        expect(result).toEqual({ status: "ready" });
        expect(mocks.register).not.toHaveBeenCalled();
        expect(getEmailUpdateOnboardingAction).not.toHaveBeenCalled();
        expect(mocks.survey).toHaveBeenCalledOnce();
    });

    it.each([
        { mode: "account_required", kind: "account" },
        { mode: "email_verification", kind: "email" },
        { mode: "strong_verification", kind: "identity" },
    ] satisfies { mode: ParticipationMode; kind: string }[])(
        "resolves $mode before loading a questionnaire",
        async ({ mode, kind }) => {
            mocks.metadata.mockResolvedValue({
                ...metadata,
                participationMode: mode,
            });
            const getEmailUpdateOnboardingAction =
                vi.fn<
                    () => Promise<
                        ConversationEmailUpdateOnboardingAction | undefined
                    >
                >();
            const result = await getConversationParticipationStatus({
                db,
                conversationSlugId: "example",
                deviceStatus: unknownDevice,
                getEmailUpdateOnboardingAction,
                skipEmailUpdateConsent: false,
            });
            expect(result).toEqual({
                status: "onboarding_required",
                nextStep: { kind, purpose: "login" },
            });
            expect(mocks.survey).not.toHaveBeenCalled();
            expect(getEmailUpdateOnboardingAction).not.toHaveBeenCalled();
        },
    );

    it("returns the next question from the same survey read used for eligibility", async () => {
        mocks.survey.mockResolvedValue(requiredSurvey);
        const result = await getConversationParticipationStatus({
            db,
            conversationSlugId: "example",
            deviceStatus: unknownDevice,
            getEmailUpdateOnboardingAction: () => Promise.resolve(undefined),
            skipEmailUpdateConsent: true,
        });
        expect(result).toEqual({
            status: "onboarding_required",
            nextStep: {
                kind: "survey",
                routeResolution: requiredSurvey.routeResolution,
            },
        });
        expect(mocks.survey).toHaveBeenCalledOnce();
        expect(mocks.register).not.toHaveBeenCalled();
    });

    it("offers applicable consent before the survey and skips only that optional step", async () => {
        mocks.survey.mockResolvedValue(requiredSurvey);
        const getEmailUpdateOnboardingAction = vi
            .fn<
                () => Promise<
                    ConversationEmailUpdateOnboardingAction | undefined
                >
            >()
            .mockResolvedValue(emailAction);
        const params = {
            db,
            conversationSlugId: "example",
            deviceStatus: emailDevice,
            getEmailUpdateOnboardingAction,
        };
        expect(
            await getConversationParticipationStatus({
                ...params,
                skipEmailUpdateConsent: false,
            }),
        ).toEqual({
            status: "onboarding_required",
            nextStep: { kind: "email_updates", action: emailAction },
        });
        getEmailUpdateOnboardingAction.mockClear();
        expect(
            await getConversationParticipationStatus({
                ...params,
                skipEmailUpdateConsent: true,
            }),
        ).toEqual({
            status: "onboarding_required",
            nextStep: {
                kind: "survey",
                routeResolution: requiredSurvey.routeResolution,
            },
        });
        expect(getEmailUpdateOnboardingAction).not.toHaveBeenCalled();
    });

    it("does not query surveys or email policy for a locked conversation", async () => {
        mocks.locked.mockResolvedValue(true);
        const getEmailUpdateOnboardingAction =
            vi.fn<
                () => Promise<
                    ConversationEmailUpdateOnboardingAction | undefined
                >
            >();
        expect(
            await getConversationParticipationStatus({
                db,
                conversationSlugId: "example",
                deviceStatus: emailDevice,
                getEmailUpdateOnboardingAction,
                skipEmailUpdateConsent: false,
            }),
        ).toEqual({ status: "blocked", reason: "conversation_locked" });
        expect(mocks.survey).not.toHaveBeenCalled();
        expect(getEmailUpdateOnboardingAction).not.toHaveBeenCalled();
    });

    it("requires sign-in for a registered signed-out device even in guest mode", async () => {
        const result = await getConversationParticipationStatus({
            db,
            conversationSlugId: "example",
            deviceStatus: { ...emailDevice, isLoggedIn: false },
            getEmailUpdateOnboardingAction: () => Promise.resolve(undefined),
            skipEmailUpdateConsent: false,
        });
        expect(result).toEqual({
            status: "onboarding_required",
            nextStep: { kind: "account", purpose: "login" },
        });
    });

    it("returns a required next-step snapshot with a write rejection", async () => {
        mocks.survey.mockResolvedValue(requiredSurvey);
        const result = await checkConversationParticipation({
            db,
            conversationSlugId: "example",
            didWrite: "did:test:1",
            userAgent: "Vitest",
            now: new Date(),
            currentDisplayLanguage: "en",
        });
        expect(result).toEqual({
            success: false,
            reason: "survey_required",
            participationStatus: {
                status: "onboarding_required",
                nextStep: {
                    kind: "survey",
                    routeResolution: requiredSurvey.routeResolution,
                },
            },
        });
        expect(mocks.register).not.toHaveBeenCalled();
    });

    it("registers a guest only for an accepted write and can skip survey enforcement for an answer save", async () => {
        const result = await checkConversationParticipation({
            db,
            conversationSlugId: "example",
            didWrite: "did:test:1",
            userAgent: "Vitest",
            now: new Date(),
            currentDisplayLanguage: "en",
            requireCompletedSurvey: false,
        });
        expect(result).toEqual({
            success: true,
            conversationId: 42,
            conversationContentId: 7,
            conversationType: "polis",
            rankingMode: null,
            participantId: "guest-one",
            participationMode: "guest",
        });
        expect(mocks.survey).not.toHaveBeenCalled();
        expect(mocks.register).toHaveBeenCalledOnce();
    });

    it("ignores a legacy ticket requirement when saving an incomplete survey", async () => {
        mocks.metadata.mockResolvedValue({
            ...metadata,
            requiresEventTicket: "devconnect-2025",
        });
        const result = await checkConversationParticipation({
            db,
            conversationSlugId: "example",
            didWrite: "did:test:1",
            userAgent: "Vitest",
            now: new Date(),
            currentDisplayLanguage: "en",
            requireCompletedSurvey: false,
        });
        expect(result).toMatchObject({
            success: true,
            participantId: "guest-one",
        });
        expect(mocks.survey).not.toHaveBeenCalled();
        expect(mocks.register).toHaveBeenCalledOnce();
    });
});
