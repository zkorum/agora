import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
    Dto,
    type UpdateProjectRequest,
    type UpdateProjectResponse,
} from "@/shared/types/dto.js";

export function registerProjectUpdateRoute({
    server,
    apiVersion,
    authorize,
    update,
}: {
    server: FastifyInstance;
    apiVersion: string;
    authorize: (params: {
        request: FastifyRequest;
        projectSlug: string;
        capability: "project_update";
        ownerOrganizationSlugs: readonly string[];
    }) => Promise<void>;
    update: (data: UpdateProjectRequest) => Promise<UpdateProjectResponse>;
}): void {
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/project/update`,
        schema: {
            body: Dto.updateProjectRequest,
            response: {
                200: Dto.updateProjectResponse,
            },
        },
        handler: async (request) => {
            await authorize({
                request,
                projectSlug: request.body.currentProjectSlug,
                capability: "project_update",
                ownerOrganizationSlugs: request.body.ownerOrganizationSlugs,
            });
            return await update(request.body);
        },
    });
}
