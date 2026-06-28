<template>
  <Teleport v-if="isActive" to="#page-header">
    <StandardMenuBar :title="t('administrator')" :center-content="true" />
  </Teleport>

  <div class="container">
    <ZKCard padding="1rem" class="card-background">
      <div class="section-title">{{ t("basicsTitle") }}</div>

      <div class="form-grid">
        <q-input
          v-model="projectTitleInput"
          outlined
          :label="t('projectTitleLabel')"
          autocomplete="off"
          :maxlength="MAX_LENGTH_TITLE"
          data-1p-ignore
        />
        <q-input
          v-model="projectSlugInput"
          outlined
          :label="t('projectSlugLabel')"
          autocomplete="off"
          data-1p-ignore
          @update:model-value="hasEditedProjectSlug = true"
        />
        <q-select
          v-model="ownerOrganizationSlugs"
          outlined
          emit-value
          map-options
          multiple
          use-chips
          :label="t('ownerOrganizationsLabel')"
          :loading="isLoadingOrganizations"
          :disable="isLoadingOrganizations"
          :options="organizationOptions"
        />
        <q-input
          v-model="subtitleInput"
          outlined
          :maxlength="MAX_LENGTH_TITLE"
          :label="t('subtitleLabel')"
        />
        <q-input
          v-model="bodyTextInput"
          outlined
          autogrow
          :label="t('bodyLabel')"
        />
        <q-input
          v-model="heroImagePathInput"
          outlined
          :label="t('heroImagePathLabel')"
        />
        <q-checkbox
          v-model="heroImageIsFullPath"
          :label="t('heroImageIsFullPathLabel')"
        />
      </div>
    </ZKCard>

    <ZKCard padding="1rem" class="card-background">
      <div class="section-title">{{ t("attributionsTitle") }}</div>
      <div class="form-grid">
        <q-select
          v-model="attributionRole"
          outlined
          emit-value
          map-options
          :label="t('attributionRoleLabel')"
          :options="roleOptions"
        />
        <q-select
          v-model="attributionSource"
          outlined
          emit-value
          map-options
          :label="t('attributionSourceLabel')"
          :options="sourceOptions"
        />
        <q-select
          v-if="attributionSource === 'organization'"
          v-model="attributionOrganizationSlug"
          outlined
          emit-value
          map-options
          :label="t('realOrganizationLabel')"
          :loading="isLoadingOrganizations"
          :disable="isLoadingOrganizations"
          :options="organizationOptions"
        />
        <template v-else>
          <q-input
            v-model="externalDisplayNameInput"
            outlined
            :maxlength="MAX_LENGTH_NAME_CREATOR"
            :label="t('externalNameLabel')"
          />
          <q-input
            v-model="externalDescriptionInput"
            outlined
            autogrow
            :maxlength="MAX_LENGTH_DESCRIPTION_CREATOR"
            :label="t('externalDescriptionLabel')"
          />
          <q-input
            v-model="externalWebsiteUrlInput"
            outlined
            type="url"
            :label="t('externalWebsiteLabel')"
          />
          <q-input
            v-model="externalImagePathInput"
            outlined
            :label="t('externalImagePathLabel')"
          />
          <q-checkbox
            v-model="externalImageIsFullPath"
            :label="t('externalImageIsFullPathLabel')"
          />
        </template>
      </div>
      <q-btn
        class="section-action"
        color="primary"
        no-caps
        :disable="!canAddAttribution"
        :label="t('addAttributionButton')"
        @click="addAttribution"
      />

      <div v-if="attributions.length === 0" class="empty-state">
        {{ t("noAttributions") }}
      </div>
      <div v-else class="row-list">
        <div
          v-for="(attribution, index) in attributions"
          :key="`${index}-${getAttributionLabel(attribution)}`"
          class="summary-row"
        >
          <div>
            <div class="summary-title">{{ getRoleLabel(attribution.role) }}</div>
            <div class="summary-meta">{{ getAttributionLabel(attribution) }}</div>
          </div>
          <q-btn
            flat
            color="negative"
            no-caps
            :label="t('removeButton')"
            @click="removeAttribution(index)"
          />
        </div>
      </div>
    </ZKCard>

    <ZKCard padding="1rem" class="card-background">
      <div class="section-title">{{ t("contactTitle") }}</div>
      <div class="form-grid">
        <q-input
          v-model="contactNameInput"
          outlined
          :label="t('contactNameLabel')"
        />
        <q-input
          v-model="contactRoleInput"
          outlined
          :label="t('contactRoleLabel')"
        />
        <q-input
          v-model="contactEmailInput"
          outlined
          type="email"
          :label="t('contactEmailLabel')"
        />
        <q-select
          v-model="contactOrganizationSlug"
          outlined
          clearable
          emit-value
          map-options
          :label="t('contactOrganizationLabel')"
          :loading="isLoadingOrganizations"
          :disable="isLoadingOrganizations"
          :options="contactOrganizationOptions"
        />
      </div>
    </ZKCard>

    <q-btn
      color="primary"
      no-caps
      :label="t('createButton')"
      :disable="!canCreateProject"
      :loading="isCreating"
      @click="submitProject"
    />
  </div>
