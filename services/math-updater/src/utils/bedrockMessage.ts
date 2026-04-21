import type { Message } from "@aws-sdk/client-bedrock-runtime";

export function extractTextContentFromMessage(
    message: Message | undefined,
): string | undefined {
    if (message?.content === undefined) {
        return undefined;
    }
    const textContent = message.content.flatMap((contentBlock) =>
        "text" in contentBlock ? [contentBlock.text] : [],
    );
    const concatenatedTextContent = textContent.join("");
    return concatenatedTextContent.trim().length > 0
        ? concatenatedTextContent
        : undefined;
}
