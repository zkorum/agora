import { log } from "@/app.js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import { detectLanguage } from "@/shared-backend/translate.js";
import { detectLanguageWithFallback } from "./languageDetection.js";

export interface ContentLanguageMetadata {
    sourceLanguageCode: string | null;
    sourceLanguageConfidence: number | null;
}

export async function resolveContentLanguageMetadata({
    text,
    googleCloudCredentials,
}: {
    text: string;
    googleCloudCredentials: GoogleCloudCredentials | undefined;
}): Promise<ContentLanguageMetadata> {
    if (text.trim().length === 0) {
        return { sourceLanguageCode: null, sourceLanguageConfidence: null };
    }

    try {
        const googleDetector =
            googleCloudCredentials === undefined
                ? undefined
                : async ({ text: textToDetect }: { text: string }) =>
                      await detectLanguage({
                          client: googleCloudCredentials.client,
                          text: textToDetect,
                          projectId: googleCloudCredentials.config.projectId,
                          location: googleCloudCredentials.config.location,
                      });
        const detectionOutcome = await detectLanguageWithFallback({
            text,
            googleDetector,
        });
        return {
            sourceLanguageCode: detectionOutcome.result?.rawLanguageCode ?? null,
            sourceLanguageConfidence: detectionOutcome.result?.confidence ?? null,
        };
    } catch (error) {
        log.warn(error, "[ContentLanguageMetadata] Failed to detect content language");
        return { sourceLanguageCode: null, sourceLanguageConfidence: null };
    }
}
