import type { PostgresTransaction } from "@/shared-backend/db.js";
import { readConversationTranslationPolicy } from "./conversationTranslationPolicy.js";
import type {
    ContentDisplayPreferences,
    ContentDisplayRequest,
} from "./displayContent.js";
import { isTranslationAllowedForTarget } from "./translationLanguageSetting.js";

/** Admission is rechecked after the caller's lifecycle lock, not trusted from an earlier request read. */
export async function resolveConversationTranslationDisplayPreferences({
    tx,
    conversationSlugId,
    request,
}: {
    tx: PostgresTransaction;
    conversationSlugId: string;
    request: ContentDisplayRequest;
}): Promise<ContentDisplayPreferences> {
    if (request.kind === "original")
        return {
            displayLanguage: "en",
            targetLanguage: "en",
            spokenLanguages: [],
            translationAllowed: false,
        };
    const preferences = {
        displayLanguage: request.displayLanguage,
        targetLanguage: request.displayLanguage,
        spokenLanguages: request.spokenLanguages,
    };
    const current = await readConversationTranslationPolicy({
        tx,
        conversationSlugId,
    });
    if (current === undefined)
        return { ...preferences, translationAllowed: false };
    return {
        ...preferences,
        translationAllowed: isTranslationAllowedForTarget({
            policy: current.policy,
            targetLanguageCode: request.displayLanguage,
        }),
    };
}
