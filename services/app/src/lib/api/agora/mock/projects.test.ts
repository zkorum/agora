import { describe, expect, test } from "vitest";

import {
  canApplyPublishedSetup,
  type ConversationSetup,
  conversationSetupSchema,
  updateCreatedConversationSchema,
} from "#lib/api/agora/conversation-setup.js";
import { createProjectInputSchema } from "$logic/agora/project-creation.js";

import { createMockProjectsApi, mockProjectsStorageKey } from "./projects.js";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

const input = createProjectInputSchema.parse({
  projectSlug: "riverside",
  projectTitle: "A Greener Riverside",
  body: "A community-led project.",
  ownerOrganizationSlugs: ["civic-tomorrow"],
  authentication: "guest",
  emailUpdates: "off",
  languageSettings: {
    targetLanguageCodes: [],
    dynamicTranslationEnabled: false,
  },
  contentLocalizations: [],
});

describe("disposable projects API", () => {
  const fieldId = "a1feefab-11b8-4ebd-baf6-33b931be4be3";
  const gathering = {
    title: "Suggestions",
    description: "",
    conversationType: "gathering",
    allowNewResponses: false,
    responseVisibility: "facilitators",
    responseFormat: [
      { fieldId, label: "Where?", characterLimit: 8, required: true },
    ],
    seedGatheringResponses: [[{ fieldId, value: "Library" }]],
  } satisfies ConversationSetup;
  const comparison = {
    title: "Priorities",
    description: "",
    conversationType: "prioritizing",
    prioritizationType: "comparisons",
    comparisonMethod: "bws",
    allowParticipantStatements: false,
    seedOpinions: [],
  } satisfies ConversationSetup;
  test("publishing freezes complete Gathering answers in field order and consumes the draft once", async () => {
    const storage = memoryStorage();
    const { api } = createMockProjectsApi({ storage });
    await api.create(input);
    const noteId = "84b6e850-fcb9-46ec-a247-e11a8bd27081";
    const setup = {
      ...gathering,
      responseFormat: [
        {
          fieldId: noteId,
          label: "Why?",
          characterLimit: 120,
          required: false,
        },
        ...gathering.responseFormat,
      ],
    };
    const draft = await api.createConversationDraft({
      projectSlug: input.projectSlug,
      conversationType: setup.conversationType,
    });
    if (!draft) throw new Error("Expected draft");
    const publish = {
      projectSlug: draft.projectSlug,
      draftId: draft.id,
      setup,
    };
    const created = await api.publishConversationDraft(publish);
    expect(created).toMatchObject({
      id: draft.id,
      projectSlug: draft.projectSlug,
      setup: {
        seedGatheringResponses: [
          [
            { fieldId: noteId, value: "" },
            { fieldId, value: "Library" },
          ],
        ],
      },
    });
    await expect(
      api.publishConversationDraft(publish),
    ).resolves.toBeUndefined();
    const reopened = await createMockProjectsApi({
      storage,
    }).api.loadWorkspace();
    expect(reopened.drafts).toEqual([]);
    expect(reopened.conversations).toEqual([created]);
  });

  test("an invalid or mismatched promotion leaves the original draft available", async () => {
    const storage = memoryStorage();
    const { api } = createMockProjectsApi({ storage });
    await api.create(input);
    const draft = await api.createConversationDraft({
      projectSlug: input.projectSlug,
      conversationType: "gathering",
    });
    if (!draft) throw new Error("Expected Gathering draft");
    const target = { projectSlug: draft.projectSlug, draftId: draft.id };
    const before = storage.getItem(mockProjectsStorageKey);
    await expect(
      api.publishConversationDraft({ ...target, setup: comparison }),
    ).resolves.toBeUndefined();
    await expect(
      api.publishConversationDraft({
        ...target,
        projectSlug: "elsewhere",
        setup: gathering,
      }),
    ).resolves.toBeUndefined();
    await expect(
      api.publishConversationDraft({
        ...target,
        setup: { ...gathering, seedGatheringResponses: [[]] },
      }),
    ).rejects.toThrow();
    expect(storage.getItem(mockProjectsStorageKey)).toBe(before);
  });

  test("creating comparisons has no seed minimum; quadratic voting requires an item", () => {
    expect(conversationSetupSchema.safeParse(comparison).success).toBe(true);
    expect(
      conversationSetupSchema.safeParse({
        title: "QV",
        description: "",
        conversationType: "prioritizing",
        prioritizationType: "qv",
        allowOpposition: true,
        seedStatements: [],
      }).success,
    ).toBe(false);
  });

  test("Mapping enforces batch limits without capping the total number of seeds", () => {
    const setup = {
      conversationType: "polis",
      title: "Ideas",
      description: "",
      display: "feed",
      allowNewOpinions: true,
      seedOpinions: Array.from({ length: 51 }, (_, i) => `Statement ${i + 1}`),
    } satisfies ConversationSetup;
    expect(conversationSetupSchema.safeParse(setup).success).toBe(false);
    const current = {
      id: fieldId,
      projectSlug: input.projectSlug,
      createdAt: "2026-11-17T12:00:00.000Z",
      status: "open",
      revision: 0,
    } as const;
    expect(
      canApplyPublishedSetup({
        current: { ...current, setup: { ...setup, seedOpinions: [] } },
        next: setup,
      }),
    ).toBe(false);
    expect(
      canApplyPublishedSetup({
        current: {
          ...current,
          setup: { ...setup, seedOpinions: setup.seedOpinions.slice(0, 50) },
        },
        next: setup,
      }),
    ).toBe(true);
    expect(
      canApplyPublishedSetup({
        current: { ...current, setup },
        next: { ...setup, seedOpinions: [] },
      }),
    ).toBe(false);
  });

  test("a closed Gathering can remove a seed but cannot replace it or change the frozen format", async () => {
    const storage = memoryStorage();
    const { api } = createMockProjectsApi({ storage });
    await api.create(input);
    const draft = await api.createConversationDraft({
      projectSlug: input.projectSlug,
      conversationType: "gathering",
    });
    if (!draft) throw new Error("Expected draft");
    const initial = await api.publishConversationDraft({
      projectSlug: draft.projectSlug,
      draftId: draft.id,
      setup: gathering,
    });
    if (!initial) throw new Error("Expected activity");
    const target = { projectSlug: draft.projectSlug, conversationId: draft.id };
    const closed = await api.updateCreatedConversation({
      ...target,
      expectedRevision: initial.revision,
      change: { kind: "status", status: "closed" },
    });
    if (!closed) throw new Error("Expected closure");
    await expect(
      api.updateCreatedConversation({
        ...target,
        expectedRevision: initial.revision,
        change: { kind: "status", status: "open" },
      }),
    ).resolves.toBeUndefined();
    const closedTarget = { ...target, expectedRevision: closed.revision };
    expect(
      updateCreatedConversationSchema.safeParse({
        ...closedTarget,
        change: { kind: "status" },
      }).success,
    ).toBe(false);
    const closedBytes = storage.getItem(mockProjectsStorageKey);
    await expect(
      api.updateCreatedConversation({
        ...closedTarget,
        change: { kind: "status", status: "closed" },
      }),
    ).resolves.toEqual(closed);
    expect(storage.getItem(mockProjectsStorageKey)).toBe(closedBytes);
    await expect(
      api.updateCreatedConversation({
        ...closedTarget,
        change: {
          kind: "setup",
          setup: {
            ...gathering,
            seedGatheringResponses: [[{ fieldId, value: "Museum" }]],
          },
        },
      }),
    ).resolves.toBeUndefined();
    await expect(
      api.updateCreatedConversation({
        ...closedTarget,
        change: {
          kind: "setup",
          setup: {
            ...gathering,
            responseFormat: gathering.responseFormat.map((f) => ({
              ...f,
              label: "New label",
            })),
          },
        },
      }),
    ).resolves.toBeUndefined();
    const edited = await api.updateCreatedConversation({
      ...closedTarget,
      change: {
        kind: "setup",
        setup: {
          ...gathering,
          allowNewResponses: true,
          seedGatheringResponses: [],
        },
      },
    });
    if (!edited) throw new Error("Expected deletion");
    const reopened = await api.updateCreatedConversation({
      ...target,
      expectedRevision: edited.revision,
      change: { kind: "status", status: "open" },
    });
    expect(reopened).toMatchObject({
      status: "open",
      setup: { seedGatheringResponses: [], allowNewResponses: true },
    });
    const loaded = await createMockProjectsApi({ storage }).api.loadWorkspace();
    expect(loaded.conversations).toEqual([reopened]);
  });

  test("starts empty without manufacturing user projects", async () => {
    const { api } = createMockProjectsApi({ storage: memoryStorage() });
    expect(await api.loadWorkspace()).toEqual({
      projects: [],
      drafts: [],
      conversations: [],
    });
    expect((await api.getCreationOptions()).organizations).toHaveLength(2);
  });

  test("provisions one editable personal project without replacing earlier projects", async () => {
    const storage = memoryStorage();
    const legacy = createMockProjectsApi({ storage });
    const prior = await legacy.api.create(input);
    if (!prior.success) throw new Error("Expected a new project");

    const options = {
      storage,
      personalWorkspace: {
        organizationName: "Personal organisation",
        projectTitle: "My project",
      },
    };
    const { api } = createMockProjectsApi(options);
    const initial = await api.loadWorkspace();
    const starter = initial.projects.find(
      (project) => project.projectTitle === "My project",
    );
    if (!starter) throw new Error("Expected a default project");
    expect(initial.projects).toEqual([starter, prior.project]);
    expect(starter).toMatchObject({
      directoryVisibility: "unlisted",
      ownerOrganizationSlugs: ["personal-organization"],
    });
    expect((await api.getCreationOptions()).defaultOwnerOrganizationSlug).toBe(
      "personal-organization",
    );

    await api.updateProjectSettings({ ...starter, projectTitle: "Renamed" });
    const reopened = await createMockProjectsApi(options).api.loadWorkspace();
    expect(reopened.projects).toEqual([
      { ...starter, projectTitle: "Renamed" },
      prior.project,
    ]);
  });

  test("persists a creation across adapter instances in the same tab", async () => {
    const storage = memoryStorage();
    const { api } = createMockProjectsApi({
      storage,
      now: () => new Date("2026-11-17T12:00:00Z"),
    });
    const result = await api.create(input);
    expect(result.success).toBe(true);
    const reloaded = createMockProjectsApi({ storage });
    expect(
      (await reloaded.api.loadWorkspace()).projects.find(
        (item) => item.projectSlug === "riverside",
      ),
    ).toMatchObject({
      ...input,
      projectId: 1,
      createdAt: "2026-11-17T12:00:00.000Z",
      ownerOrganizations: [{ organizationSlug: "civic-tomorrow" }],
    });
  });

  test("persists directory visibility separately from settings and conversation drafts", async () => {
    const storage = memoryStorage();
    const { api, reset } = createMockProjectsApi({ storage });
    const created = await api.create(input);
    if (!created.success) throw new Error("Expected a new project");
    expect(created.project.directoryVisibility).toBe("unlisted");
    const draft = await api.createConversationDraft({
      projectSlug: input.projectSlug,
      conversationType: "polis",
    });
    expect(draft).toMatchObject({
      projectSlug: input.projectSlug,
      conversationType: "polis",
    });
    await api.setProjectDirectoryVisibility({
      projectSlug: input.projectSlug,
      directoryVisibility: "listed",
    });
    const settings = {
      ...created.project,
      projectId: 999,
      projectTitle: "A new project title",
      body: "<p>Updated <strong>description</strong></p>",
    };
    await api.updateProjectSettings(settings);
    const { api: reopened } = createMockProjectsApi({ storage });
    expect(await reopened.loadWorkspace()).toMatchObject({
      projects: [
        {
          directoryVisibility: "listed",
          projectId: created.project.projectId,
          projectSlug: input.projectSlug,
          projectTitle: settings.projectTitle,
          body: settings.body,
        },
      ],
      drafts: [draft],
    });
    reset();
    expect(await reopened.loadWorkspace()).toEqual({
      projects: [],
      drafts: [],
      conversations: [],
    });
  });

  test("reads earlier mock publication choices as directory visibility", async () => {
    const storage = memoryStorage();
    const { api } = createMockProjectsApi({ storage });
    const created = await api.create(input);
    if (!created.success) throw new Error("Expected a new project");
    const { directoryVisibility, ...project } = created.project;
    expect(directoryVisibility).toBe("unlisted");
    storage.setItem(
      mockProjectsStorageKey,
      JSON.stringify({
        version: 3,
        bodyFormat: "html",
        projects: [{ ...project, isPublished: true }],
      }),
    );
    expect((await api.loadWorkspace()).projects).toMatchObject([
      { projectSlug: input.projectSlug, directoryVisibility: "listed" },
    ]);
  });

  test("does not leak mock state between browser tabs/SSR workspaces", async () => {
    const first = createMockProjectsApi({ storage: memoryStorage() });
    const second = createMockProjectsApi({ storage: memoryStorage() });
    await first.api.create(input);
    expect(await second.api.loadWorkspace()).toEqual({
      projects: [],
      drafts: [],
      conversations: [],
    });
  });

  test("rejects duplicate slugs and unknown owners without writing", async () => {
    const { api } = createMockProjectsApi({ storage: memoryStorage() });
    await api.create(input);
    expect(await api.create(input)).toEqual({
      success: false,
      reason: "project_slug_already_exists",
    });
    expect(
      await api.create({
        ...input,
        projectSlug: "another",
        ownerOrganizationSlugs: ["not-authorized"],
      }),
    ).toEqual({ success: false, reason: "organization_not_allowed" });
    expect((await api.loadWorkspace()).projects).toHaveLength(1);
  });

  test("does not expose mutable fixture or stored references", async () => {
    const { api } = createMockProjectsApi({ storage: memoryStorage() });
    await api.create(input);
    const options = await api.getCreationOptions();
    const owner = options.organizations.at(0);
    if (owner) owner.name = "Modified";
    const { projects } = await api.loadWorkspace();
    const project = projects.at(0);
    if (project) project.projectTitle = "Modified";
    expect((await api.getCreationOptions()).organizations.at(0)?.name).toBe(
      "Civic Tomorrow Collective",
    );
    expect(
      (await api.loadWorkspace()).projects.find(
        (item) => item.projectSlug === "riverside",
      )?.projectTitle,
    ).toBe(input.projectTitle);
  });

  test("fails explicitly for malformed saved data", async () => {
    const storage = memoryStorage();
    storage.setItem(mockProjectsStorageKey, '{"version":4,"projects":[]}');
    const { api } = createMockProjectsApi({ storage });
    await expect(api.loadWorkspace()).rejects.toThrow();
    expect(storage.getItem(mockProjectsStorageKey)).toContain('"version":4');
  });

  test("rejects stored owner identities that contradict the selected owners", async () => {
    const storage = memoryStorage();
    const { api } = createMockProjectsApi({ storage });
    const result = await api.create(input);
    if (!result.success)
      throw new Error("Expected fixture creation to succeed");
    storage.setItem(
      mockProjectsStorageKey,
      JSON.stringify({
        version: 3,
        projects: [
          {
            ...result.project,
            ownerOrganizationSlugs: ["another-owner"],
          },
        ],
      }),
    );
    await expect(api.loadWorkspace()).rejects.toThrow();
  });

  test("never returns success for a failed persistence write", async () => {
    const storage = {
      ...memoryStorage(),
      setItem: () => {
        throw new Error("Storage quota exceeded");
      },
    };
    const { api } = createMockProjectsApi({ storage });
    await expect(api.create(input)).rejects.toThrow("Storage quota exceeded");
    expect((await api.loadWorkspace()).projects).toEqual([]);
  });

  test("persists email configuration and content-language policy together", async () => {
    const storage = memoryStorage();
    const { api } = createMockProjectsApi({ storage });
    const configured = createProjectInputSchema.parse({
      ...input,
      authentication: "strong_verification" as const,
      emailUpdates: "ask" as const,
      contact: {
        organizationSlug: "civic-tomorrow",
        email: "contact@example.org",
      },
      languageSettings: {
        targetLanguageCodes: ["fr" as const],
        dynamicTranslationEnabled: false,
      },
      contentLocalizations: [
        {
          languageCode: "fr" as const,
          projectTitle: "Un projet citoyen",
          body: "Un projet porté par la communauté.",
        },
      ],
    });
    expect((await api.create(configured)).success).toBe(true);
    const reloaded = createMockProjectsApi({ storage });
    expect((await reloaded.api.loadWorkspace()).projects).toMatchObject([
      configured,
    ]);
  });

  test("invalid prerequisites never write partial project settings", async () => {
    const storage = memoryStorage();
    const { api } = createMockProjectsApi({ storage });
    await expect(
      api.create({ ...input, emailUpdates: "ask" }),
    ).rejects.toThrow();
    expect((await api.loadWorkspace()).projects).toEqual([]);
    expect(storage.getItem(mockProjectsStorageKey)).toBeNull();
  });

  test("keeps separate project emails for the same affiliated organisation", async () => {
    const { api } = createMockProjectsApi({ storage: memoryStorage() });
    for (const projectSlug of ["riverside", "transport"]) {
      await api.create(
        createProjectInputSchema.parse({
          ...input,
          projectSlug,
          contact: {
            organizationSlug: "civic-tomorrow",
            email: `${projectSlug}@example.org`,
          },
        }),
      );
    }
    expect(
      (await api.loadWorkspace()).projects.map(
        (project) => project.contact?.email,
      ),
    ).toEqual(["riverside@example.org", "transport@example.org"]);
  });

  test("public credits and contact affiliation do not grant project management", async () => {
    const storage = memoryStorage();
    const { api } = createMockProjectsApi({ storage });
    const options = await api.getCreationOptions();
    expect(
      options.organizations.some(
        (org) => org.organizationSlug === "riverside-trust",
      ),
    ).toBe(false);
    expect(
      options.publicOrganizations.some(
        (org) => org.organizationSlug === "riverside-trust",
      ),
    ).toBe(true);
    const configured = createProjectInputSchema.parse({
      ...input,
      contact: {
        organizationSlug: "riverside-trust",
        email: "team@example.org",
      },
      attributions: [
        {
          source: "organization",
          role: "project_owner",
          organizationSlug: "riverside-trust",
        },
        {
          source: "external",
          role: "sponsor",
          displayName: "Local Foundation",
          defaultLanguageCode: "en",
        },
      ],
    });
    expect((await api.create(configured)).success).toBe(true);
    const reloaded = createMockProjectsApi({ storage });
    expect((await reloaded.api.loadWorkspace()).projects).toMatchObject([
      {
        ...configured,
        ownerOrganizationSlugs: ["civic-tomorrow"],
        referencedOrganizations: [
          { organizationSlug: "civic-tomorrow" },
          { organizationSlug: "riverside-trust" },
        ],
      },
    ]);
    expect(
      await api.create({
        ...input,
        projectSlug: "unauthorized",
        ownerOrganizationSlugs: ["riverside-trust"],
      }),
    ).toEqual({ success: false, reason: "organization_not_allowed" });
  });

  test.each(["credit", "contact"])(
    "rejects unknown %s organisations before persisting",
    async (kind) => {
      const storage = memoryStorage();
      const { api } = createMockProjectsApi({ storage });
      const configured = createProjectInputSchema.parse({
        ...input,
        attributions:
          kind === "credit"
            ? [
                {
                  source: "organization",
                  role: "partner",
                  organizationSlug: "unknown",
                },
              ]
            : [],
        contact:
          kind === "contact"
            ? { organizationSlug: "unknown", email: "team@example.org" }
            : undefined,
      });
      expect(await api.create(configured)).toEqual({
        success: false,
        reason: "organization_not_allowed",
      });
      expect(storage.getItem(mockProjectsStorageKey)).toBeNull();
    },
  );

  test.each(["credit", "contact"])(
    "rejects stored %s affiliations without a matching organisation identity",
    async (kind) => {
      const storage = memoryStorage();
      const { api } = createMockProjectsApi({ storage });
      const result = await api.create(
        createProjectInputSchema.parse({
          ...input,
          contact:
            kind === "contact"
              ? {
                  organizationSlug: "riverside-trust",
                  email: "team@example.org",
                }
              : undefined,
          attributions:
            kind === "credit"
              ? [
                  {
                    source: "organization",
                    role: "partner",
                    organizationSlug: "riverside-trust",
                  },
                ]
              : [],
        }),
      );
      if (!result.success) throw new Error("Expected fixture creation");
      storage.setItem(
        mockProjectsStorageKey,
        JSON.stringify({
          version: 3,
          projects: [{ ...result.project, referencedOrganizations: [] }],
        }),
      );
      await expect(api.loadWorkspace()).rejects.toThrow("saved identities");
    },
  );

  test("reads older v3 contacts using owner identities when public reference metadata is absent", async () => {
    const storage = memoryStorage();
    const { api } = createMockProjectsApi({ storage });
    const result = await api.create(
      createProjectInputSchema.parse({
        ...input,
        contact: {
          organizationSlug: "civic-tomorrow",
          email: "team@example.org",
        },
      }),
    );
    if (!result.success) throw new Error("Expected fixture creation");
    storage.setItem(
      mockProjectsStorageKey,
      JSON.stringify({
        version: 3,
        projects: [
          {
            ...result.project,
            body: "Keep <strong>literal</strong> & visible",
            referencedOrganizations: undefined,
            attributions: undefined,
          },
        ],
      }),
    );
    expect((await api.loadWorkspace()).projects).toMatchObject([
      {
        body: "Keep &lt;strong&gt;literal&lt;/strong&gt; &amp; visible",
        contact: {
          organizationSlug: "civic-tomorrow",
          email: "team@example.org",
        },
        referencedOrganizations: [],
        attributions: [],
      },
    ]);
  });

  test("leaves older mock data untouched instead of guessing its language meaning", async () => {
    const storage = memoryStorage();
    storage.setItem("agora:mock-projects:v1", "older mock data");
    storage.setItem("agora:mock-projects:v2", "older authentication aliases");
    const { api, reset } = createMockProjectsApi({ storage });
    expect((await api.loadWorkspace()).projects).toEqual([]);
    await api.create(input);
    reset();
    expect(storage.getItem("agora:mock-projects:v1")).toBe("older mock data");
    expect(storage.getItem("agora:mock-projects:v2")).toBe(
      "older authentication aliases",
    );
  });

  test("reset affects only this mock's storage key", async () => {
    const storage = memoryStorage();
    storage.setItem("other-feature", "preserve me");
    const { api, reset } = createMockProjectsApi({ storage });
    await api.create(input);
    reset();
    expect((await api.loadWorkspace()).projects).toEqual([]);
    expect(storage.getItem("other-feature")).toBe("preserve me");
  });
});
