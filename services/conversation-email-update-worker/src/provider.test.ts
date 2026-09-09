import { describe, expect, it, vi } from "vitest";
import {
    SendEmailCommand,
    TooManyRequestsException,
} from "@aws-sdk/client-sesv2";
import {
    classifyProviderError,
    createConversationEmailProvider,
} from "./provider.js";

describe("conversation email SES provider", () => {
    it("classifies only explicit nonacceptance as retryable", () => {
        const throttled = new TooManyRequestsException({
            message: "rate exceeded",
            $metadata: { httpStatusCode: 429 },
        });
        expect(classifyProviderError(throttled).kind).toBe(
            "retryable_rejected",
        );
        expect(
            classifyProviderError({
                name: "InternalServiceErrorException",
                message: "server failed",
                $metadata: { httpStatusCode: 500 },
            }).kind,
        ).toBe("unknown");
        expect(
            classifyProviderError({ name: "AbortError", message: "timed out" })
                .kind,
        ).toBe("unknown");
        expect(
            classifyProviderError({
                name: "MessageRejected",
                message: "invalid content",
            }).kind,
        ).toBe("permanent_rejected");
    });

    it("sends direct SESv2 content with update headers and returns MessageId", async () => {
        const sendCommand = vi.fn(
            (params: {
                command: SendEmailCommand;
                abortSignal: AbortSignal;
            }) => {
                expect(params.command).toBeInstanceOf(SendEmailCommand);
                return Promise.resolve({
                    MessageId: "ses-message-id",
                    $metadata: {},
                });
            },
        );
        const provider = createConversationEmailProvider({
            region: "eu-west-1",
            fromAddress: "conversation@updates.agoracitizen.network",
            configurationSetName: "conversation-updates",
            requestTimeoutMs: 1_000,
            sendCommand,
        });
        const result = await provider.send({
            to: "participant@example.com",
            senderName: "Harbor & Streets",
            subject: "Update",
            html: "<p>Body</p>",
            text: "Body",
            replyToName: "Project contact",
            replyToEmail: "contact@example.com",
            tags: { message_type: "conversation_update" },
            unsubscribeUrl: "https://www.agoracitizen.app/unsubscribe/token",
        });
        expect(result).toEqual({
            kind: "provider_accepted",
            messageId: "ses-message-id",
        });
        const command = sendCommand.mock.calls[0][0].command;
        expect(command.input.ConfigurationSetName).toBe("conversation-updates");
        expect(command.input.FromEmailAddress).toBe(
            '"Harbor & Streets" <conversation@updates.agoracitizen.network>',
        );
        expect(command.input.Destination).toEqual({
            ToAddresses: ["participant@example.com"],
        });
        expect(command.input.ReplyToAddresses).toEqual([
            '"Project contact" <contact@example.com>',
        ]);
        expect(command.input.Content?.Simple?.Subject).toEqual({
            Data: "Update",
            Charset: "UTF-8",
        });
        expect(command.input.Content?.Simple?.Body).toEqual({
            Html: { Data: "<p>Body</p>", Charset: "UTF-8" },
            Text: { Data: "Body", Charset: "UTF-8" },
        });
        expect(command.input.EmailTags).toEqual([
            { Name: "message_type", Value: "conversation_update" },
        ]);
        expect(command.input.Content?.Simple?.Headers).toEqual([
            {
                Name: "List-Unsubscribe",
                Value: "<https://www.agoracitizen.app/unsubscribe/token>",
            },
            {
                Name: "List-Unsubscribe-Post",
                Value: "List-Unsubscribe=One-Click",
            },
        ]);
    });

    it("omits unsubscribe headers for operational owner copies", async () => {
        let headers: { Name?: string; Value?: string }[] | undefined;
        const sendCommand = vi.fn(
            (params: {
                command: SendEmailCommand;
                abortSignal: AbortSignal;
            }) => {
                headers = params.command.input.Content?.Simple?.Headers;
                return Promise.resolve({
                    MessageId: "owner-message-id",
                    $metadata: {},
                });
            },
        );
        const provider = createConversationEmailProvider({
            region: "eu-west-1",
            fromAddress: "conversation@updates.agoracitizen.network",
            configurationSetName: "conversation-updates",
            requestTimeoutMs: 1_000,
            sendCommand,
        });

        await provider.send({
            to: "owner@example.com",
            senderName: "Harbor & Streets",
            subject: "[Admin Copy] Operational owner update",
            html: '<a href="https://www.agoracitizen.app/email-updates/report/token">Report this email</a>',
            text: "Report this email: https://www.agoracitizen.app/email-updates/report/token",
            replyToName: "Project contact",
            replyToEmail: "contact@example.com",
            tags: { message_type: "conversation_update" },
            unsubscribeUrl: undefined,
        });

        expect(headers).toEqual([]);
    });

    it.each([
        {
            name: 'Project \\ "contact"',
            expected: '"Project \\\\ \\"contact\\"" <contact@example.com>',
        },
        {
            name: "Équipe citoyenne",
            expected:
                "=?UTF-8?B?w4lxdWlwZSBjaXRveWVubmU=?= <contact@example.com>",
        },
    ])("formats the Reply-To mailbox for $name", async ({ name, expected }) => {
        let replyToAddresses: string[] | undefined;
        const sendCommand = vi.fn(
            (params: {
                command: SendEmailCommand;
                abortSignal: AbortSignal;
            }) => {
                replyToAddresses = params.command.input.ReplyToAddresses;
                return Promise.resolve({
                    MessageId: "ses-message-id",
                    $metadata: {},
                });
            },
        );
        const provider = createConversationEmailProvider({
            region: "eu-west-1",
            fromAddress: "conversation@updates.agoracitizen.network",
            configurationSetName: "conversation-updates",
            requestTimeoutMs: 1_000,
            sendCommand,
        });

        await provider.send({
            to: "participant@example.com",
            senderName: "Harbor & Streets",
            subject: "Update",
            html: "<p>Body</p>",
            text: "Body",
            replyToName: name,
            replyToEmail: "contact@example.com",
            tags: {},
            unsubscribeUrl: undefined,
        });

        expect(replyToAddresses).toEqual([expected]);
    });

    it.each([
        {
            name: 'Project \\ "team" <other@example.com>',
            expected: '"Project \\\\ \\"team\\" <other@example.com>"',
        },
        {
            name: "Project\r\nBcc: attacker@example.com\u0000\u202e",
            expected: '"Project  Bcc: attacker@example.com"',
        },
        {
            name: "Équipe citoyenne",
            expected: "=?UTF-8?B?w4lxdWlwZSBjaXRveWVubmU=?=",
        },
        {
            name: "\r\n\u0000",
            expected: undefined,
        },
    ])(
        "safely encodes the From display name: $name",
        async ({ name, expected }) => {
            let from: string | undefined;
            const provider = createConversationEmailProvider({
                region: "eu-west-1",
                fromAddress: "conversation@updates.agoracitizen.network",
                configurationSetName: "conversation-updates",
                requestTimeoutMs: 1_000,
                sendCommand: ({ command }) => {
                    from = command.input.FromEmailAddress;
                    return Promise.resolve({
                        MessageId: "sender-test",
                        $metadata: {},
                    });
                },
            });

            await provider.send({
                to: "participant@example.com",
                senderName: name,
                subject: "Update",
                html: "<p>Body</p>",
                text: "Body",
                replyToName: "Project contact",
                replyToEmail: "contact@example.com",
                tags: {},
                unsubscribeUrl: undefined,
            });

            expect(from).toBe(
                expected === undefined
                    ? "conversation@updates.agoracitizen.network"
                    : `${expected} <conversation@updates.agoracitizen.network>`,
            );
            expect(from).not.toMatch(/[\r\n\u202e]/u);
            expect(from).not.toContain("\u0000");
        },
    );

    it("encodes long Unicode sender names without splitting UTF-8 characters", async () => {
        const senderName = "Équipe citoyenne 日本語 ".repeat(8);
        let from = "";
        const provider = createConversationEmailProvider({
            region: "eu-west-1",
            fromAddress: "conversation@updates.agoracitizen.network",
            configurationSetName: "conversation-updates",
            requestTimeoutMs: 1_000,
            sendCommand: ({ command }) => {
                from = command.input.FromEmailAddress ?? "";
                return Promise.resolve({
                    MessageId: "unicode-sender-test",
                    $metadata: {},
                });
            },
        });

        await provider.send({
            to: "participant@example.com",
            senderName,
            subject: "Update",
            html: "<p>Body</p>",
            text: "Body",
            replyToName: "Project contact",
            replyToEmail: "contact@example.com",
            tags: {},
            unsubscribeUrl: undefined,
        });

        const encodedWords = Array.from(
            from.matchAll(/=\?UTF-8\?B\?([A-Za-z0-9+/=]+)\?=/g),
        );
        expect(encodedWords.length).toBeGreaterThan(1);
        const decodedWords = encodedWords.map((match) => {
            expect(match[0].length).toBeLessThanOrEqual(75);
            return Buffer.from(match[1], "base64").toString("utf8");
        });
        expect(decodedWords.join("")).toBe(senderName.trim());
        expect(
            from.endsWith(" <conversation@updates.agoracitizen.network>"),
        ).toBe(true);
    });

    it("rejects unsafe subjects before calling SES", async () => {
        const sendCommand = vi.fn(() =>
            Promise.resolve({ MessageId: "unexpected", $metadata: {} }),
        );
        const provider = createConversationEmailProvider({
            region: "eu-west-1",
            fromAddress: "conversation@updates.agoracitizen.network",
            configurationSetName: "conversation-updates",
            requestTimeoutMs: 1_000,
            sendCommand,
        });

        await expect(
            provider.send({
                to: "participant@example.com",
                senderName: "Harbor & Streets",
                subject: "Update\r\nBcc: attacker@example.com",
                html: "<p>Body</p>",
                text: "Body",
                replyToName: "Project contact",
                replyToEmail: "contact@example.com",
                tags: { message_type: "conversation_update" },
                unsubscribeUrl: undefined,
            }),
        ).resolves.toEqual({
            kind: "permanent_rejected",
            code: "InvalidSubject",
            details: "Email subject contains unsafe control characters",
        });
        expect(sendCommand).not.toHaveBeenCalled();
    });
});
