import { describe, expect, it } from "vitest";
import { Dto } from "@/shared/types/dto.js";

const projectDocumentMetadata = {
    projectSlug: "example-project",
    defaultLanguageCode: "en",
    localizations: [
        {
            languageCode: "en",
            name: "Project report",
            downloadFileName: "project-report.pdf",
        },
    ],
};

describe("project document contract", () => {
    const documentSchema =
        Dto.fetchProjectPageResponse.shape.project.shape.documents.element;
    const participant = { audience: "participant", contentType: "text/html" };
    const owner = { audience: "owner", contentType: "text/html" };
    const document = {
        documentId: "00000000-0000-4000-8000-000000000001",
        languageCode: "en",
        name: "Report",
    };

    it("requires a participant version and permits an additional owner version", () => {
        expect(
            documentSchema.parse({
                ...document,
                versions: { participant, owner },
            }).versions,
        ).toEqual({ participant, owner });
        expect(
            documentSchema.parse({ ...document, versions: { participant } })
                .versions,
        ).toEqual({ participant });
        expect(() =>
            documentSchema.parse({ ...document, versions: { owner } }),
        ).toThrow();
        expect(() =>
            documentSchema.parse({
                ...document,
                versions: { participant: owner },
            }),
        ).toThrow();
        expect(() =>
            documentSchema.parse({
                ...document,
                versions: { participant, owner: participant },
            }),
        ).toThrow();
    });

    it("requires an explicit audience for every access request", () => {
        const request = {
            projectSlug: "example-project",
            documentId: document.documentId,
            languageCode: "en",
            mode: "inline",
        };
        expect(() => Dto.accessProjectDocumentRequest.parse(request)).toThrow();
        expect(
            Dto.accessProjectDocumentRequest.parse({
                ...request,
                audience: "participant",
            }).audience,
        ).toBe("participant");
        expect(
            Dto.accessProjectDocumentRequest.parse({
                ...request,
                audience: "owner",
            }).audience,
        ).toBe("owner");
    });
    it("attaches upload metadata directly to a project", () => {
        expect(
            Dto.projectDocumentUploadMetadata.parse(projectDocumentMetadata),
        ).toEqual(projectDocumentMetadata);
    });

    it("rejects the removed conversation association", () => {
        expect(() =>
            Dto.projectDocumentUploadMetadata.parse({
                ...projectDocumentMetadata,
                conversationSlugId: "conversation",
            }),
        ).toThrow();
    });

    it("returns an empty project document list without conversation options", () => {
        expect(
            Dto.listProjectDocumentsResponse.parse({ documents: [] }),
        ).toEqual({ documents: [] });
        expect(() =>
            Dto.listProjectDocumentsResponse.parse({
                documents: [],
                conversationOptions: [],
            }),
        ).toThrow();
    });
});
