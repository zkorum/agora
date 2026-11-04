import fastifySwagger from "@fastify/swagger";
import Fastify from "fastify";
import {
    jsonSchemaTransform,
    serializerCompiler,
    validatorCompiler,
    type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { Dto } from "../src/shared/types/dto.js";

describe("project contact contract", () => {
    it("enforces the same contact contract through Fastify and exposes it to Swagger", async () => {
        const server = Fastify({
            logger: false,
        }).withTypeProvider<ZodTypeProvider>();
        server.setValidatorCompiler(validatorCompiler);
        server.setSerializerCompiler(serializerCompiler);
        try {
            await server.register(fastifySwagger, {
                openapi: {
                    info: { title: "Contact contract test", version: "1.0.0" },
                },
                transform: jsonSchemaTransform,
            });
            server.post(
                "/contact",
                { schema: { body: Dto.createProjectContactRequest } },
                () => ({ success: true }),
            );
            const accepted = await server.inject({
                method: "POST",
                url: "/contact",
                payload: {
                    organizationSlug: "agrotoulouse",
                    email: "contact@example.com",
                },
            });
            expect(accepted.statusCode).toBe(200);
            for (const payload of [
                { email: "contact@example.com" },
                { organizationSlug: "agrotoulouse" },
                {
                    organizationSlug: "agrotoulouse",
                    email: "contact@example.com",
                    unexpected: true,
                },
            ]) {
                const rejected = await server.inject({
                    method: "POST",
                    url: "/contact",
                    payload,
                });
                expect(rejected.statusCode).toBe(400);
            }
            expect(server.swagger().paths?.["/contact"]?.post).toHaveProperty(
                "requestBody",
                expect.any(Object),
            );
        } finally {
            await server.close();
        }
    });

    it.each([
        { organizationSlug: "agrotoulouse", email: "contact@example.com" },
        {
            organizationSlug: "agrotoulouse",
            websiteUrl: "https://example.com/contact",
        },
        { firstName: "Alex", email: "alex@example.com" },
        { lastName: "Martin", email: "martin@example.com" },
    ])(
        "accepts an identified contact without requiring a first name: %j",
        (contact) => {
            expect(
                Dto.createProjectContactRequest.safeParse(contact).success,
            ).toBe(true);
        },
    );

    it.each([
        { email: "contact@example.com" },
        { roleLabel: "Support", websiteUrl: "https://example.com/contact" },
        { firstName: "   ", email: "contact@example.com" },
        { lastName: "\t\n", email: "contact@example.com" },
        { organizationSlug: "", email: "contact@example.com" },
        { organizationSlug: "agrotoulouse" },
        { organizationSlug: "agrotoulouse", email: "" },
        { organizationSlug: "agrotoulouse", websiteUrl: "http://example.com" },
        { organizationSlug: "agrotoulouse", websiteUrl: "javascript:alert(1)" },
        {
            organizationSlug: "agrotoulouse",
            websiteUrl: "https://user:password@example.com",
        },
        {
            organizationSlug: "agrotoulouse",
            email: "contact@example.com\r\nBcc: victim@example.com",
        },
        {
            organizationSlug: "agrotoulouse",
            email: "contact@example.com",
            unexpected: true,
        },
    ])(
        "rejects a contact without a valid identity or channel: %j",
        (contact) => {
            expect(
                Dto.createProjectContactRequest.safeParse(contact).success,
            ).toBe(false);
        },
    );

    it("includes both identity and contact-channel requirements in the API schema", () => {
        const schema = z.toJSONSchema(Dto.createProjectContactRequest, {
            io: "input",
        });
        expect(schema.allOf).toEqual([
            expect.objectContaining({
                anyOf: [
                    expect.objectContaining({ required: ["firstName"] }),
                    expect.objectContaining({ required: ["lastName"] }),
                    expect.objectContaining({ required: ["organizationSlug"] }),
                ],
            }),
            expect.objectContaining({
                anyOf: [
                    expect.objectContaining({ required: ["email"] }),
                    expect.objectContaining({ required: ["websiteUrl"] }),
                ],
            }),
        ]);
    });

    it("allows an organization-only public contact and rejects anonymous public contacts", () => {
        expect(
            Dto.projectPageContact.parse({
                affiliationName: "AgroToulouse",
                email: "contact@example.com",
            }),
        ).toEqual({
            affiliationName: "AgroToulouse",
            email: "contact@example.com",
        });
        expect(
            Dto.projectPageContact.safeParse({ email: "contact@example.com" })
                .success,
        ).toBe(false);
    });

    it("keeps existing contacts editable even when no usable contact channel remains", () => {
        const contact = { organizationSlug: "agrotoulouse" };
        expect(Dto.adminProjectContact.safeParse(contact).success).toBe(true);
        expect(Dto.createProjectContactRequest.safeParse(contact).success).toBe(
            false,
        );
    });

    it("normalizes contact input without changing stored values during reads", () => {
        const stored = {
            firstName: " Alex ",
            lastName: " Martin ",
            roleLabel: " Coordinator ",
            email: "Contact@EXAMPLE.com",
            imagePath: " logos/logo.png ",
            isFullImagePath: false,
        };
        expect(Dto.createProjectContactRequest.parse(stored)).toEqual({
            ...stored,
            firstName: "Alex",
            lastName: "Martin",
            roleLabel: "Coordinator",
            imagePath: "logos/logo.png",
        });
        expect(Dto.adminProjectContact.parse(stored)).toEqual(stored);
        const publicContact = {
            firstName: stored.firstName,
            lastName: stored.lastName,
            roleLabel: stored.roleLabel,
            email: stored.email,
            affiliationName: " AgroToulouse ",
        };
        expect(Dto.projectPageContact.parse(publicContact)).toEqual(
            publicContact,
        );
    });
});
