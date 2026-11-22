import { z } from "zod";

import { createMockResponse } from "#lib/api/mock-response.js";
import civicTomorrow from "#lib/assets/agora/project-creation/civic-tomorrow.svg";
import civicTomorrowCompact from "#lib/assets/agora/project-detail/civic-tomorrow-compact.svg";
import {
  type CreateProjectInput,
  createProjectInputSchema,
  createProjectSlug,
  type ProjectOrganization,
  projectOrganizationSchema,
  projectSlugSchema,
  type WorkspaceProject,
  workspaceProjectSchema,
} from "$logic/agora/project-creation.js";
import {
  projectHeaderBackgroundChangeSchema,
  projectHeaderBackgroundImageSrcSchema,
} from "$logic/agora/project-header-background.js";

import {
  canApplyPublishedSetup,
  conversationSetupSchema,
  type CreatedProjectConversation,
  createdProjectConversationSchema,
  updateCreatedConversationSchema,
} from "../conversation-setup.js";
import {
  type CreateProjectResult,
  projectConversationDraftInputSchema,
  projectConversationDraftSchema,
  type ProjectsApi,
  type ProjectWorkspaceSnapshot,
  setProjectDirectoryVisibilityInputSchema,
} from "../projects.js";

export const mockProjectsStorageKey = "agora:mock-projects:v3";

const fixtureOrganizations = z.array(projectOrganizationSchema).parse([
  {
    organizationSlug: "civic-tomorrow",
    name: "Civic Tomorrow Collective",
    initials: "CTC",
    logo: {
      src: civicTomorrow,
      compactSrc: civicTomorrowCompact,
      tone: "coral",
    },
  },
  { organizationSlug: "agora", name: "Agora", initials: "A" },
]);
const publicOnlyOrganization = projectOrganizationSchema.parse({
  organizationSlug: "riverside-trust",
  name: "Riverside Trust",
  initials: "RT",
});
const oldPublicationSchema = z.looseObject({ isPublished: z.boolean() });
const storedProjectSchema = z.preprocess((value) => {
  const old = oldPublicationSchema.safeParse(value);
  if (!old.success) return value;
  const { isPublished, ...project } = old.data;
  return {
    ...project,
    directoryVisibility:
      project.directoryVisibility ?? (isPublished ? "listed" : "unlisted"),
  };
}, workspaceProjectSchema);

const storedProjectsSchema = z
  .object({
    version: z.literal(3),
    bodyFormat: z.literal("html"),
    projects: z.array(storedProjectSchema),
    drafts: z.array(projectConversationDraftSchema).default([]),
    conversations: z.array(createdProjectConversationSchema).default([]),
    defaultProjectSlug: projectSlugSchema.optional(),
  })
  .strict()
  .superRefine(
    ({ projects, drafts, conversations, defaultProjectSlug }, context) => {
      const slugs = new Set(projects.map((project) => project.projectSlug));
      if (slugs.size !== projects.length) {
        context.addIssue({
          code: "custom",
          message: "Duplicate stored project slugs",
        });
      }
      if (
        new Set(projects.map((project) => project.projectId)).size !==
        projects.length
      ) {
        context.addIssue({
          code: "custom",
          message: "Duplicate stored project IDs",
        });
      }
      if (defaultProjectSlug !== undefined && !slugs.has(defaultProjectSlug)) {
        context.addIssue({
          code: "custom",
          path: ["defaultProjectSlug"],
          message: "The default project must exist",
        });
      }
      const activities = [...drafts, ...conversations];
      if (
        new Set(activities.map(({ id }) => id)).size !== activities.length ||
        activities.some(({ projectSlug }) => !slugs.has(projectSlug))
      ) {
        context.addIssue({
          code: "custom",
          message:
            "Drafts and created activities must have unique IDs and existing projects",
        });
      }
    },
  );

