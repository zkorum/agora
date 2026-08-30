import {
    SESv2Client,
    SendEmailCommand,
    type SendEmailCommandOutput,
} from "@aws-sdk/client-sesv2";
import { z } from "zod";
import { removeNonDisplayControlCharacters } from "@/shared/shared.js";

const FIXED_SENDER_NAME = "Agora";

const providerErrorSchema = z
    .object({
        name: z.string(),
        message: z.string().optional(),
        $metadata: z
            .object({
                httpStatusCode: z.number().int().optional(),
            })
            .optional(),
    })
    .loose();

const explicitRetryableErrors = new Set([
    "ThrottlingException",
    "TooManyRequestsException",
]);
const explicitPermanentErrors = new Set([
    "AccountSuspendedException",
    "BadRequestException",
    "LimitExceededException",
    "MailFromDomainNotVerifiedException",
    "MessageRejected",
    "NotFoundException",
    "SendingPausedException",
]);

export type ProviderFailure =
    | {
          kind: "retryable_rejected";
          code: string;
          details: string;
      }
    | {
          kind: "permanent_rejected";
          code: string;
          details: string;
      }
    | {
          kind: "unknown";
          code: string;
          details: string;
      };

export type ProviderResult =
    { kind: "provider_accepted"; messageId: string } | ProviderFailure;

export interface ConversationEmailProvider {
    close?: () => Promise<void> | void;
    send: (
        message: ConversationEmailProviderMessage,
    ) => Promise<ProviderResult>;
}

export interface ConversationEmailProviderMessage {
    to: string;
    subject: string;
    html: string;
    text: string;
    replyToName: string;
    replyToEmail: string;
    tags: Readonly<Record<string, string>>;
    unsubscribeUrl: string | undefined;
}

interface CreateConversationEmailProviderParams {
    region: string;
    fromAddress: string;
    configurationSetName: string;
    requestTimeoutMs: number;
    sendCommand?: (params: {
        command: SendEmailCommand;
        abortSignal: AbortSignal;
    }) => Promise<SendEmailCommandOutput>;
}

function toHeaderAddress({
    name,
    email,
}: {
    name: string;
    email: string;
}): string {
    const safeName = removeNonDisplayControlCharacters(name)
        .replaceAll(/[\r\n]/g, " ")
        .trim();
    if (safeName.length === 0) return email;
    if (/^[\x20-\x7e]+$/u.test(safeName)) {
        const escapedName = safeName.replaceAll(/([\\"])/g, "\\$1");
        return `"${escapedName}" <${email}>`;
    }

    const chunks: string[] = [];
    let chunk = "";
    for (const character of safeName) {
        if (
            chunk.length > 0 &&
            Buffer.byteLength(chunk + character, "utf8") > 45
        ) {
            chunks.push(chunk);
            chunk = character;
        } else {
            chunk += character;
        }
    }
    chunks.push(chunk);
    const encodedName = chunks
        .map(
            (value) =>
                `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`,
        )
        .join(" ");
    return `${encodedName} <${email}>`;
}

function isSafeProviderSubject(subject: string): boolean {
    return (
        removeNonDisplayControlCharacters(subject) === subject &&
        !/[\t\n\r\u2028\u2029]/u.test(subject)
    );
}

function toErrorDetails(error: unknown): { code: string; details: string } {
    const parsed = providerErrorSchema.safeParse(error);
    if (!parsed.success) {
        return { code: "UnknownProviderError", details: "Unknown SES outcome" };
    }
    return {
        code: parsed.data.name,
        details: parsed.data.message ?? parsed.data.name,
    };
}

export function classifyProviderError(error: unknown): ProviderFailure {
    const parsed = providerErrorSchema.safeParse(error);
    const { code, details } = toErrorDetails(error);
    if (!parsed.success) return { kind: "unknown", code, details };

    if (explicitRetryableErrors.has(parsed.data.name)) {
        return { kind: "retryable_rejected", code, details };
    }
    if (explicitPermanentErrors.has(parsed.data.name)) {
        return { kind: "permanent_rejected", code, details };
    }

    // A timeout, transport failure, or SES 5xx can occur after SES accepted the
    // request. Retrying those outcomes would knowingly risk duplicate mail.
    return { kind: "unknown", code, details };
}

export function createConversationEmailProvider({
    region,
    fromAddress,
    configurationSetName,
    requestTimeoutMs,
    sendCommand,
}: CreateConversationEmailProviderParams): ConversationEmailProvider {
    const client = new SESv2Client({ region, maxAttempts: 1 });
    const execute =
        sendCommand ??
        (async ({
            command,
            abortSignal,
        }: {
            command: SendEmailCommand;
            abortSignal: AbortSignal;
        }) => await client.send(command, { abortSignal }));

    return {
        close: () => {
            client.destroy();
        },
        send: async (message) => {
            if (!isSafeProviderSubject(message.subject)) {
                return {
                    kind: "permanent_rejected",
                    code: "InvalidSubject",
                    details: "Email subject contains unsafe control characters",
                };
            }
            const headers =
                message.unsubscribeUrl === undefined
                    ? []
                    : [
                          {
                              Name: "List-Unsubscribe",
                              Value: `<${message.unsubscribeUrl}>`,
                          },
                          {
                              Name: "List-Unsubscribe-Post",
                              Value: "List-Unsubscribe=One-Click",
                          },
                      ];
            const command = new SendEmailCommand({
                FromEmailAddress: toHeaderAddress({
                    name: FIXED_SENDER_NAME,
                    email: fromAddress,
                }),
                Destination: { ToAddresses: [message.to] },
                ReplyToAddresses: [
                    toHeaderAddress({
                        name: message.replyToName,
                        email: message.replyToEmail,
                    }),
                ],
                ConfigurationSetName: configurationSetName,
                EmailTags: Object.entries(message.tags).map(
                    ([Name, Value]) => ({
                        Name,
                        Value,
                    }),
                ),
                Content: {
                    Simple: {
                        Subject: { Data: message.subject, Charset: "UTF-8" },
                        Body: {
                            Html: { Data: message.html, Charset: "UTF-8" },
                            Text: { Data: message.text, Charset: "UTF-8" },
                        },
                        Headers: headers,
                    },
                },
            });

            try {
                const response = await execute({
                    command,
                    abortSignal: AbortSignal.timeout(requestTimeoutMs),
                });
                if (response.MessageId === undefined) {
                    return {
                        kind: "unknown",
                        code: "MissingMessageId",
                        details: "SES returned success without a message ID",
                    };
                }
                return {
                    kind: "provider_accepted",
                    messageId: response.MessageId,
                };
            } catch (error: unknown) {
                return classifyProviderError(error);
            }
        },
    };
}
