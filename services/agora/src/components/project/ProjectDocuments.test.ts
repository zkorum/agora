import type {
  AccessProjectDocumentResponse,
  ProjectPageDocument,
} from "src/shared/types/dto";
import type { useNotify } from "src/utils/ui/notify";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type App,
  createApp,
  type FunctionalComponent,
  h,
  KeepAlive,
  nextTick,
  ref,
} from "vue";

import ProjectDocuments from "./ProjectDocuments.vue";
import type { ProjectDocumentAccess } from "./projectPageTypes";

const showNotifyMessage = vi.hoisted(() =>
  vi.fn<ReturnType<typeof useNotify>["showNotifyMessage"]>()
);
vi.mock("src/utils/ui/notify", () => ({
  useNotify: () => ({ showNotifyMessage }),
}));

const htmlDocument: ProjectPageDocument = {
  documentId: "00000000-0000-4000-8000-000000000001",
  name: "Project report",
  versions: {
    participant: { audience: "participant", contentType: "text/html" },
  },
  languageCode: "en",
};
const htmlResponse: AccessProjectDocumentResponse = {
  url: "https://documents.example.com/report.html?signature=example",
  contentType: "text/html",
  audience: "participant",
  htmlScriptsEnabled: false,
  downloadFileName: "report.html",
  expiresAt: new Date("2099-01-01"),
};
let app: App | undefined;

const DialogStub: FunctionalComponent<{ modelValue: boolean }> = (
  props,
  { slots }
) => (props.modelValue ? h("div", slots.default?.()) : null);
DialogStub.props = ["modelValue"];

const ButtonStub: FunctionalComponent<{
  label?: string;
  disable?: boolean;
  loading?: boolean;
}> = (props, { slots }) =>
  h(
    "button",
    { disabled: props.disable || props.loading, "data-loading": props.loading },
    props.label ?? slots.default?.()
  );
ButtonStub.props = ["label", "disable", "loading"];

const DecorativeStub: FunctionalComponent = () => h("span");

afterEach(() => {
  app?.unmount();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.useRealTimers();
  showNotifyMessage.mockReset();
});

function mountDocuments({
  accessDocument,
  initialDocuments = [htmlDocument],
  keepAlive = false,
}: {
  accessDocument: ProjectDocumentAccess;
  initialDocuments?: ProjectPageDocument[];
  keepAlive?: boolean;
}) {
  const documents = ref(initialDocuments);
  const visible = ref(true);
  const container = document.createElement("div");
  document.body.append(container);
  const renderDocuments = () =>
    h(ProjectDocuments, {
      projectSlug: "test-project",
      documents: documents.value,
      languageCode: "en",
      accessDocument,
    });
  app = createApp({
    setup: () => () =>
      keepAlive
        ? h(KeepAlive, null, {
            default: () => (visible.value ? renderDocuments() : null),
          })
        : renderDocuments(),
  });
  app.component("QDialog", DialogStub);
  app.component("QBtn", ButtonStub);
  for (const name of ["QIcon", "QSpinner", "QSpinnerDots", "QTooltip"]) {
    app.component(name, DecorativeStub);
  }
  app.mount(container);
  return { container, documents, visible };
}

function clickButton({
  container,
  label,
}: {
  container: HTMLElement;
  label: string;
}): void {
  const button = [...container.querySelectorAll("button")].find(
    (element) =>
      element.getAttribute("aria-label") === label ||
      element.textContent?.trim() === label
  );
  if (button === undefined) throw new Error(`Missing button: ${label}`);
  button.click();
}