const legacyProjectBodySchema = z.looseObject({
  body: z.string(),
  contentLocalizations: z.array(z.looseObject({ body: z.string() })),
});
const legacyStoredBodiesSchema = z.looseObject({
  version: z.literal(3),
  bodyFormat: z.undefined().optional(),
  projects: z.array(legacyProjectBodySchema),
});

/** V3 records without a body format marker stored literal text. */
function encodeLegacyProjectBody(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replace(/\r\n?|\n/g, "<br>");
}

function decodeStoredProjects(
  value: unknown,
): z.infer<typeof storedProjectsSchema> {
  const legacy = legacyStoredBodiesSchema.safeParse(value);
  if (!legacy.success) return storedProjectsSchema.parse(value);

  return storedProjectsSchema.parse({
    ...legacy.data,
    bodyFormat: "html",
    projects: legacy.data.projects.map((project) => ({
      ...project,
      body: encodeLegacyProjectBody(project.body),
      contentLocalizations: project.contentLocalizations.map(
        (localization) => ({
          ...localization,
          body: encodeLegacyProjectBody(localization.body),
        }),
      ),
    })),
  });
}

function resolveProjectOrganizations({
  input,
  organizations,
  publicOrganizations,
}: {
  input: Pick<
    CreateProjectInput,
    "ownerOrganizationSlugs" | "contact" | "attributions"
  >;
  organizations: readonly ProjectOrganization[];
  publicOrganizations: readonly ProjectOrganization[];
}) {
  const ownerOrganizations = input.ownerOrganizationSlugs.flatMap((slug) => {
    const organization = organizations.find(
      (item) => item.organizationSlug === slug,
    );
    return organization === undefined ? [] : [organization];
  });
  if (ownerOrganizations.length !== input.ownerOrganizationSlugs.length)
    return undefined;
  const referenceSlugs = new Set([
    ...input.ownerOrganizationSlugs,
    ...(input.contact?.organizationSlug === undefined
      ? []
      : [input.contact.organizationSlug]),
    ...input.attributions.flatMap((attribution) =>
      attribution.source === "organization"
        ? [attribution.organizationSlug]
        : [],
    ),
  ]);
  const referencedOrganizations = publicOrganizations.filter((organization) =>
    referenceSlugs.has(organization.organizationSlug),
  );
  if (referenceSlugs.size !== referencedOrganizations.length) return undefined;
  return { ownerOrganizations, referencedOrganizations };
}

function encodeBackgroundImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = projectHeaderBackgroundImageSrcSchema.safeParse(
        reader.result,
      );
      if (result.success) resolve(result.data);
      else reject(result.error);
    };
    reader.onerror = () => {
      reject(new Error("Could not read background image"));
    };
    reader.readAsDataURL(file);
  });
}

