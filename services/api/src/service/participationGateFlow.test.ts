import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeviceLoginStatusExtended } from "@/shared/types/zod.js";

const {
    getPostMetadataFromSlugIdMock,
    isConversationIdLockedMock,
    getDeviceStatusMock,
    hasStrongVerificationMock,
    hasEmailVerificationMock,
    getOrRegisterUserIdFromDeviceStatusMock,
    hasEventTicketMock,
    getSurveyGateSummaryMock,
} = vi.hoisted(() => ({
    getPostMetadataFromSlugIdMock: vi.fn(),
    isConversationIdLockedMock: vi.fn(),
    getDeviceStatusMock: vi.fn(),
    hasStrongVerificationMock: vi.fn(),
    hasEmailVerificationMock: vi.fn(),
    getOrRegisterUserIdFromDeviceStatusMock: vi.fn(),
    hasEventTicketMock: vi.fn<
        (args: {
            db: unknown;
            userId: string;
            eventSlug: "devconnect-2025";
        }) => Promise<boolean>
    >(),
    getSurveyGateSummaryMock: vi.fn(),
}));

vi.mock("./common.js", () => ({
    useCommonPost: () => ({
        getPostMetadataFromSlugId: getPostMetadataFromSlugIdMock,
        isConversationIdLocked: isConversationIdLockedMock,
    }),
}));

vi.mock("./authUtil.js", () => ({
    getDeviceStatus: getDeviceStatusMock,
    hasStrongVerification: hasStrongVerificationMock,
    hasEmailVerification: hasEmailVerificationMock,
    getOrRegisterUserIdFromDeviceStatus: getOrRegisterUserIdFromDeviceStatusMock,
}));

vi.mock("./zupass.js", () => ({
    hasEventTicket: hasEventTicketMock,
}));

vi.mock("./survey.js", () => ({
    getSurveyGateSummary: getSurveyGateSummaryMock,
}));

import { checkConversationParticipation } from "./participationGate.js";

function createUnknownDeviceStatus(): Extract<
    DeviceLoginStatusExtended,
    { isKnown: false }
> {
    return {
        isKnown: false,
        isRegistered: false,
        isLoggedIn: false,
        credentials: {
            email: null,
            phone: null,
            rarimo: null,
        },
    };
}

function createKnownDeviceStatus({
    isRegistered,
    isLoggedIn,
}: {
    isRegistered: boolean;
    isLoggedIn: boolean;
}): Extract<DeviceLoginStatusExtended, { isKnown: true }> {
    return {
        isKnown: true,
        isRegistered,
        isLoggedIn,
        userId: "user-1",
        credentials: {
            email: null,
            phone: null,
            rarimo: null,
        },
    };
}

function createDatabaseStub(): Parameters<typeof checkConversationParticipation>[0]["db"] {
    return {} as Parameters<typeof checkConversationParticipation>[0]["db"];
}

function createParams(
    overrides: Partial<Parameters<typeof checkConversationParticipation>[0]> = {},
): Parameters<typeof checkConversationParticipation>[0] {
    return {
        db: createDatabaseStub(),
        conversationSlugId: "conv-1",
        didWrite: "did:test:1",
        userAgent: "Vitest",
        now: new Date("2026-01-01T00:00:00.000Z"),
        ...overrides,
    };
}

