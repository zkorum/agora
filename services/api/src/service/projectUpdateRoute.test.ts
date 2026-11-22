import fastifySensible from "@fastify/sensible";
import Fastify from "fastify";
import {
    serializerCompiler,
    validatorCompiler,
} from "fastify-type-provider-zod";
import { expect, it, vi } from "vitest";
import type { z } from "zod";
import type {
    Dto,
    UpdateProjectRequest,
    UpdateProjectResponse,
} from "@/shared/types/dto.js";
import { registerProjectUpdateRoute } from "./projectUpdateRoute.js";

const payload = {
    currentProjectSlug: "existing-project",
    projectSlug: "renamed-project",
    projectTitle: "Updated title",
    ownerOrganizationSlugs: ["example-owner"],
    participationMode: "account_required",
} satisfies z.input<typeof Dto.updateProjectRequest>;

async function setupProjectUpdateRoute(authorizedProjectSlug: string) {
    const server = Fastify({ logger: false });
    server.setValidatorCompiler(validatorCompiler);
    server.setSerializerCompiler(serializerCompiler);
    server.register(fastifySensible);

    const update = vi.fn<
        (data: UpdateProjectRequest) => Promise<UpdateProjectResponse>
    >((data) =>
        Promise.resolve({
            success: true,
            projectId: 1,
            projectSlug: data.projectSlug,
        }),
    );
    registerProjectUpdateRoute({
        server,
        apiVersion: "v1",
        authorize: ({ projectSlug }) =>
            projectSlug === authorizedProjectSlug
                ? Promise.resolve()
                : Promise.reject(server.httpErrors.forbidden()),
        update,
    });
    await server.ready();

    return {
        server,
        update,
        sendUpdate: async () =>
            await server.inject({
                method: "POST",
                url: "/api/v1/administrator/project/update",
                payload,
            }),
    };
}

it("rejects an edit when access is granted only for the requested new slug", async () => {
    const { server, update, sendUpdate } = await setupProjectUpdateRoute(
        payload.projectSlug,
    );
    try {
        const response = await sendUpdate();

        expect(response.statusCode).toBe(403);
        expect(update).not.toHaveBeenCalled();
    } finally {
        await server.close();
    }
});

it("passes the rename and participation change through after authorizing the existing project", async () => {
    const { server, update, sendUpdate } = await setupProjectUpdateRoute(
        payload.currentProjectSlug,
    );
    try {
        const response = await sendUpdate();

        expect(response.statusCode).toBe(200);
        expect(update).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining(payload),
        );
        expect(response.json()).toEqual({
            success: true,
            projectId: 1,
            projectSlug: payload.projectSlug,
        });
    } finally {
        await server.close();
    }
});