</template>

<script setup lang="ts">
import { StandardMenuBar } from "src/components/navigation/header/variants";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  MAX_LENGTH_DESCRIPTION_CREATOR,
  MAX_LENGTH_NAME_CREATOR,
  MAX_LENGTH_TITLE,
} from "src/shared/shared";
import type {
  CreateProjectAttributionRequest,
  CreateProjectRequest,
} from "src/shared/types/dto";
import type { OrganizationProperties } from "src/shared/types/zod";
import {
  zodProjectOrganizationAttributionRole,
  zodProjectSlug,
} from "src/shared/types/zod";
import { zodEmail } from "src/shared/types/zod-email";
import {
  createRandomOrganizationSlugFallback,
  slugifyOrganizationDisplayName,
} from "src/shared-app-api/organizationSlug";
import { useLanguageStore } from "src/stores/language";
import { useBackendAdministratorOrganizationApi } from "src/utils/api/administrator/organization";
import { useBackendAdministratorProjectApi } from "src/utils/api/administrator/project";
import { computed, onMounted, type Ref, ref, watch, type WritableComputedRef } from "vue";

import {
  type AdministratorProjectTranslations,
  administratorProjectTranslations,
} from "./index.i18n";

type AttributionRole = CreateProjectAttributionRequest["role"];
type AttributionSource = CreateProjectAttributionRequest["source"];

interface SelectOption<T extends string> {
  label: string;
  value: T;
}

const { isActive } = usePageLayout({ reducedWidth: true });
const { t } = useComponentI18n<AdministratorProjectTranslations>(
  administratorProjectTranslations
);
const { getAllOrganizations } = useBackendAdministratorOrganizationApi();
const { createProject } = useBackendAdministratorProjectApi();
const languageStore = useLanguageStore();

const organizationList = ref<OrganizationProperties[]>([]);
const isLoadingOrganizations = ref(false);
const projectTitle = ref("");
const projectSlug = ref("");
const hasEditedProjectSlug = ref(false);
const fallbackProjectSlug = ref(createRandomOrganizationSlugFallback());
const ownerOrganizationSlugs = ref<string[]>([]);
const subtitle = ref("");
const bodyText = ref("");
const heroImagePath = ref("");
const heroImageIsFullPath = ref(false);
const attributionRole = ref<AttributionRole>("sponsor");
const attributionSource = ref<AttributionSource>("organization");
const attributionOrganizationSlug = ref<string | null>(null);
const externalDisplayName = ref("");
const externalDescription = ref("");
const externalWebsiteUrl = ref("");
const externalImagePath = ref("");
const externalImageIsFullPath = ref(false);
const attributions = ref<CreateProjectAttributionRequest[]>([]);
const contactName = ref("");
const contactRole = ref("");
const contactEmail = ref("");
const contactOrganizationSlug = ref<string | null>(null);
const isCreating = ref(false);

