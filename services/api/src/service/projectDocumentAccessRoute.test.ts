import fastifyRateLimit from "@fastify/rate-limit";
import fastifySensible from "@fastify/sensible";
import Fastify, { type FastifyInstance } from "fastify";
import {
    serializerCompiler,
    validatorCompiler,
} from "fastify-type-provider-zod";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AccessProjectDocumentRequest } from "@/shared/types/dto.js";
import {
    registerProjectDocumentAccessRoute,
    type ProjectDocumentAccessRouteService,
} from "./projectDocumentAccessRoute.js";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const DOCUMENT_ID = "00000000-0000-4000-8000-000000000101";

function request(
    audience: AccessProjectDocumentRequest["audience"],
): AccessProjectDocumentRequest {
    return {
        projectSlug: "test-project",
        documentId: DOCUMENT_ID,
        audience,
        languageCode: "en",
        mode: "inline",
    };
}

describe("project document access route", () => {
    let server: FastifyInstance;
    let service: ProjectDocumentAccessRouteService;

    beforeEach(async () => {
        server = Fastify({ logger: false });
        await server.register(fastifySensible);
        await server.register(fastifyRateLimit, {
            global: false,
            hook: "preHandler",
        });
        server.setValidatorCompiler(validatorCompiler);
        server.setSerializerCompiler(serializerCompiler);

        const access = vi.fn<ProjectDocumentAccessRouteService["access"]>();
        access.mockImplementation(({ request: accessRequest }) =>
            Promise.resolve({
                url: "https://documents.example.com/report.html",
                expiresAt: new Date("2099-01-01"),
                downloadFileName: "report.html",
                contentType: "text/html",
                audience: accessRequest.audience,
                htmlScriptsEnabled: true,
            }),
        );
        const authenticateFacilitator =
            vi.fn<
                ProjectDocumentAccessRouteService["authenticateFacilitator"]
            >();
        authenticateFacilitator.mockImplementation(({ request }) => {
            if (request.headers.authorization !== "Bearer valid") {
                throw server.httpErrors.unauthorized();
            }
            return Promise.resolve({ userId: USER_ID });
        });
        service = { access, authenticateFacilitator };
        registerProjectDocumentAccessRoute({
            server,
            service,
            apiVersion: "v1",
        });
        await server.ready();
    });

    afterEach(async () => {
        await server.close();
    });

    it("serves participant versions anonymously without authenticating", async () => {
        const response = await server.inject({
            method: "POST",
            url: "/api/v1/project/document/access",
            payload: request("participant"),
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers["cache-control"]).toBe("no-store");
        expect(service.authenticateFacilitator).not.toHaveBeenCalled();
        expect(service.access).toHaveBeenCalledExactlyOnceWith({
            request: request("participant"),
            authorization: { type: "public" },
        });
    });

    it("requires authentication for facilitator versions", async () => {
        const anonymousResponse = await server.inject({
            method: "POST",
            url: "/api/v1/project/document/access",
            payload: request("owner"),
        });
        expect(anonymousResponse.statusCode).toBe(401);
        expect(service.access).not.toHaveBeenCalled();

        const authenticatedResponse = await server.inject({
            method: "POST",
            url: "/api/v1/project/document/access",
            headers: { authorization: "Bearer valid" },
            payload: request("owner"),
        });
        expect(authenticatedResponse.statusCode).toBe(200);
        expect(authenticatedResponse.headers["cache-control"]).toBe("no-store");
        expect(service.access).toHaveBeenCalledExactlyOnceWith({
            request: request("owner"),
            authorization: { type: "facilitator", userId: USER_ID },
        });
    });

    it("rate limits anonymous access by requester", async () => {
        for (let requestCount = 0; requestCount < 60; requestCount += 1) {
            const response = await server.inject({
                method: "POST",
                url: "/api/v1/project/document/access",
                payload: request("participant"),
            });
            expect(response.statusCode).toBe(200);
        }
        const blocked = await server.inject({
            method: "POST",
            url: "/api/v1/project/document/access",
            payload: request("participant"),
        });

        expect(blocked.statusCode).toBe(429);
        expect(service.access).toHaveBeenCalledTimes(60);
    });
});
