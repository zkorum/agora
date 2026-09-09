import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { Dto } from "@/shared/types/dto.js";

const draft = {
    selection: {
        kind: "project",
        projectSlug: "river",
        conversationSlugIds: ["convo001"],
    },
    subject: "Our next steps",
    bodyHtml: "<p>Thank you.</p>",
};
const request = {
    ...draft,
    language: "en",
};

describe.each([
    {
        name: "dev fixture",
        schema: Dto.conversationEmailUpdateDevPreviewRequest,
        request: { fixture: "project", variant: "test" },
    },
    {
        name: "history",
        schema: Dto.conversationEmailUpdatePreviewRequest,
        request: { updateId: randomUUID() },
    },
])("$name preview language contract", ({ schema, request }) => {
    it("still requires an explicit rendering language", () => {
        expect(schema.safeParse(request).success).toBe(false);
        expect(schema.parse({ ...request, language: "fr" }).language).toBe("fr");
    });
});

describe.each([
    {
        name: "canonical",
        schema: Dto.conversationEmailUpdatePrepareDraftRequest,
    },
    {
        name: "OpenAPI transport",
        schema: Dto.conversationEmailUpdatePrepareDraftOpenApiRequest,
    },
])("production prepare $name contract", ({ schema }) => {
    it("accepts authored content without a language and rejects a client language override", () => {
        expect(schema.parse(draft)).toEqual(draft);
        expect(schema.safeParse(request).success).toBe(false);
    });
});

describe.each([
    {
        name: "canonical",
        schema: Dto.conversationEmailUpdateDevComparisonRequest,
    },
    {
        name: "OpenAPI transport",
        schema: Dto.conversationEmailUpdateDevComparisonOpenApiRequest,
    },
])("dev comparison $name contract", ({ schema }) => {
    it("still requires an explicit preview language", () => {
        expect(schema.safeParse(draft).success).toBe(false);
        expect(schema.parse({ ...draft, language: "ar" }).language).toBe("ar");
    });

    it("parses draft content with an optional manual participant simulation", () => {
        expect(schema.parse(request)).toEqual(request);
        const simulated = {
            ...request,
            participantConversationSlugIds: ["convo001"],
        };
        expect(schema.parse(simulated)).toEqual(simulated);
        expect(
            schema.parse({ ...request, subject: "  Valid subject  " }).subject,
        ).toBe("Valid subject");
    });

    it.each([
        "\nHello",
        "Hello\r",
        "\tHello",
        "Hello\u2028",
        "Hello\u0000",
        " ",
        "x".repeat(141),
    ])("rejects raw invalid subjects %j", (subject) => {
        expect(schema.safeParse({ ...request, subject }).success).toBe(false);
    });

    it.each([
        { participantConversationSlugIds: [] },
        { participantConversationSlugIds: ["convo001", "convo001"] },
        {
            participantConversationSlugIds: Array.from(
                { length: 1001 },
                (_, index) => `c${index.toString().padStart(7, "0")}`,
            ),
        },
    ])(
        "rejects empty, duplicate or oversized simulations %#",
        ({ participantConversationSlugIds }) => {
            expect(
                schema.safeParse({ ...request, participantConversationSlugIds })
                    .success,
            ).toBe(false);
        },
    );

    it.each([
        "recipientId",
        "recipientUserId",
        "recipientEmail",
        "email",
        "userId",
        "branding",
        "replyToEmail",
        "unsubscribeScope",
    ])("rejects arbitrary %s fields", (field) => {
        expect(
            schema.safeParse({ ...request, [field]: "private@example.com" })
                .success,
        ).toBe(false);
        expect(
            schema.safeParse({
                ...request,
                selection: {
                    ...request.selection,
                    [field]: "private@example.com",
                },
            }).success,
        ).toBe(false);
    });

    it("rejects empty and duplicate project selections", () => {
        for (const conversationSlugIds of [[], ["convo001", "convo001"]]) {
            expect(
                schema.safeParse({
                    ...request,
                    selection: { ...request.selection, conversationSlugIds },
                }).success,
            ).toBe(false);
        }
    });
});
