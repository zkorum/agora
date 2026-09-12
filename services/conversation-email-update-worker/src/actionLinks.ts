import { createHash, randomBytes } from "node:crypto";
import type { ConversationEmailActionLinks } from "@/generated/email/render.js";
import type { conversationEmailUpdateActionTokenTable } from "@/shared-backend/schema.js";

type Action =
    typeof conversationEmailUpdateActionTokenTable.$inferInsert.action;

const actionDefinitions = {
    unsubscribe_conversation: { path: "unsubscribe", expiresInDays: 365 },
    unsubscribe_project: { path: "unsubscribe", expiresInDays: 365 },
    manage_preferences: { path: "preferences", expiresInDays: 90 },
    report: { path: "report", expiresInDays: 90 },
} satisfies Record<Action, { path: string; expiresInDays: number }>;

interface ActionToken<Purpose extends Action = Action> {
    action: Purpose;
    tokenHash: string;
    expiresInDays: number;
}

export type RecipientActionDetails =
    | {
          kind: "participant";
          actions: ConversationEmailActionLinks;
          actionTokens: readonly ActionToken[];
          unsubscribeUrl: string;
      }
    | {
          kind: "conversation_owner_copy";
          actions: Pick<ConversationEmailActionLinks, "reportUrl">;
          actionTokens: readonly ActionToken<"report">[];
          unsubscribeUrl: undefined;
      };

function createActionLink<Purpose extends Action>({
    action,
    baseUrl,
}: {
    action: Purpose;
    baseUrl: URL;
}): { rawToken: string; url: string; token: ActionToken<Purpose> } {
    const rawToken = randomBytes(32).toString("base64url");
    const definition = actionDefinitions[action];
    return {
        rawToken,
        url: new URL(
            `/email-updates/${definition.path}/${rawToken}`,
            baseUrl,
        ).toString(),
        token: {
            action,
            tokenHash: createHash("sha256").update(rawToken).digest("hex"),
            expiresInDays: definition.expiresInDays,
        },
    };
}

export function createRecipientActions({
    siteBaseUrl,
    kind,
    participantPreferenceScope,
}: {
    siteBaseUrl: string;
    kind: RecipientActionDetails["kind"];
    participantPreferenceScope: "project" | "conversation";
}): RecipientActionDetails {
    const baseUrl = new URL(siteBaseUrl);
    const report = createActionLink({ action: "report", baseUrl });
    if (kind === "conversation_owner_copy") {
        return {
            kind,
            actions: { reportUrl: report.url },
            actionTokens: [report.token],
            unsubscribeUrl: undefined,
        };
    }

    const conversation = createActionLink({
        action: "unsubscribe_conversation",
        baseUrl,
    });
    const project =
        participantPreferenceScope === "project"
            ? createActionLink({ action: "unsubscribe_project", baseUrl })
            : undefined;
    const manage = createActionLink({ action: "manage_preferences", baseUrl });
    // Mail clients have one unsubscribe action; keep its established delivery scope.
    const oneClick = project ?? conversation;
    return {
        kind,
        actions: {
            conversationUnsubscribeUrl: conversation.url,
            projectUnsubscribeUrl: project?.url,
            manageUrl: manage.url,
            reportUrl: report.url,
        },
        actionTokens: [
            report.token,
            conversation.token,
            manage.token,
            ...(project === undefined ? [] : [project.token]),
        ],
        unsubscribeUrl: new URL(
            `/api/v1/conversation/email-update/action/one-click/${oneClick.rawToken}`,
            baseUrl,
        ).toString(),
    };
}
