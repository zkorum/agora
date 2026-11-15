import {
    createConversationEmailUpdateService as createCoreService,
    listAuthorizedConversations as listAuthorizedCoreConversations,
    type AuthoringRequest,
} from "../src/service/conversationEmailUpdate.js";
import {
    getConversationEmailUpdateActor,
    getOwnedEmailUpdateReviewId,
    getOwnedEmailUpdateTestId,
} from "../src/service/conversationEmailUpdateAuthorization.js";
import type {
    ConversationEmailUpdateCancelDraftRequest,
    ConversationEmailUpdateTestStatusRequest,
} from "../src/shared/types/dto.js";

// Exercise the production boundary: resolve actor permissions before entering core work.
export function createConversationEmailUpdateService(
    options: Parameters<typeof createCoreService>[0],
) {
    const core = createCoreService(options);
    function authorize<Request, Response>(
        method: (params: AuthoringRequest<Request>) => Promise<Response>,
    ) {
        return async (params: {
            userId: string;
            request: Request;
        }): Promise<Response> => {
            const actor = await getConversationEmailUpdateActor({
                db: options.db,
                userId: params.userId,
            });
            return await method({ ...params, ...actor });
        };
    }
    function authorizeReview<Request extends { updateId: string }, Response>(
        method: (
            params: AuthoringRequest<Request> & {
                ownedReviewId: number | undefined;
            },
        ) => Promise<Response>,
    ) {
        return async (params: {
            userId: string;
            request: Request;
        }): Promise<Response> => {
            const actor = await getConversationEmailUpdateActor({
                db: options.db,
                userId: params.userId,
            });
            const ownedReviewId = await getOwnedEmailUpdateReviewId({
                db: options.db,
                userId: params.userId,
                updateId: params.request.updateId,
            });
            return await method({ ...params, ...actor, ownedReviewId });
        };
    }
    return {
        ...core,
        prepareDraft: authorize(core.prepareDraft),
        previewHistory: authorize(core.previewHistory),
        compareDev: authorize(core.compareDev),
        getWorkspace: authorize(core.getWorkspace),
        listHistory: authorize(core.listHistory),
        getHistoryDetail: authorize(core.getHistoryDetail),
        estimateAudience: authorize(core.estimateAudience),
        sendTest: authorizeReview(core.sendTest),
        send: authorizeReview(core.send),
        cancelDraft: async ({
            userId,
            request,
        }: {
            userId: string;
            request: ConversationEmailUpdateCancelDraftRequest;
        }) =>
            await core.cancelDraft({
                ownedReviewId: await getOwnedEmailUpdateReviewId({
                    db: options.db,
                    userId,
                    updateId: request.updateId,
                }),
            }),
        getTestStatus: async ({
            userId,
            request,
        }: {
            userId: string;
            request: ConversationEmailUpdateTestStatusRequest;
        }) =>
            await core.getTestStatus({
                ownedTestId: await getOwnedEmailUpdateTestId({
                    db: options.db,
                    userId,
                    testAttemptId: request.testAttemptId,
                }),
            }),
        getConversationSummary: authorize(core.getConversationSummary),
        getProjectSummary: authorize(core.getProjectSummary),
    };
}

export type ConversationEmailUpdateService = ReturnType<
    typeof createConversationEmailUpdateService
>;

export async function listAuthorizedConversations(
    params: Omit<
        Parameters<typeof listAuthorizedCoreConversations>[0],
        "organizationIds"
    >,
) {
    const actor = await getConversationEmailUpdateActor({
        db: params.db,
        userId: params.userId,
    });
    return await listAuthorizedCoreConversations({ ...params, ...actor });
}