const projectTitleInput = stringInputModel(projectTitle);
const projectSlugInput = stringInputModel(projectSlug);
const subtitleInput = stringInputModel(subtitle);
const bodyTextInput = stringInputModel(bodyText);
const heroImagePathInput = stringInputModel(heroImagePath);
const externalDisplayNameInput = stringInputModel(externalDisplayName);
const externalDescriptionInput = stringInputModel(externalDescription);
const externalWebsiteUrlInput = stringInputModel(externalWebsiteUrl);
const externalImagePathInput = stringInputModel(externalImagePath);
const contactNameInput = stringInputModel(contactName);
const contactRoleInput = stringInputModel(contactRole);
const contactEmailInput = stringInputModel(contactEmail);

const roleLabels: Record<AttributionRole, () => string> = {
  project_owner: () => t("projectOwnerRole"),
  sponsor: () => t("sponsorRole"),
  partner: () => t("partnerRole"),
};

const organizationOptions = computed<Array<SelectOption<string>>>(() =>
  organizationList.value.map((organization) => ({
    label: `${organization.name} (${organization.slug})`,
    value: organization.slug,
  }))
);

const organizationsBySlug = computed(
  () =>
    new Map(
      organizationList.value.map((organization) => [organization.slug, organization])
    )
);

const contactOrganizationOptions = computed<Array<SelectOption<string>>>(() => [
  ...organizationOptions.value,
]);

const roleOptions = computed<Array<SelectOption<AttributionRole>>>(() =>
  zodProjectOrganizationAttributionRole.options.map((role) => ({
    label: getRoleLabel(role),
    value: role,
  }))
);

const sourceOptions = computed<Array<SelectOption<AttributionSource>>>(() => [
  { label: t("realOrganizationSource"), value: "organization" },
  { label: t("externalOrganizationSource"), value: "external" },
]);

const canAddAttribution = computed(() => {
  if (attributionSource.value === "organization") {
    return (
      attributionOrganizationSlug.value !== null &&
      !hasRealAttribution({
        role: attributionRole.value,
        organizationSlug: attributionOrganizationSlug.value,
      })
    );
  }

  return (
    externalDisplayName.value.trim() !== "" &&
    isOptionalUrlValid(externalWebsiteUrl.value)
  );
});

const hasContactInput = computed(
  () =>
    contactName.value.trim() !== "" ||
    contactRole.value.trim() !== "" ||
    contactEmail.value.trim() !== "" ||
    contactOrganizationSlug.value !== null
);

const hasValidContact = computed(() => {
  if (!hasContactInput.value) {
    return true;
  }

  return (
    contactName.value.trim() !== "" &&
    zodEmail.safeParse(contactEmail.value.trim()).success
  );
});

const canCreateProject = computed(
  () =>
    !isLoadingOrganizations.value &&
    !isCreating.value &&
    projectTitle.value.trim() !== "" &&
    zodProjectSlug.safeParse(projectSlug.value.trim()).success &&
    ownerOrganizationSlugs.value.length > 0 &&
    hasValidContact.value
);

watch(projectTitle, (title) => {
  if (!hasEditedProjectSlug.value) {
    projectSlug.value =
      slugifyOrganizationDisplayName(title) ?? fallbackProjectSlug.value;
  }
});

onMounted(async () => {
  isLoadingOrganizations.value = true;
  try {
    organizationList.value = await getAllOrganizations();
  } finally {
    isLoadingOrganizations.value = false;
  }
});

function optionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function stringInputModel(
  source: Ref<string>
): WritableComputedRef<string | number | null> {
  return computed({
    get: () => source.value,
    set: (value) => {
      source.value = String(value ?? "");
    },
  });
}

function isOptionalUrlValid(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") {
    return true;
  }

  try {
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function plainTextToHtml(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed === "") {
    return undefined;
  }

  return trimmed
    .split(/\n{2,}/u)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
    .join("");
}

function getRoleLabel(role: AttributionRole): string {
  return roleLabels[role]();
}

function getAttributionLabel(attribution: CreateProjectAttributionRequest): string {
  if (attribution.source === "organization") {
    const organization = organizationsBySlug.value.get(attribution.organizationSlug);
    return organization?.name ?? attribution.organizationSlug;
  }

  return attribution.displayName;
}

