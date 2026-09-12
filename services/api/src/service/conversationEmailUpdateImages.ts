import type { EmailBranding } from "@/shared/branding/emailBranding.js";
import { imagePathToUrl } from "@/utils/organizationLogic.js";

function parseImageUrl(value: string | undefined): URL | undefined {
    if (value === undefined) return undefined;
    const url = URL.parse(value);
    return url !== null &&
        (url.protocol === "https:" || url.protocol === "http:") &&
        url.username === "" &&
        url.password === ""
        ? url
        : undefined;
}

export function resolveConversationEmailImage({
    imagePath,
    isFullImagePath,
    baseImageServiceUrl,
}: {
    imagePath: string | null;
    isFullImagePath: boolean;
    baseImageServiceUrl: string;
}): string | undefined {
    // Stored branding supports public absolute URLs (including S3), as well as
    // paths served by the image service, just like the project page.
    return parseImageUrl(
        imagePathToUrl({ imagePath, isFullImagePath, baseImageServiceUrl }),
    )?.href;
}

export function conversationEmailImageOrigins(
    branding: EmailBranding,
): string[] {
    // Only server-resolved branding can expand the preview's image policy;
    // facilitator-authored message HTML cannot add image origins.
    const images = [
        branding.imageUrl,
        branding.bannerImageUrl,
        ...(branding.attributions?.map((entry) => entry.imageUrl) ?? []),
    ];
    return [
        ...new Set(
            images.flatMap((value) => {
                const url = parseImageUrl(value);
                return url === undefined ? [] : [url.origin];
            }),
        ),
    ];
}