describe("checkConversationParticipation", () => {
    beforeEach(() => {
        getPostMetadataFromSlugIdMock.mockReset();
        isConversationIdLockedMock.mockReset();
        getDeviceStatusMock.mockReset();
        hasStrongVerificationMock.mockReset();
        hasEmailVerificationMock.mockReset();
        getOrRegisterUserIdFromDeviceStatusMock.mockReset();
        hasEventTicketMock.mockReset();
        getSurveyGateSummaryMock.mockReset();

        getPostMetadataFromSlugIdMock.mockResolvedValue({
            id: 42,
            contentId: 7,
            authorId: "author-1",
            conversationType: "polis",
            participantCount: 0,
            opinionCount: 0,
            voteCount: 0,
            totalParticipantCount: 0,
            totalOpinionCount: 0,
            totalVoteCount: 0,
            moderatedOpinionCount: 0,
            hiddenOpinionCount: 0,
            isIndexed: true,
            participationMode: "guest",
            isClosed: false,
            requiresEventTicket: null,
        });
        isConversationIdLockedMock.mockResolvedValue(false);
        getDeviceStatusMock.mockResolvedValue(createUnknownDeviceStatus());
        hasStrongVerificationMock.mockResolvedValue(false);
        hasEmailVerificationMock.mockResolvedValue(false);
        getOrRegisterUserIdFromDeviceStatusMock.mockResolvedValue("guest-user-1");
        hasEventTicketMock.mockResolvedValue(true);
        getSurveyGateSummaryMock.mockResolvedValue({
            hasSurvey: true,
            canParticipate: false,
            status: "not_started",
        });
    });

    it("skips the survey completion query when requireCompletedSurvey is false", async () => {
        const result = await checkConversationParticipation(
            createParams({ requireCompletedSurvey: false }),
        );

        expect(result).toEqual({
            success: true,
            conversationId: 42,
            conversationContentId: 7,
            conversationType: "polis",
            participantId: "guest-user-1",
            participationMode: "guest",
            requiresEventTicket: null,
        });
        expect(getSurveyGateSummaryMock).not.toHaveBeenCalled();
        expect(getOrRegisterUserIdFromDeviceStatusMock).toHaveBeenCalledOnce();
    });

    it("still blocks account-required conversations before guest registration", async () => {
        getPostMetadataFromSlugIdMock.mockResolvedValue({
            id: 42,
            contentId: 7,
            authorId: "author-1",
            conversationType: "polis",
            participantCount: 0,
            opinionCount: 0,
            voteCount: 0,
            totalParticipantCount: 0,
            totalOpinionCount: 0,
            totalVoteCount: 0,
            moderatedOpinionCount: 0,
            hiddenOpinionCount: 0,
            isIndexed: true,
            participationMode: "account_required",
            isClosed: false,
            requiresEventTicket: null,
        });

        const result = await checkConversationParticipation(
            createParams({ requireCompletedSurvey: false }),
        );

        expect(result).toEqual({ success: false, reason: "account_required" });
        expect(getOrRegisterUserIdFromDeviceStatusMock).not.toHaveBeenCalled();
        expect(getSurveyGateSummaryMock).not.toHaveBeenCalled();
    });

    it("enforces event tickets even when survey completion is skipped", async () => {
        getDeviceStatusMock.mockResolvedValue(
            createKnownDeviceStatus({ isRegistered: false, isLoggedIn: false }),
        );
        getPostMetadataFromSlugIdMock.mockResolvedValue({
            id: 42,
            contentId: 7,
            authorId: "author-1",
            conversationType: "polis",
            participantCount: 0,
            opinionCount: 0,
            voteCount: 0,
            totalParticipantCount: 0,
            totalOpinionCount: 0,
            totalVoteCount: 0,
            moderatedOpinionCount: 0,
            hiddenOpinionCount: 0,
            isIndexed: true,
            participationMode: "guest",
            isClosed: false,
            requiresEventTicket: "devconnect-2025",
        });
        hasEventTicketMock.mockResolvedValue(false);

        const result = await checkConversationParticipation(
            createParams({ requireCompletedSurvey: false }),
        );

        expect(result).toEqual({
            success: false,
            reason: "event_ticket_required",
        });
        const hasEventTicketCall = hasEventTicketMock.mock.calls.at(0);
        if (hasEventTicketCall === undefined) {
            throw new Error("Expected hasEventTicket to be called");
        }
        expect(hasEventTicketCall[0].userId).toBe("user-1");
        expect(hasEventTicketCall[0].eventSlug).toBe("devconnect-2025");
        expect(getSurveyGateSummaryMock).not.toHaveBeenCalled();
    });
});