describe("project document viewer", () => {
  it("enables isolated scripts only when the backend explicitly permits them", async () => {
    const { container } = mountDocuments({
      accessDocument: vi
        .fn<ProjectDocumentAccess>()
        .mockResolvedValue({ ...htmlResponse, htmlScriptsEnabled: true }),
    });
    clickButton({
      container,
      label: "View: Project report — Participant version",
    });
    await vi.waitFor(() =>
      expect(container.querySelector("iframe")?.getAttribute("sandbox")).toBe(
        "allow-scripts"
      )
    );
    expect(
      container.querySelector("iframe")?.getAttribute("sandbox")
    ).not.toContain("allow-same-origin");
  });
  it("preserves the loaded viewer when unchanged metadata is refreshed", async () => {
    const accessDocument = vi
      .fn<ProjectDocumentAccess>()
      .mockResolvedValue(htmlResponse);
    const { container, documents } = mountDocuments({ accessDocument });
    clickButton({
      container,
      label: "View: Project report — Participant version",
    });
    await vi.waitFor(() =>
      expect(container.querySelector("iframe")).not.toBeNull()
    );
    const frame = container.querySelector("iframe");
    frame?.dispatchEvent(new Event("load"));
    documents.value = [
      {
        ...htmlDocument,
        versions: { participant: { ...htmlDocument.versions.participant } },
      },
    ];
    await nextTick();
    expect(container.querySelector("iframe")).toBe(frame);
    expect(
      container.querySelector(".project-documents__viewer-loading")
    ).toBeNull();
    expect(accessDocument).toHaveBeenCalledOnce();
  });

  it("ignores a late reload and old frame events after closing and reopening", async () => {
    const pendingReload =
      Promise.withResolvers<AccessProjectDocumentResponse>();
    const accessDocument = vi
      .fn<ProjectDocumentAccess>()
      .mockResolvedValueOnce(htmlResponse)
      .mockImplementationOnce(() => pendingReload.promise)
      .mockResolvedValue({
        ...htmlResponse,
        url: "https://documents.example.com/new.html",
      });
    const { container } = mountDocuments({ accessDocument });
    clickButton({
      container,
      label: "View: Project report — Participant version",
    });
    await vi.waitFor(() =>
      expect(container.querySelector("iframe")).not.toBeNull()
    );
    const oldFrame = container.querySelector("iframe");
    oldFrame?.dispatchEvent(new Event("load"));
    await nextTick();
    clickButton({ container, label: "Reload" });
    await nextTick();
    clickButton({ container, label: "Back to project" });
    await nextTick();
    clickButton({
      container,
      label: "View: Project report — Participant version",
    });
    await vi.waitFor(() =>
      expect(container.querySelector("iframe")?.src).toBe(
        "https://documents.example.com/new.html"
      )
    );
    pendingReload.resolve({
      ...htmlResponse,
      url: "https://documents.example.com/stale.html",
    });
    await pendingReload.promise;
    oldFrame?.dispatchEvent(new Event("load"));
    await nextTick();
    expect(container.querySelector("iframe")?.src).toBe(
      "https://documents.example.com/new.html"
    );
    expect(
      container.querySelector(".project-documents__viewer-loading")
    ).not.toBeNull();
  });

  it("does not open a delayed response after KeepAlive deactivation", async () => {
    const pending = Promise.withResolvers<AccessProjectDocumentResponse>();
    const { container, visible } = mountDocuments({
      accessDocument: () => pending.promise,
      keepAlive: true,
    });
    clickButton({
      container,
      label: "View: Project report — Participant version",
    });
    visible.value = false;
    await nextTick();
    pending.resolve(htmlResponse);
    await pending.promise;
    visible.value = true;
    await nextTick();
    expect(container.querySelector("iframe")).toBeNull();
    expect(
      container.querySelectorAll(".project-document-list-item button:disabled")
    ).toHaveLength(0);
  });

  it("invalidates notification retries when the component is destroyed", async () => {
    const accessDocument = vi
      .fn<ProjectDocumentAccess>()
      .mockRejectedValue(new Error("Unavailable"));
    const { container } = mountDocuments({ accessDocument });
    clickButton({
      container,
      label: "View: Project report — Participant version",
    });
    await vi.waitFor(() => expect(showNotifyMessage).toHaveBeenCalledOnce());
    const notification = showNotifyMessage.mock.calls.at(0)?.[0];
    if (notification === undefined || typeof notification === "string")
      throw new Error("Missing retry notification");
    app?.unmount();
    app = undefined;
    notification.onAction?.();
    expect(accessDocument).toHaveBeenCalledOnce();
  });

  it("shows the shared retry block on timeout instead of treating the frame as loaded", async () => {
    vi.useFakeTimers();
    const accessDocument = vi
      .fn<ProjectDocumentAccess>()
      .mockResolvedValue(htmlResponse);
    const { container } = mountDocuments({ accessDocument });
    clickButton({
      container,
      label: "View: Project report — Participant version",
    });
    await vi.waitFor(() =>
      expect(container.querySelector("iframe")).not.toBeNull()
    );
    await vi.advanceTimersByTimeAsync(15_000);
    expect(container.querySelector(".errorContainer")?.textContent).toContain(
      "The document could not be opened."
    );
    const previousFrame = container.querySelector("iframe");
    clickButton({ container, label: "Retry" });
    await vi.waitFor(() => expect(accessDocument).toHaveBeenCalledTimes(2));
    await vi.waitFor(() =>
      expect(container.querySelector("iframe")).not.toBe(previousFrame)
    );
    expect(container.querySelector(".errorContainer")).toBeNull();
    container.querySelector("iframe")?.dispatchEvent(new Event("load"));
    await nextTick();
    expect(
      container.querySelector(".project-documents__viewer-loading")
    ).toBeNull();
  });

  it("rejects a service response for a different audience", async () => {
    const { container } = mountDocuments({
      accessDocument: vi
        .fn<ProjectDocumentAccess>()
        .mockResolvedValue({ ...htmlResponse, audience: "owner" }),
    });
    clickButton({
      container,
      label: "View: Project report — Participant version",
    });
    await vi.waitFor(() => expect(showNotifyMessage).toHaveBeenCalledOnce());
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("waits for access before mounting HTML in an unprivileged iframe", async () => {
    const pending = Promise.withResolvers<AccessProjectDocumentResponse>();
    const accessDocument = vi.fn<ProjectDocumentAccess>(() => pending.promise);
    const { container } = mountDocuments({
      accessDocument,
      initialDocuments: [{ ...htmlDocument, languageCode: "fr" }],
    });
    clickButton({
      container,
      label: "View: Project report — Participant version",
    });
    await nextTick();
    expect(container.querySelector("iframe")).toBeNull();
    expect(
      container.querySelectorAll('button[data-loading="true"]')
    ).toHaveLength(1);
    expect(
      container.querySelectorAll(".project-document-list-item button:disabled")
    ).toHaveLength(2);
    expect(accessDocument).toHaveBeenCalledWith({
      projectSlug: "test-project",
      documentId: htmlDocument.documentId,
      audience: "participant",
      languageCode: "en",
      mode: "inline",
    });
    pending.resolve(htmlResponse);
    await vi.waitFor(() => {
      const frame = container.querySelector("iframe");
      expect(frame?.src).toBe(htmlResponse.url);
      expect(frame?.getAttribute("sandbox")).toBe("");
      expect(frame?.getAttribute("referrerpolicy")).toBe("no-referrer");
    });
  });

  it("keeps native PDF viewing and reacquires access on reload", async () => {
    const accessDocument = vi.fn<ProjectDocumentAccess>().mockResolvedValue({
      ...htmlResponse,
      contentType: "application/pdf",
      url: "https://documents.example.com/report.pdf",
      downloadFileName: "report.pdf",
    });
    const { container } = mountDocuments({
      accessDocument,
      initialDocuments: [
        {
          ...htmlDocument,
          versions: {
            participant: {
              audience: "participant",
              contentType: "application/pdf",
            },
          },
        },
      ],
    });
    clickButton({
      container,
      label: "View: Project report — Participant version",
    });
    await vi.waitFor(() =>
      expect(container.querySelector("iframe")).not.toBeNull()
    );
    expect(container.querySelector("iframe")?.hasAttribute("sandbox")).toBe(
      false
    );
    container.querySelector("iframe")?.dispatchEvent(new Event("load"));
    await nextTick();
    clickButton({ container, label: "Reload" });
    await vi.waitFor(() => expect(accessDocument).toHaveBeenCalledTimes(2));
  });

  it("does not open a document after its project data has changed", async () => {
    const pending = Promise.withResolvers<AccessProjectDocumentResponse>();
    const { container, documents } = mountDocuments({
      accessDocument: () => pending.promise,
    });
    clickButton({
      container,
      label: "View: Project report — Participant version",
    });
    documents.value = [];
    await nextTick();
    pending.resolve(htmlResponse);
    await pending.promise;
    await nextTick();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("keeps the iframe unmounted when document access fails", async () => {
    const { container } = mountDocuments({
      accessDocument: vi
        .fn<ProjectDocumentAccess>()
        .mockRejectedValue(new Error("Unavailable")),
    });
    clickButton({
      container,
      label: "View: Project report — Participant version",
    });
    await vi.waitFor(() => expect(showNotifyMessage).toHaveBeenCalledOnce());
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("shows both versions to owners and requests exactly the chosen version", async () => {
    const accessDocument = vi.fn<ProjectDocumentAccess>((request) =>
      Promise.resolve({
        ...htmlResponse,
        audience: request.audience,
        url: `https://documents.example.com/${request.audience}.html`,
      })
    );
    const { container } = mountDocuments({
      accessDocument,
      initialDocuments: [
        {
          ...htmlDocument,
          versions: {
            participant: htmlDocument.versions.participant,
            owner: { audience: "owner", contentType: "text/html" },
          },
        },
      ],
    });
    expect(
      container.querySelectorAll(".project-document-list-item__version-row")
    ).toHaveLength(2);
    clickButton({
      container,
      label: "View: Project report — Participant version",
    });
    await vi.waitFor(() =>
      expect(container.querySelector("iframe")?.src).toBe(
        "https://documents.example.com/participant.html"
      )
    );
    clickButton({ container, label: "Back to project" });
    await nextTick();
    clickButton({
      container,
      label: "View: Project report — Owner-only version",
    });
    await vi.waitFor(() =>
      expect(container.querySelector("iframe")?.src).toBe(
        "https://documents.example.com/owner.html"
      )
    );
    expect(
      accessDocument.mock.calls.map(([request]) => request.audience)
    ).toEqual(["participant", "owner"]);
    expect(
      container.querySelector(".project-documents__viewer-version")?.textContent
    ).toBe("Owner-only version");
  });

  it("retries the same owner version through the shared notification action", async () => {
    const accessDocument = vi
      .fn<ProjectDocumentAccess>()
      .mockRejectedValueOnce(new Error("Unavailable"))
      .mockResolvedValue({ ...htmlResponse, audience: "owner" });
    const { container } = mountDocuments({
      accessDocument,
      initialDocuments: [
        {
          ...htmlDocument,
          versions: {
            participant: htmlDocument.versions.participant,
            owner: { audience: "owner", contentType: "text/html" },
          },
        },
      ],
    });
    clickButton({
      container,
      label: "View: Project report — Owner-only version",
    });
    await vi.waitFor(() => expect(showNotifyMessage).toHaveBeenCalledOnce());
    const notification = showNotifyMessage.mock.calls.at(0)?.[0];
    if (notification === undefined || typeof notification === "string")
      throw new Error("Missing retry notification");
    expect(notification.actionLabel).toBe("Retry");
    notification.onAction?.();
    await vi.waitFor(() =>
      expect(container.querySelector("iframe")).not.toBeNull()
    );
    expect(
      accessDocument.mock.calls.map(([request]) => ({
        audience: request.audience,
        mode: request.mode,
      }))
    ).toEqual([
      { audience: "owner", mode: "inline" },
      { audience: "owner", mode: "inline" },
    ]);
  });
});