export function createMockProjectsApi({
  storage,
  now = () => new Date(),
  newId = () => crypto.randomUUID(),
  delayMs = 0,
  personalWorkspace,
}: {
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  now?: () => Date;
  newId?: () => string;
  delayMs?: number;
  personalWorkspace?: { organizationName: string; projectTitle: string };
}): { api: ProjectsApi; reset: () => ProjectWorkspaceSnapshot } {
  const mockResponse = createMockResponse({ delayMs });
  const personalOrganization = personalWorkspace
    ? projectOrganizationSchema.parse({
        organizationSlug: "personal-organization",
        name: personalWorkspace.organizationName,
        initials: "P",
      })
    : undefined;
  const organizations = personalOrganization
    ? [personalOrganization, ...fixtureOrganizations]
    : fixtureOrganizations;
  const publicOrganizations = [...organizations, publicOnlyOrganization];
  const empty = () =>
    storedProjectsSchema.parse({
      version: 3,
      bodyFormat: "html",
      projects: [],
    });
  const read = () => {
    const saved = storage.getItem(mockProjectsStorageKey);
    return saved === null ? empty() : decodeStoredProjects(JSON.parse(saved));
  };
  const write = (data: z.infer<typeof storedProjectsSchema>) => {
    // Persist before reporting success, including for quota-limited storage.
    storage.setItem(mockProjectsStorageKey, JSON.stringify(data));
  };
  const nextProjectId = (projects: readonly WorkspaceProject[]) =>
    projects.reduce((max, item) => Math.max(max, item.projectId), 0) + 1;
  const withDefaultProject = (stored: z.infer<typeof storedProjectsSchema>) => {
    if (
      !personalWorkspace ||
      !personalOrganization ||
      stored.defaultProjectSlug
    )
      return stored;

    const projectId = nextProjectId(stored.projects);
    const projectSlug = createProjectSlug({
      title: "My project",
      uniquePart: newId(),
    });
    const project = workspaceProjectSchema.parse({
      projectId,
      projectSlug,
      projectTitle: personalWorkspace.projectTitle,
      body: "",
      createdAt: now().toISOString(),
      ownerOrganizationSlugs: [personalOrganization.organizationSlug],
      ownerOrganizations: [personalOrganization],
      referencedOrganizations: [personalOrganization],
      authentication: "guest",
      emailUpdates: "off",
      languageSettings: {
        dynamicTranslationEnabled: false,
        targetLanguageCodes: [],
      },
      contentLocalizations: [],
    });
    return storedProjectsSchema.parse({
      ...stored,
      defaultProjectSlug: projectSlug,
      projects: [project, ...stored.projects],
    });
  };
  const replaceProject = ({
    stored,
    project,
  }: {
    stored: z.infer<typeof storedProjectsSchema>;
    project: WorkspaceProject;
  }) => {
    write({
      ...stored,
      projects: stored.projects.map((item) =>
        item.projectId === project.projectId ? project : item,
      ),
    });
    return project;
  };

  const api: ProjectsApi = {
    getCreationOptions() {
      return mockResponse(() => ({
        defaultOwnerOrganizationSlug: organizations.at(0)?.organizationSlug,
        organizations: z.array(projectOrganizationSchema).parse(organizations),
        publicOrganizations: z
          .array(projectOrganizationSchema)
          .parse(publicOrganizations),
      }));
    },
    loadWorkspace() {
      return mockResponse(() => {
        const stored = read();
        const provisioned = withDefaultProject(stored);
        if (provisioned !== stored) write(provisioned);
        const { projects, drafts, conversations } = provisioned;
        return { projects, drafts, conversations };
      });
    },
    create(rawInput) {
      return mockResponse((): CreateProjectResult => {
        const input = createProjectInputSchema.parse(rawInput);
        const stored = read();
        const { projects } = stored;
        if (
          projects.some((project) => project.projectSlug === input.projectSlug)
        ) {
          return { success: false, reason: "project_slug_already_exists" };
        }
        const affiliations = resolveProjectOrganizations({
          input,
          organizations,
          publicOrganizations,
        });
        if (affiliations === undefined) {
          return { success: false, reason: "organization_not_allowed" };
        }
        const project = workspaceProjectSchema.parse({
          ...input,
          projectId: nextProjectId(projects),
          createdAt: now().toISOString(),
          ...affiliations,
        });
        write({ ...stored, projects: [...projects, project] });
        return { success: true, project };
      });
    },
    updateProjectSettings(input) {
      return mockResponse(async () => {
        const background = projectHeaderBackgroundChangeSchema
          .optional()
          .parse(input.headerBackgroundChange);
        const uploadedImage =
          background?.kind === "upload"
            ? await encodeBackgroundImage(background.file)
            : undefined;
        // Read after encoding so we don't overwrite changes made during file I/O.
        const stored = read();
        const previous = stored.projects.find(
          (project) => project.projectSlug === input.projectSlug,
        );
        if (!previous) return undefined;
        const affiliations = resolveProjectOrganizations({
          input,
          organizations,
          publicOrganizations,
        });
        if (!affiliations) return undefined;
        const project = workspaceProjectSchema.parse({
          ...previous,
          projectTitle: input.projectTitle,
          body: input.body,
          authentication: input.authentication,
          emailUpdates: input.emailUpdates,
          contact: input.contact,
          ownerOrganizationSlugs: input.ownerOrganizationSlugs,
          languageSettings: input.languageSettings,
          contentLocalizations: input.contentLocalizations,
          attributions: input.attributions,
          headerBackgroundImageSrc:
            background === undefined
              ? previous.headerBackgroundImageSrc
              : uploadedImage,
          ...affiliations,
        });
        return replaceProject({ stored, project });
      });
    },
    setProjectDirectoryVisibility(input) {
      return mockResponse(() => {
        const { projectSlug, directoryVisibility } =
          setProjectDirectoryVisibilityInputSchema.parse(input);
        const stored = read();
        const previous = stored.projects.find(
          (project) => project.projectSlug === projectSlug,
        );
        if (!previous) return undefined;
        return replaceProject({
          stored,
          project: { ...previous, directoryVisibility },
        });
      });
    },
    createConversationDraft(input) {
      return mockResponse(() => {
        const target = projectConversationDraftInputSchema.parse(input);
        const stored = read();
        if (
          !stored.projects.some(
            (project) => project.projectSlug === target.projectSlug,
          )
        )
          return undefined;
        const draft = projectConversationDraftSchema.parse({
          ...target,
          id: newId(),
          createdAt: now().toISOString(),
        });
        if (
          stored.drafts.some(({ id }) => id === draft.id) ||
          stored.conversations.some(({ id }) => id === draft.id)
        )
          return undefined;
        write({ ...stored, drafts: [draft, ...stored.drafts] });
        return draft;
      });
    },
    publishConversationDraft({ projectSlug, draftId, setup }) {
      return mockResponse(() => {
        const stored = read();
        const draft = stored.drafts.find(({ id }) => id === draftId);
        if (
          draft?.projectSlug !== projectSlug ||
          draft.conversationType !== setup.conversationType
        )
          return undefined;
        const conversation: CreatedProjectConversation = {
          id: draft.id,
          projectSlug,
          createdAt: now().toISOString(),
          setup: conversationSetupSchema.parse(setup),
          revision: 0,
          status: "open",
        };
        // Replace in one write: validation or storage failure leaves the draft intact.
        write({
          ...stored,
          drafts: stored.drafts.filter(({ id }) => id !== draftId),
          conversations: [conversation, ...stored.conversations],
        });
        return conversation;
      });
    },
    updateCreatedConversation(input) {
      return mockResponse(() => {
        const { projectSlug, conversationId, expectedRevision, change } =
          updateCreatedConversationSchema.parse(input);
        const stored = read();
        const current = stored.conversations.find(
          (record) =>
            record.id === conversationId && record.projectSlug === projectSlug,
        );
        if (current?.revision !== expectedRevision) return undefined;
        if (change.kind === "status" && change.status === current.status)
          return current;
        if (
          change.kind === "setup" &&
          !canApplyPublishedSetup({ current, next: change.setup })
        )
          return undefined;
        const next = {
          ...current,
          ...(change.kind === "setup"
            ? { setup: change.setup }
            : { status: change.status }),
          revision: current.revision + 1,
        };
        write({
          ...stored,
          conversations: stored.conversations.map((record) =>
            record.id === current.id ? next : record,
          ),
        });
        return next;
      });
    },
  };
  return {
    api,
    reset: () => {
      const stored = withDefaultProject(empty());
      if (stored.defaultProjectSlug) write(stored);
      else storage.removeItem(mockProjectsStorageKey);
      return {
        projects: stored.projects,
        drafts: stored.drafts,
        conversations: stored.conversations,
      };
    },
  };
}
