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
                    email: "contact@example.com",
                },
            });
            expect(accepted.statusCode).toBe(200);
            for (const payload of [
                { websiteUrl: "https://example.com/contact" },
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
        { email: "contact@example.com" },
        { organizationSlug: "agrotoulouse", email: "contact@example.com" },
        {
            organizationSlug: "agrotoulouse",
            email: "contact@example.com",
            websiteUrl: "https://example.com/contact",
        },
        { firstName: "Alex", email: "alex@example.com" },
        { lastName: "Martin", email: "martin@example.com" },
    ])(
        "accepts an email-only contact or a named or affiliated contact: %j",
        (contact) => {
            expect(
                Dto.createProjectContactRequest.safeParse(contact).success,
            ).toBe(true);
        },
    );

    it.each([
        {},
        { websiteUrl: "https://example.com/contact" },
        { roleLabel: "Support", websiteUrl: "https://example.com/contact" },
        { firstName: "   ", email: "contact@example.com" },
        { lastName: "\t\n", email: "contact@example.com" },
        { organizationSlug: "", email: "contact@example.com" },
        { organizationSlug: "agrotoulouse" },
        { organizationSlug: "agrotoulouse", websiteUrl: "https://example.com" },
        { organizationSlug: "agrotoulouse", email: "" },
        { email: "contact@example.com", websiteUrl: "http://example.com" },
        { email: "contact@example.com", websiteUrl: "javascript:alert(1)" },
        {
            email: "contact@example.com",
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

    it("marks only email required in the write schema", () => {
        const schema = z.toJSONSchema(Dto.createProjectContactRequest, {
            io: "input",
        });
        expect(schema.required).toEqual(["email"]);
        expect(schema.additionalProperties).toBe(false);
    });

    it("allows an absent contact but requires email on both project write requests", () => {
        const project = {
            projectSlug: "community-project",
            projectTitle: "Community project",
            ownerOrganizationSlugs: ["agrotoulouse"],
        };
        const legacyContact = {
            firstName: "Alex",
            websiteUrl: "https://example.com/contact",
        };
        const emailOnlyContact = { email: "contact@example.com" };

        for (const contact of [undefined, emailOnlyContact, legacyContact]) {
            const expected = contact !== legacyContact;
            expect(
                Dto.createProjectRequest.safeParse({ ...project, contact })
                    .success,
            ).toBe(expected);
            expect(
                Dto.updateProjectRequest.safeParse({
                    ...project,
                    currentProjectSlug: project.projectSlug,
                    contact,
                }).success,
            ).toBe(expected);
        }
    });

    it("allows email-only public and administrator contacts without inventing an organization", () => {
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
            Dto.projectPageContact.parse({ email: "contact@example.com" }),
        ).toEqual({ email: "contact@example.com" });
        expect(
            Dto.adminProjectContact.parse({ email: "contact@example.com" }),
        ).toEqual({ email: "contact@example.com", isFullImagePath: false });
        expect(Dto.projectPageContact.safeParse({}).success).toBe(false);
    });

    it("keeps existing contacts editable even when no usable contact channel remains", () => {
        const contact = {
            organizationSlug: "agrotoulouse",
            websiteUrl: "https://example.com/contact",
        };
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
