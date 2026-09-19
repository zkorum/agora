import { AxiosError, AxiosHeaders } from "axios";
import type { ProjectDocumentAccess } from "src/components/project/projectPageTypes";
import {
  getProjectDocumentDownloadFileName,
  type ProjectDocumentContentType,
} from "src/shared/projectDocument";
import type { ProjectPageDocument } from "src/shared/types/dto";
import { computed, nextTick, onScopeDispose, ref, watch } from "vue";

import reportHtml from "./fixtures/project-document-report.html?raw";

export type DocumentScenario =
  | "available"
  | "slow"
  | "denied"
  | "error"
  | "empty";
export type PreviewViewer = "participant" | "owner";

export const documentScenarioOptions = [
  { label: "Normal requests", value: "available" },
  { label: "Simulate slow requests", value: "slow" },
  { label: "Simulate access denied", value: "denied" },
  { label: "Simulate next request failure", value: "error" },
  { label: "No documents", value: "empty" },
] satisfies { label: string; value: DocumentScenario }[];
export const documentViewerOptions = [
  { label: "Participant", value: "participant" },
  { label: "Project owner", value: "owner" },
] satisfies { label: string; value: PreviewViewer }[];
export const documentScenarioHints = {
  available:
    "Choose Participant or Project owner to compare the versions shown.",
  slow: "View, Download and Reload take two seconds to test their loading buttons.",
  denied:
    "View and Download show an access-denied message. This only simulates an API response.",
  error:
    "The next request fails once. Click Retry in the notification to try the same action successfully.",
  empty: "Hides the document section in the page.",
} satisfies Record<DocumentScenario, string>;

export async function scrollToProjectDocuments(
  root: HTMLElement | undefined
): Promise<void> {
  await nextTick();
  root
    ?.querySelector(".project-documents")
    ?.scrollIntoView({ block: "center", behavior: "instant" });
}

async function createPdf(ownerOnly: boolean): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  pdf.setFontSize(24);
  pdf.text("Community priorities", 20, 30);
  pdf.setFontSize(12);
  pdf.text(
    [
      ownerOnly
        ? "Owner-only version - fictional planning notes"
        : "Participant version - fictional summary",
      "",
      "214 participants / 62 statements / 1,238 votes",
      "",
      "1. Publish clear consultation updates - 84% support",
      "2. Improve access to local services - 78% support",
      "3. Create spaces for young people - 71% support",
      "",
      ownerOnly
        ? "Private follow-up: prepare the next facilitation workshop."
        : "This is the same report project participants can access.",
    ],
    20,
    50
  );
  return pdf.output("blob");
}

export function useProjectDocumentDemo() {
  const scenario = ref<DocumentScenario>("available");
  const viewer = ref<PreviewViewer>("owner");
  let hasSimulatedFailure = false;
  watch(scenario, () => {
    hasSimulatedFailure = false;
  });
  const fixtures = [
    {
      documentId: "00000000-0000-4000-8000-000000000301",
      name: "Community priorities — HTML report",
      contentType: "text/html",
      fileName: "community-priorities.html",
      participant: () => new Blob([reportHtml], { type: "text/html" }),
      owner: () =>
        new Blob(
          [
            reportHtml.replace(
              "<h1>Community priorities</h1>",
              "<h1>Community priorities — owner-only version</h1><p>Private planning notes: prepare the next facilitation workshop. This fictional note is not in the participant version.</p>"
            ),
          ],
          { type: "text/html" }
        ),
    },
    {
      documentId: "00000000-0000-4000-8000-000000000302",
      name: "Community priorities — PDF summary",
      contentType: "application/pdf",
      fileName: "community-priorities.pdf",
      participant: () => createPdf(false),
      owner: () => createPdf(true),
    },
    {
      documentId: "00000000-0000-4000-8000-000000000303",
      name: "Community priorities — CSV data",
      contentType: "text/csv",
      fileName: "community-priorities.csv",
      participant: () =>
        new Blob(
          [
            "priority,support\nConsultation updates,84\nLocal services,78\nYouth spaces,71\n",
          ],
          { type: "text/csv" }
        ),
      owner: undefined,
    },
  ] satisfies {
    documentId: string;
    name: string;
    contentType: ProjectDocumentContentType;
    fileName: string;
    participant: () => Blob | Promise<Blob>;
    owner: (() => Blob | Promise<Blob>) | undefined;
  }[];
  const urls = new Set<string>();
  const urlPromises = new Map<string, Promise<string>>();
  let isDisposed = false;
  onScopeDispose(() => {
    isDisposed = true;
    for (const url of urls) URL.revokeObjectURL(url);
    urls.clear();
    urlPromises.clear();
  });

  async function createUrl(
    createBlob: () => Blob | Promise<Blob>
  ): Promise<string> {
    const blob = await createBlob();
    if (isDisposed) throw new Error("The document preview has closed");
    const url = URL.createObjectURL(blob);
    urls.add(url);
    return url;
  }

  async function getUrl({
    key,
    createBlob,
  }: {
    key: string;
    createBlob: () => Blob | Promise<Blob>;
  }): Promise<string> {
    const cached = urlPromises.get(key);
    if (cached !== undefined) return await cached;
    const pending = createUrl(createBlob);
    urlPromises.set(key, pending);
    try {
      return await pending;
    } catch (error) {
      urlPromises.delete(key);
      throw error;
    }
  }
  const documents = computed<ProjectPageDocument[]>(() =>
    scenario.value === "empty"
      ? []
      : fixtures.map((file) => ({
          documentId: file.documentId,
          name: file.name,
          languageCode: "en",
          versions: {
            participant: {
              audience: "participant",
              contentType: file.contentType,
            },
            owner:
              viewer.value === "owner" && file.owner !== undefined
                ? { audience: "owner", contentType: file.contentType }
                : undefined,
          },
        }))
  );
  const accessDocument: ProjectDocumentAccess = async (request) => {
    if (scenario.value === "slow")
      await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    if (
      scenario.value === "denied" ||
      (request.audience === "owner" && viewer.value !== "owner")
    ) {
      throw new AxiosError("Access denied", undefined, undefined, undefined, {
        status: 403,
        statusText: "Forbidden",
        data: {},
        headers: {},
        config: { headers: new AxiosHeaders() },
      });
    }
    if (scenario.value === "error" && !hasSimulatedFailure) {
      hasSimulatedFailure = true;
      throw new Error("Simulated document access failure");
    }
    const file = fixtures.find(
      (candidate) => candidate.documentId === request.documentId
    );
    const createBlob = file?.[request.audience];
    if (file === undefined || createBlob === undefined)
      throw new Error("Unknown demo document version");
    const url = await getUrl({
      key: `${file.documentId}/${request.audience}`,
      createBlob,
    });
    return {
      url,
      audience: request.audience,
      htmlScriptsEnabled: file.contentType === "text/html",
      contentType: file.contentType,
      downloadFileName: getProjectDocumentDownloadFileName({
        fileName: file.fileName,
        audience: request.audience,
      }),
      expiresAt: new Date(Date.now() + 600_000),
    };
  };
  return {
    documents,
    accessDocument,
    scenario,
    viewer,
  };
}
