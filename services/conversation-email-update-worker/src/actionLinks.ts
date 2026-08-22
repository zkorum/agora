export interface ConversationEmailActionUrls {
    visibleUnsubscribeUrl: string;
    oneClickUnsubscribeUrl: string;
    manageUrl: string;
    reportUrl: string;
}

export function buildConversationEmailActionUrls({
    siteBaseUrl,
    unsubscribeToken,
    manageToken,
    reportToken,
}: {
    siteBaseUrl: string;
    unsubscribeToken: string;
    manageToken: string;
    reportToken: string;
}): ConversationEmailActionUrls {
    const baseUrl = new URL(siteBaseUrl);
    return {
        visibleUnsubscribeUrl: new URL(
            `/email-updates/unsubscribe/${unsubscribeToken}`,
            baseUrl,
        ).toString(),
        oneClickUnsubscribeUrl: new URL(
            `/api/v1/conversation/email-update/action/one-click/${unsubscribeToken}`,
            baseUrl,
        ).toString(),
        manageUrl: new URL(
            `/email-updates/preferences/${manageToken}`,
            baseUrl,
        ).toString(),
        reportUrl: new URL(
            `/email-updates/report/${reportToken}`,
            baseUrl,
        ).toString(),
    };
}