function hasRealAttribution({
  role,
  organizationSlug,
}: {
  role: AttributionRole;
  organizationSlug: string;
}): boolean {
  return attributions.value.some(
    (attribution) =>
      attribution.source === "organization" &&
      attribution.role === role &&
      attribution.organizationSlug === organizationSlug
  );
}

function addAttribution(): void {
  if (!canAddAttribution.value) {
    return;
  }

  const role = zodProjectOrganizationAttributionRole.parse(attributionRole.value);
  if (attributionSource.value === "organization") {
    if (attributionOrganizationSlug.value === null) {
      return;
    }

    attributions.value.push({
      source: "organization",
      role,
      organizationSlug: attributionOrganizationSlug.value,
    });
    attributionOrganizationSlug.value = null;
    return;
  }

  attributions.value.push({
    source: "external",
    role,
    defaultLanguageCode: languageStore.displayLanguage,
    displayName: externalDisplayName.value.trim(),
    description: optionalString(externalDescription.value),
    imagePath: optionalString(externalImagePath.value),
    isFullImagePath: externalImageIsFullPath.value,
    websiteUrl: optionalString(externalWebsiteUrl.value),
  });
  externalDisplayName.value = "";
  externalDescription.value = "";
  externalWebsiteUrl.value = "";
  externalImagePath.value = "";
  externalImageIsFullPath.value = false;
}

function removeAttribution(index: number): void {
  attributions.value.splice(index, 1);
}

function buildCreateRequest(): CreateProjectRequest {
  const bodyPlainText = optionalString(bodyText.value);
  return {
    projectSlug: projectSlug.value.trim(),
    projectTitle: projectTitle.value.trim(),
    defaultLanguageCode: languageStore.displayLanguage,
    ownerOrganizationSlugs: ownerOrganizationSlugs.value,
    subtitle: optionalString(subtitle.value),
    body: plainTextToHtml(bodyText.value),
    bodyPlainText,
    heroImagePath: optionalString(heroImagePath.value),
    heroImageIsFullPath: heroImageIsFullPath.value,
    attributions: attributions.value,
    contact: hasContactInput.value
      ? {
          name: contactName.value.trim(),
          roleLabel: optionalString(contactRole.value),
          email: contactEmail.value.trim(),
          organizationSlug: contactOrganizationSlug.value ?? undefined,
        }
      : undefined,
  };
}

function resetForm(): void {
  const nextFallbackProjectSlug = createRandomOrganizationSlugFallback();
  fallbackProjectSlug.value = nextFallbackProjectSlug;
  projectTitle.value = "";
  projectSlug.value = nextFallbackProjectSlug;
  hasEditedProjectSlug.value = false;
  ownerOrganizationSlugs.value = [];
  subtitle.value = "";
  bodyText.value = "";
  heroImagePath.value = "";
  heroImageIsFullPath.value = false;
  attributions.value = [];
  attributionRole.value = "sponsor";
  attributionSource.value = "organization";
  attributionOrganizationSlug.value = null;
  externalDisplayName.value = "";
  externalDescription.value = "";
  externalWebsiteUrl.value = "";
  externalImagePath.value = "";
  externalImageIsFullPath.value = false;
  contactName.value = "";
  contactRole.value = "";
  contactEmail.value = "";
  contactOrganizationSlug.value = null;
}

async function submitProject(): Promise<void> {
  if (!canCreateProject.value) {
    return;
  }

  isCreating.value = true;
  try {
    const wasCreated = await createProject(buildCreateRequest());
    if (wasCreated) {
      resetForm();
    }
  } finally {
    isCreating.value = false;
  }
}
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-background {
  background-color: white;
}

.section-title {
  margin-bottom: 1rem;
  font-size: 1.1rem;
  font-weight: 700;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 1rem;
}

.section-action {
  margin-top: 1rem;
}

.empty-state {
  margin-top: 1rem;
  color: #6d6a74;
}

.row-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem;
  border: 1px solid #e9e9f1;
  border-radius: 0.75rem;
}

.summary-title {
  font-weight: 700;
}

.summary-meta {
  color: #6d6a74;
  font-size: 0.9rem;
}
</style>
