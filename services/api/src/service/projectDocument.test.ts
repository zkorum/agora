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
