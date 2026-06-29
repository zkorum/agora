<template>
  <Teleport v-if="isActive" to="#page-header">
    <StandardMenuBar :title="t('administrator')" :center-content="true" />
  </Teleport>

  <div class="container">
    <q-tabs
      v-model="activeTab"
      class="admin-tabs"
      align="justify"
      active-color="primary"
      indicator-color="primary"
    >
      <q-tab name="create" :label="t('createTab')" />
      <q-tab name="manage" :label="t('manageTab')" />
    </q-tabs>

    <template v-if="activeTab === 'create'">
      <ZKCard padding="1rem" class="card-background">
      <div class="section-title">{{ t("basicsTitle") }}</div>
      <p class="section-description">{{ t("basicsDescription") }}</p>

      <div class="form-grid">
        <q-input
          v-model="projectTitleInput"
          outlined
          :label="requiredLabel(t('projectTitleLabel'))"
          autocomplete="off"
          :maxlength="MAX_LENGTH_TITLE"
          data-1p-ignore
        />
        <q-input
          v-model="projectSlugInput"
          outlined
          :label="requiredLabel(t('projectSlugLabel'))"
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
          :label="requiredLabel(t('ownerOrganizationsLabel'))"
          :loading="isLoadingOrganizations"
          :disable="isLoadingOrganizations"
          :options="organizationOptions"
        />
        <q-input
          v-model="subtitleInput"
          outlined
          :maxlength="MAX_LENGTH_TITLE"
          :label="optionalLabel(t('subtitleLabel'))"
        />
        <q-input
          v-model="bodyTextInput"
          outlined
          autogrow
          :label="optionalLabel(t('bodyLabel'))"
        />
        <q-input
          v-model="heroImagePathInput"
          outlined
          :label="optionalLabel(t('heroImagePathLabel'))"
        />
        <q-checkbox
          v-model="heroImageIsFullPath"
          :label="t('heroImageIsFullPathLabel')"
        />
        <ConversationLanguageSettingsRow
          class="grid-full language-settings-card"
          :title="t('projectLanguageSettingsLabel')"
          :value="createProjectLanguageSummary"
          :description="t('projectLanguageSettingsDescription')"
          :icon="forwardIcon"
          :disabled="false"
          :clickable="true"
          @click="showCreateLanguageSettingDialog = true"
        />
      </div>
      </ZKCard>

      <ZKCard padding="1rem" class="card-background">
      <div class="section-title">{{ t("attributionsTitle") }}</div>
      <p class="section-description">{{ t("attributionsDescription") }}</p>
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
          <q-select
            v-model="externalDefaultLanguage"
            outlined
            emit-value
            map-options
            :label="requiredLabel(t('externalLanguageLabel'))"
            :hint="t('externalLanguageHint')"
            :options="displayLanguageOptions"
          />
          <q-input
            v-model="externalDisplayNameInput"
            outlined
            :maxlength="MAX_LENGTH_NAME_CREATOR"
            :label="requiredLabel(t('externalNameLabel'))"
          />
          <q-input
            v-model="externalDescriptionInput"
            outlined
            autogrow
            :maxlength="MAX_LENGTH_DESCRIPTION_CREATOR"
            :label="optionalLabel(t('externalDescriptionLabel'))"
          />
          <q-input
            v-model="externalWebsiteUrlInput"
            outlined
            type="url"
            :label="optionalLabel(t('externalWebsiteLabel'))"
          />
          <q-input
            v-model="externalImagePathInput"
            outlined
            :label="optionalLabel(t('externalImagePathLabel'))"
          />
          <q-checkbox
            v-model="externalImageIsFullPath"
            :label="t('externalImageIsFullPathLabel')"
          />
          <q-expansion-item
            class="grid-full language-expansion"
            :label="t('additionalLanguagesTitle')"
            dense-toggle
          >
            <div class="nested-form">
              <div class="form-grid">
                <q-select
                  v-model="externalLocalizationLanguage"
                  outlined
                  emit-value
                  map-options
                  :label="requiredLabel(t('externalLanguageLabel'))"
                  :options="availableExternalLocalizationLanguageOptions"
                />
                <q-input
                  v-model="externalLocalizationDisplayNameInput"
                  outlined
                  :maxlength="MAX_LENGTH_NAME_CREATOR"
                  :label="requiredLabel(t('externalNameLabel'))"
                />
                <q-input
                  v-model="externalLocalizationDescriptionInput"
                  outlined
                  autogrow
                  :maxlength="MAX_LENGTH_DESCRIPTION_CREATOR"
                  :label="optionalLabel(t('externalDescriptionLabel'))"
                />
                <q-input
                  v-model="externalLocalizationWebsiteUrlInput"
                  outlined
                  type="url"
                  :label="optionalLabel(t('externalWebsiteLabel'))"
                />
                <q-input
                  v-model="externalLocalizationImagePathInput"
                  outlined
                  :label="optionalLabel(t('externalImagePathLabel'))"
                />
                <q-checkbox
                  v-model="externalLocalizationImageIsFullPath"
                  :label="t('externalImageIsFullPathLabel')"
                />
              </div>
              <q-btn
                class="section-action"
                no-caps
                outline
                color="primary"
                :disable="!canAddExternalLocalization"
                :label="t('addLanguageButton')"
                @click="addExternalLocalization"
              />
              <div v-if="externalLocalizations.length > 0" class="row-list compact-list">
                <div
                  v-for="(localization, index) in externalLocalizations"
                  :key="localization.languageCode"
                  class="summary-row"
                >
                  <div>
                    <div class="summary-title">
                      {{ getLanguageLabel(localization.languageCode) }}
                    </div>
                    <div class="summary-meta">{{ localization.displayName }}</div>
                  </div>
                  <q-btn
                    flat
                    color="negative"
                    no-caps
                    :label="t('removeButton')"
                    @click="removeExternalLocalization(index)"
                  />
                </div>
              </div>
            </div>
          </q-expansion-item>
        </template>
      </div>
      <q-btn
        class="section-action"
        color="primary"
        outline
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
      <p class="section-description">{{ t("contactDescription") }}</p>
      <div class="form-grid">
        <q-input
          v-model="contactNameInput"
          outlined
          :label="contactRequiredLabel(t('contactNameLabel'))"
        />
        <q-input
          v-model="contactRoleInput"
          outlined
          :label="optionalLabel(t('contactRoleLabel'))"
        />
        <q-input
          v-model="contactEmailInput"
          outlined
          type="email"
          :label="contactRequiredLabel(t('contactEmailLabel'))"
        />
        <q-select
          v-model="contactOrganizationSlug"
          outlined
          clearable
          emit-value
          map-options
          :label="optionalLabel(t('contactOrganizationLabel'))"
          :loading="isLoadingOrganizations"
          :disable="isLoadingOrganizations"
          :options="contactOrganizationOptions"
        />
      </div>
      </ZKCard>

      <q-btn
        class="create-button"
        color="primary"
        no-caps
        :label="t('createButton')"
        :disable="!canCreateProject"
        :loading="isCreating"
        @click="submitProject"
      />
    </template>

    <template v-else>
      <ZKCard padding="1rem" class="card-background">
        <AdminSectionHeader
          :title="t('manageTitle')"
          :description="t('manageDescription')"
        />
        <div class="form-grid">
          <q-select
            v-model="selectedProjectSlug"
            outlined
            emit-value
            map-options
            :label="t('selectProjectLabel')"
            :loading="isLoadingProjects"
            :disable="isLoadingProjects"
            :options="projectOptions"
          />
        </div>
        <p v-if="selectedProject === undefined" class="empty-state">
          {{ t("noProjectsMessage") }}
        </p>
      </ZKCard>

      <template v-if="selectedProject !== undefined">
        <ZKCard padding="1rem" class="card-background">
          <AdminSectionHeader
            :title="t('basicsTitle')"
            :description="t('basicsDescription')"
          />
          <div class="form-grid">
            <q-input
              v-model="manageProjectTitleInput"
              outlined
              :label="requiredLabel(t('projectTitleLabel'))"
              autocomplete="off"
              :maxlength="MAX_LENGTH_TITLE"
              data-1p-ignore
            />
          <q-input
            v-model="selectedProjectSlugDraftInput"
            outlined
              :label="requiredLabel(t('projectSlugLabel'))"
            autocomplete="off"
            data-1p-ignore
          />
            <q-select
              v-model="manageOwnerOrganizationSlugs"
              outlined
              emit-value
              map-options
              multiple
              use-chips
              :label="requiredLabel(t('ownerOrganizationsLabel'))"
              :loading="isLoadingOrganizations"
              :disable="isLoadingOrganizations"
              :options="organizationOptions"
            />
            <q-input
              v-model="manageSubtitleInput"
              outlined
              :maxlength="MAX_LENGTH_TITLE"
              :label="optionalLabel(t('subtitleLabel'))"
            />
            <q-input
              v-model="manageBodyTextInput"
              outlined
              autogrow
              :label="optionalLabel(t('bodyLabel'))"
            />
            <q-input
              v-model="manageHeroImagePathInput"
              outlined
              :label="optionalLabel(t('heroImagePathLabel'))"
            />
            <q-checkbox
              v-model="manageHeroImageIsFullPath"
              :label="t('heroImageIsFullPathLabel')"
            />
          <ConversationLanguageSettingsRow
            class="grid-full language-settings-card"
            :title="t('projectLanguageSettingsLabel')"
            :value="manageProjectLanguageSummary"
            :description="t('projectLanguageSettingsDescription')"
            :icon="forwardIcon"
            :disabled="false"
            :clickable="true"
            @click="showManageLanguageSettingDialog = true"
          />
        </div>
        </ZKCard>

        <ZKCard padding="1rem" class="card-background">
          <AdminSectionHeader
            :title="t('attributionsTitle')"
            :description="t('attributionsDescription')"
          />
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
              <q-select
                v-model="externalDefaultLanguage"
                outlined
                emit-value
                map-options
                :label="requiredLabel(t('externalLanguageLabel'))"
                :hint="t('externalLanguageHint')"
                :options="displayLanguageOptions"
              />
              <q-input
                v-model="externalDisplayNameInput"
                outlined
                :maxlength="MAX_LENGTH_NAME_CREATOR"
                :label="requiredLabel(t('externalNameLabel'))"
              />
              <q-input
                v-model="externalDescriptionInput"
                outlined
                autogrow
                :maxlength="MAX_LENGTH_DESCRIPTION_CREATOR"
                :label="optionalLabel(t('externalDescriptionLabel'))"
              />
              <q-input
                v-model="externalWebsiteUrlInput"
                outlined
                type="url"
                :label="optionalLabel(t('externalWebsiteLabel'))"
              />
              <q-input
                v-model="externalImagePathInput"
                outlined
                :label="optionalLabel(t('externalImagePathLabel'))"
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
            outline
            no-caps
            :disable="!canAddManageAttribution"
            :label="t('addAttributionButton')"
            @click="addManageAttribution"
          />
          <div v-if="manageAttributions.length === 0" class="empty-state">
            {{ t("noAttributions") }}
          </div>
          <div v-else class="row-list">
            <div
              v-for="(attribution, index) in manageAttributions"
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
                @click="removeManageAttribution(index)"
              />
            </div>
          </div>
        </ZKCard>

        <ZKCard padding="1rem" class="card-background">
          <AdminSectionHeader
            :title="t('contactTitle')"
            :description="t('contactDescription')"
          />
          <div class="form-grid">
            <q-input
              v-model="manageContactNameInput"
              outlined
              :label="
                hasManageContactInput
                  ? requiredLabel(t('contactNameLabel'))
                  : optionalLabel(t('contactNameLabel'))
              "
            />
            <q-input
              v-model="manageContactRoleInput"
              outlined
              :label="optionalLabel(t('contactRoleLabel'))"
            />
            <q-input
              v-model="manageContactEmailInput"
              outlined
              type="email"
              :label="
                hasManageContactInput
                  ? requiredLabel(t('contactEmailLabel'))
                  : optionalLabel(t('contactEmailLabel'))
              "
            />
            <q-select
              v-model="manageContactOrganizationSlug"
              outlined
              clearable
              emit-value
              map-options
              :label="optionalLabel(t('contactOrganizationLabel'))"
              :loading="isLoadingOrganizations"
              :disable="isLoadingOrganizations"
              :options="contactOrganizationOptions"
            />
          </div>
        </ZKCard>

        <div class="action-row">
          <q-btn
            color="primary"
            no-caps
            :label="t('saveProjectButton')"
            :disable="!canSaveProject"
            :loading="isSavingProject"
            @click="requestSaveSelectedProject"
          />
          <q-btn
            color="negative"
            outline
            no-caps
            :label="t('archiveProjectButton')"
            :loading="isArchivingProject"
            @click="showProjectArchiveConfirmDialog = true"
          />
        </div>
      </template>
    </template>

    <ConversationLanguageSettingDialog
      v-model:show-dialog="showCreateLanguageSettingDialog"
      v-model:language-setting="createLanguageSetting"
      v-model:multilingual-setting="createMultilingualSetting"
      :can-use-dynamic-translation="true"
      :show-auto-language="false"
    />

    <ConversationLanguageSettingDialog
      v-model:show-dialog="showManageLanguageSettingDialog"
      v-model:language-setting="manageLanguageSetting"
      v-model:multilingual-setting="manageMultilingualSetting"
      :can-use-dynamic-translation="true"
      :show-auto-language="false"
    />

    <q-dialog v-model="showProjectSlugConfirmDialog">
      <q-card class="slug-dialog">
        <q-card-section>
          <div class="dialog-title">{{ t("slugWarningTitle") }}</div>
          <p>{{ t("slugWarningDescription") }}</p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            flat
            no-caps
            :label="t('cancelButton')"
            @click="showProjectSlugConfirmDialog = false"
          />
          <q-btn
            color="primary"
            no-caps
            :label="t('confirmSlugChangeButton')"
            :loading="isSavingProject"
            :disable="!canSaveProject"
            @click="saveSelectedProject"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showProjectArchiveConfirmDialog">
      <q-card class="slug-dialog">
        <q-card-section>
          <div class="dialog-title">{{ t("archiveProjectTitle") }}</div>
          <p>{{ t("archiveProjectDescription") }}</p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            flat
            no-caps
            :label="t('cancelButton')"
            @click="showProjectArchiveConfirmDialog = false"
          />
          <q-btn
            color="negative"
            no-caps
            :label="t('confirmArchiveProjectButton')"
            :loading="isArchivingProject"
            :disable="selectedProject === undefined"
            @click="archiveSelectedProject"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
import AdminSectionHeader from "src/components/administrator/AdminSectionHeader.vue";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import ConversationLanguageSettingDialog from "src/components/newConversation/dialog/ConversationLanguageSettingDialog.vue";
import ConversationLanguageSettingsRow from "src/components/newConversation/dialog/ConversationLanguageSettingsRow.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import {
  MAX_LENGTH_DESCRIPTION_CREATOR,
  MAX_LENGTH_NAME_CREATOR,
  MAX_LENGTH_TITLE,
} from "src/shared/shared";
import type {
  AdminProject,
  CreateProjectAttributionRequest,
  CreateProjectRequest,
  UpdateProjectRequest,
} from "src/shared/types/dto";
import type {
  ConversationLanguageSettingInput,
  ConversationMultilingualSetting,
  OrganizationProperties,
} from "src/shared/types/zod";
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

import { displayLanguageOptions } from "../organization/organizationAdminForm";
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

type ExternalLocalization = Extract<
  CreateProjectAttributionRequest,
  { source: "external" }
>["additionalLocalizations"][number];

const { isActive } = usePageLayout({ reducedWidth: true });
const { t } = useComponentI18n<AdministratorProjectTranslations>(
  administratorProjectTranslations
);
const { getAllOrganizations } = useBackendAdministratorOrganizationApi();
const {
  archiveProject,
  createProject,
  getAllProjects,
  updateProject,
} = useBackendAdministratorProjectApi();
const languageStore = useLanguageStore();
const $q = useQuasar();

const organizationList = ref<OrganizationProperties[]>([]);
const projectList = ref<AdminProject[]>([]);
const isLoadingOrganizations = ref(false);
const isLoadingProjects = ref(false);
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
const externalDefaultLanguage = ref<SupportedDisplayLanguageCodes>(
  languageStore.displayLanguage
);
const externalDisplayName = ref("");
const externalDescription = ref("");
const externalWebsiteUrl = ref("");
const externalImagePath = ref("");
const externalImageIsFullPath = ref(false);
const externalLocalizationLanguage = ref<SupportedDisplayLanguageCodes>(
  languageStore.displayLanguage
);
const externalLocalizationDisplayName = ref("");
const externalLocalizationDescription = ref("");
const externalLocalizationWebsiteUrl = ref("");
const externalLocalizationImagePath = ref("");
const externalLocalizationImageIsFullPath = ref(false);
const externalLocalizations = ref<ExternalLocalization[]>([]);
const attributions = ref<CreateProjectAttributionRequest[]>([]);
const dismissedOwnerAttributionSlugs = ref<Set<string>>(new Set());
const contactName = ref("");
const contactRole = ref("");
const contactEmail = ref("");
const contactOrganizationSlug = ref<string | null>(null);
const isCreating = ref(false);
const isArchivingProject = ref(false);
const activeTab = ref<"create" | "manage">("create");
const selectedProjectSlug = ref<string | undefined>(undefined);
const selectedProjectSlugDraft = ref("");
const manageProjectTitle = ref("");
const manageOwnerOrganizationSlugs = ref<string[]>([]);
const manageSubtitle = ref("");
const manageBodyText = ref("");
const manageHeroImagePath = ref("");
const manageHeroImageIsFullPath = ref(false);
const manageAttributions = ref<CreateProjectAttributionRequest[]>([]);
const manageDismissedOwnerAttributionSlugs = ref<Set<string>>(new Set());
const manageContactName = ref("");
const manageContactRole = ref("");
const manageContactEmail = ref("");
const manageContactOrganizationSlug = ref<string | null>(null);
const isSavingProject = ref(false);
let isPopulatingManageProject = false;
const showCreateLanguageSettingDialog = ref(false);
const showManageLanguageSettingDialog = ref(false);
const showProjectSlugConfirmDialog = ref(false);
const showProjectArchiveConfirmDialog = ref(false);
const createLanguageSetting = ref<ConversationLanguageSettingInput>({ mode: "auto" });
const manageLanguageSetting = ref<ConversationLanguageSettingInput>({ mode: "auto" });
const createMultilingualSetting = ref<ConversationMultilingualSetting>({
  additionalLanguageCodes: [],
  dynamicTranslationEnabled: false,
});
const manageMultilingualSetting = ref<ConversationMultilingualSetting>({
  additionalLanguageCodes: [],
  dynamicTranslationEnabled: false,
});
const projectTitleInput = stringInputModel(projectTitle);
const projectSlugInput = stringInputModel(projectSlug);
const selectedProjectSlugDraftInput = stringInputModel(selectedProjectSlugDraft);
const manageProjectTitleInput = stringInputModel(manageProjectTitle);
const manageSubtitleInput = stringInputModel(manageSubtitle);
const manageBodyTextInput = stringInputModel(manageBodyText);
const manageHeroImagePathInput = stringInputModel(manageHeroImagePath);
const subtitleInput = stringInputModel(subtitle);
const bodyTextInput = stringInputModel(bodyText);
const heroImagePathInput = stringInputModel(heroImagePath);
const externalDisplayNameInput = stringInputModel(externalDisplayName);
const externalDescriptionInput = stringInputModel(externalDescription);
const externalWebsiteUrlInput = stringInputModel(externalWebsiteUrl);
const externalImagePathInput = stringInputModel(externalImagePath);
const externalLocalizationDisplayNameInput = stringInputModel(
  externalLocalizationDisplayName
);
const externalLocalizationDescriptionInput = stringInputModel(
  externalLocalizationDescription
);
const externalLocalizationWebsiteUrlInput = stringInputModel(
  externalLocalizationWebsiteUrl
);
const externalLocalizationImagePathInput = stringInputModel(
  externalLocalizationImagePath
);
const contactNameInput = stringInputModel(contactName);
const contactRoleInput = stringInputModel(contactRole);
const contactEmailInput = stringInputModel(contactEmail);
const manageContactNameInput = stringInputModel(manageContactName);
const manageContactRoleInput = stringInputModel(manageContactRole);
const manageContactEmailInput = stringInputModel(manageContactEmail);

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

const projectOptions = computed<Array<SelectOption<string>>>(() =>
  projectList.value.map((project) => ({
    label: `${project.projectTitle} (${project.projectSlug})`,
    value: project.projectSlug,
  }))
);

const selectedProject = computed(() =>
  projectList.value.find((project) => project.projectSlug === selectedProjectSlug.value)
);

const forwardIcon = computed(() =>
  $q.lang.rtl ? "mdi-chevron-left" : "mdi-chevron-right"
);

const createProjectLanguageSummary = computed(() =>
  getLanguageSettingSummary(createMultilingualSetting.value)
);

const manageProjectLanguageSummary = computed(() =>
  getLanguageSettingSummary(manageMultilingualSetting.value)
);

const externalLocalizationLanguageCodes = computed(
  () => new Set(externalLocalizations.value.map((localization) => localization.languageCode))
);

const availableExternalLocalizationLanguageOptions = computed(() =>
  displayLanguageOptions.filter(
    (option) =>
      option.value !== externalDefaultLanguage.value &&
      !externalLocalizationLanguageCodes.value.has(option.value)
  )
);

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

const canAddManageAttribution = computed(() => {
  if (attributionSource.value === "organization") {
    return (
      attributionOrganizationSlug.value !== null &&
      !hasRealManageAttribution({
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

const canAddExternalLocalization = computed(
  () =>
    externalLocalizationLanguage.value !== externalDefaultLanguage.value &&
    !externalLocalizationLanguageCodes.value.has(externalLocalizationLanguage.value) &&
    externalLocalizationDisplayName.value.trim() !== "" &&
    isOptionalUrlValid(externalLocalizationWebsiteUrl.value)
);

const hasContactInput = computed(
  () =>
    contactName.value.trim() !== "" ||
    contactRole.value.trim() !== "" ||
    contactEmail.value.trim() !== "" ||
    contactOrganizationSlug.value !== null
);

const hasManageContactInput = computed(
  () =>
    manageContactName.value.trim() !== "" ||
    manageContactRole.value.trim() !== "" ||
    manageContactEmail.value.trim() !== "" ||
    manageContactOrganizationSlug.value !== null
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

const hasValidManageContact = computed(() => {
  if (!hasManageContactInput.value) {
    return true;
  }

  return (
    manageContactName.value.trim() !== "" &&
    zodEmail.safeParse(manageContactEmail.value.trim()).success
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

const canSaveProject = computed(
  () =>
    selectedProject.value !== undefined &&
    !isSavingProject.value &&
    manageProjectTitle.value.trim() !== "" &&
    zodProjectSlug.safeParse(selectedProjectSlugDraft.value.trim()).success &&
    manageOwnerOrganizationSlugs.value.length > 0 &&
    hasValidManageContact.value
);

watch(projectTitle, (title) => {
  if (!hasEditedProjectSlug.value) {
    projectSlug.value =
      slugifyOrganizationDisplayName(title) ?? fallbackProjectSlug.value;
  }
});

watch(externalDefaultLanguage, () => {
  externalLocalizations.value = externalLocalizations.value.filter(
    (localization) => localization.languageCode !== externalDefaultLanguage.value
  );
  selectFirstAvailableExternalLocalizationLanguage();
});

watch(ownerOrganizationSlugs, (selectedSlugs, previousSlugs) => {
  const selectedSlugSet = new Set(selectedSlugs);
  const previousSlugSet = new Set(previousSlugs ?? []);

  for (const previousSlug of previousSlugSet) {
    if (!selectedSlugSet.has(previousSlug)) {
      dismissedOwnerAttributionSlugs.value.delete(previousSlug);
    }
  }

  for (const ownerOrganizationSlug of selectedSlugs) {
    if (
      !dismissedOwnerAttributionSlugs.value.has(ownerOrganizationSlug) &&
      !hasRealAttribution({
        role: "project_owner",
        organizationSlug: ownerOrganizationSlug,
      })
    ) {
      attributions.value.push({
        source: "organization",
        role: "project_owner",
        organizationSlug: ownerOrganizationSlug,
      });
    }
  }
});

watch(
  manageOwnerOrganizationSlugs,
  (selectedSlugs, previousSlugs) => {
    if (isPopulatingManageProject) {
      return;
    }

    const selectedSlugSet = new Set(selectedSlugs);
    const previousSlugSet = new Set(previousSlugs ?? []);

    for (const previousSlug of previousSlugSet) {
      if (!selectedSlugSet.has(previousSlug)) {
        manageDismissedOwnerAttributionSlugs.value.delete(previousSlug);
      }
    }

    for (const ownerOrganizationSlug of selectedSlugs) {
      if (
        !manageDismissedOwnerAttributionSlugs.value.has(ownerOrganizationSlug) &&
        !hasRealManageAttribution({
          role: "project_owner",
          organizationSlug: ownerOrganizationSlug,
        })
      ) {
        manageAttributions.value.push({
          source: "organization",
          role: "project_owner",
          organizationSlug: ownerOrganizationSlug,
        });
      }
    }
  },
  { flush: "sync" }
);

watch(activeTab, async (tab) => {
  if (tab === "manage" && projectList.value.length === 0) {
    await refreshProjects();
  }
});

watch(selectedProject, (project) => {
  isPopulatingManageProject = true;
  if (project === undefined) {
    selectedProjectSlugDraft.value = "";
    manageProjectTitle.value = "";
    manageOwnerOrganizationSlugs.value = [];
    manageSubtitle.value = "";
    manageBodyText.value = "";
    manageHeroImagePath.value = "";
    manageHeroImageIsFullPath.value = false;
    manageAttributions.value = [];
    manageDismissedOwnerAttributionSlugs.value = new Set();
    manageContactName.value = "";
    manageContactRole.value = "";
    manageContactEmail.value = "";
    manageContactOrganizationSlug.value = null;
    manageMultilingualSetting.value = {
      additionalLanguageCodes: [],
      dynamicTranslationEnabled: false,
    };
    isPopulatingManageProject = false;
    return;
  }

  selectedProjectSlugDraft.value = project.projectSlug;
  manageProjectTitle.value = project.projectTitle;
  manageOwnerOrganizationSlugs.value = [...project.ownerOrganizationSlugs];
  manageSubtitle.value = project.subtitle ?? "";
  manageBodyText.value = project.bodyPlainText ?? "";
  manageHeroImagePath.value = project.heroImagePath ?? "";
  manageHeroImageIsFullPath.value = project.heroImageIsFullPath;
  manageAttributions.value = [...project.attributions];
  manageDismissedOwnerAttributionSlugs.value = new Set();
  manageContactName.value = project.contact?.name ?? "";
  manageContactRole.value = project.contact?.roleLabel ?? "";
  manageContactEmail.value = project.contact?.email ?? "";
  manageContactOrganizationSlug.value = project.contact?.organizationSlug ?? null;
  manageLanguageSetting.value = { mode: "auto" };
  manageMultilingualSetting.value = {
    additionalLanguageCodes: [...project.additionalLanguageCodes],
    dynamicTranslationEnabled: project.dynamicTranslationEnabled,
  };
  isPopulatingManageProject = false;
});

onMounted(async () => {
  isLoadingOrganizations.value = true;
  try {
    organizationList.value = await getAllOrganizations();
  } finally {
    isLoadingOrganizations.value = false;
  }
  await refreshProjects();
});

function optionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function requiredLabel(label: string): string {
  return `${label} (${t("requiredSuffix")})`;
}

function optionalLabel(label: string): string {
  return `${label} (${t("optionalSuffix")})`;
}

function contactRequiredLabel(label: string): string {
  return hasContactInput.value ? requiredLabel(label) : optionalLabel(label);
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
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
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

function getLanguageLabel(languageCode: SupportedDisplayLanguageCodes): string {
  return (
    displayLanguageOptions.find((option) => option.value === languageCode)?.label ??
    languageCode
  );
}

function getLanguageSettingSummary(
  setting: ConversationMultilingualSetting
): string {
  const dynamicLabel = setting.dynamicTranslationEnabled
    ? t("dynamicTranslationEnabledLabel")
    : t("dynamicTranslationDisabledLabel");
  const additionalLanguages = setting.additionalLanguageCodes
    .map(getLanguageLabel)
    .join(", ");
  if (additionalLanguages.length === 0) {
    return dynamicLabel;
  }

  return `${dynamicLabel}: ${additionalLanguages}`;
}

async function refreshProjects(): Promise<void> {
  isLoadingProjects.value = true;
  try {
    projectList.value = await getAllProjects();
    if (
      selectedProjectSlug.value === undefined ||
      !projectList.value.some(
        (project) => project.projectSlug === selectedProjectSlug.value
      )
    ) {
      selectedProjectSlug.value = projectList.value[0]?.projectSlug;
    }
  } finally {
    isLoadingProjects.value = false;
  }
}

function selectFirstAvailableExternalLocalizationLanguage(): void {
  const option = availableExternalLocalizationLanguageOptions.value[0];
  if (option !== undefined) {
    externalLocalizationLanguage.value = option.value;
  }
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

function hasRealManageAttribution({
  role,
  organizationSlug,
}: {
  role: AttributionRole;
  organizationSlug: string;
}): boolean {
  return manageAttributions.value.some(
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
    defaultLanguageCode: externalDefaultLanguage.value,
    displayName: externalDisplayName.value.trim(),
    description: optionalString(externalDescription.value),
    imagePath: optionalString(externalImagePath.value),
    isFullImagePath: externalImageIsFullPath.value,
    websiteUrl: optionalString(externalWebsiteUrl.value),
    additionalLocalizations: [],
  });
  externalDefaultLanguage.value = languageStore.displayLanguage;
  externalDisplayName.value = "";
  externalDescription.value = "";
  externalWebsiteUrl.value = "";
  externalImagePath.value = "";
  externalImageIsFullPath.value = false;
  resetExternalLocalizationForm();
}

function addManageAttribution(): void {
  if (!canAddManageAttribution.value) {
    return;
  }

  const role = zodProjectOrganizationAttributionRole.parse(attributionRole.value);
  if (attributionSource.value === "organization") {
    if (attributionOrganizationSlug.value === null) {
      return;
    }

    manageAttributions.value.push({
      source: "organization",
      role,
      organizationSlug: attributionOrganizationSlug.value,
    });
    attributionOrganizationSlug.value = null;
    return;
  }

  manageAttributions.value.push({
    source: "external",
    role,
    defaultLanguageCode: externalDefaultLanguage.value,
    displayName: externalDisplayName.value.trim(),
    description: optionalString(externalDescription.value),
    imagePath: optionalString(externalImagePath.value),
    isFullImagePath: externalImageIsFullPath.value,
    websiteUrl: optionalString(externalWebsiteUrl.value),
    additionalLocalizations: externalLocalizations.value,
  });
  externalDefaultLanguage.value = languageStore.displayLanguage;
  externalDisplayName.value = "";
  externalDescription.value = "";
  externalWebsiteUrl.value = "";
  externalImagePath.value = "";
  externalImageIsFullPath.value = false;
  resetExternalLocalizationForm();
}

function addExternalLocalization(): void {
  if (!canAddExternalLocalization.value) {
    return;
  }

  externalLocalizations.value.push({
    languageCode: externalLocalizationLanguage.value,
    displayName: externalLocalizationDisplayName.value.trim(),
    description: externalLocalizationDescription.value.trim(),
    websiteUrl: optionalString(externalLocalizationWebsiteUrl.value),
    imagePath: optionalString(externalLocalizationImagePath.value),
    isFullImagePath: externalLocalizationImageIsFullPath.value,
  });
  resetExternalLocalizationFields();
  selectFirstAvailableExternalLocalizationLanguage();
}

function removeExternalLocalization(index: number): void {
  externalLocalizations.value.splice(index, 1);
  selectFirstAvailableExternalLocalizationLanguage();
}

function resetExternalLocalizationFields(): void {
  externalLocalizationDisplayName.value = "";
  externalLocalizationDescription.value = "";
  externalLocalizationWebsiteUrl.value = "";
  externalLocalizationImagePath.value = "";
  externalLocalizationImageIsFullPath.value = false;
}

function resetExternalLocalizationForm(): void {
  externalLocalizations.value = [];
  resetExternalLocalizationFields();
  selectFirstAvailableExternalLocalizationLanguage();
}

function removeAttribution(index: number): void {
  const attribution = attributions.value[index];
  if (
    attribution?.source === "organization" &&
    attribution.role === "project_owner" &&
    ownerOrganizationSlugs.value.includes(attribution.organizationSlug)
  ) {
    dismissedOwnerAttributionSlugs.value.add(attribution.organizationSlug);
  }

  attributions.value.splice(index, 1);
}

function removeManageAttribution(index: number): void {
  const attribution = manageAttributions.value[index];
  if (
    attribution?.source === "organization" &&
    attribution.role === "project_owner" &&
    manageOwnerOrganizationSlugs.value.includes(attribution.organizationSlug)
  ) {
    manageDismissedOwnerAttributionSlugs.value.add(attribution.organizationSlug);
  }

  manageAttributions.value.splice(index, 1);
}

function buildCreateRequest(): CreateProjectRequest {
  const bodyPlainText = optionalString(bodyText.value);
  return {
    projectSlug: projectSlug.value.trim(),
    projectTitle: projectTitle.value.trim(),
    ownerOrganizationSlugs: ownerOrganizationSlugs.value,
    subtitle: optionalString(subtitle.value),
    body: plainTextToHtml(bodyText.value),
    bodyPlainText,
    heroImagePath: optionalString(heroImagePath.value),
    heroImageIsFullPath: heroImageIsFullPath.value,
    translationSetting: {
      additionalLanguageCodes: createMultilingualSetting.value.additionalLanguageCodes,
      dynamicTranslationEnabled:
        createMultilingualSetting.value.dynamicTranslationEnabled,
    },
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

function buildUpdateRequest(project: AdminProject): UpdateProjectRequest {
  const bodyPlainText = optionalString(manageBodyText.value);
  return {
    currentProjectSlug: project.projectSlug,
    projectSlug: selectedProjectSlugDraft.value.trim(),
    projectTitle: manageProjectTitle.value.trim(),
    ownerOrganizationSlugs: manageOwnerOrganizationSlugs.value,
    subtitle: optionalString(manageSubtitle.value),
    body: plainTextToHtml(manageBodyText.value),
    bodyPlainText,
    heroImagePath: optionalString(manageHeroImagePath.value),
    heroImageIsFullPath: manageHeroImageIsFullPath.value,
    translationSetting: {
      additionalLanguageCodes: manageMultilingualSetting.value.additionalLanguageCodes,
      dynamicTranslationEnabled:
        manageMultilingualSetting.value.dynamicTranslationEnabled,
    },
    attributions: manageAttributions.value,
    contact: hasManageContactInput.value
      ? {
          name: manageContactName.value.trim(),
          roleLabel: optionalString(manageContactRole.value),
          email: manageContactEmail.value.trim(),
          organizationSlug: manageContactOrganizationSlug.value ?? undefined,
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
  dismissedOwnerAttributionSlugs.value = new Set();
  attributionRole.value = "sponsor";
  attributionSource.value = "organization";
  attributionOrganizationSlug.value = null;
  externalDefaultLanguage.value = languageStore.displayLanguage;
  externalDisplayName.value = "";
  externalDescription.value = "";
  externalWebsiteUrl.value = "";
  externalImagePath.value = "";
  externalImageIsFullPath.value = false;
  resetExternalLocalizationForm();
  contactName.value = "";
  contactRole.value = "";
  contactEmail.value = "";
  contactOrganizationSlug.value = null;
  createLanguageSetting.value = { mode: "auto" };
  createMultilingualSetting.value = {
    additionalLanguageCodes: [],
    dynamicTranslationEnabled: false,
  };
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
      await refreshProjects();
    }
  } finally {
    isCreating.value = false;
  }
}

async function requestSaveSelectedProject(): Promise<void> {
  const project = selectedProject.value;
  if (!canSaveProject.value || project === undefined) {
    return;
  }

  if (selectedProjectSlugDraft.value.trim() !== project.projectSlug) {
    showProjectSlugConfirmDialog.value = true;
    return;
  }

  await saveSelectedProject();
}

async function saveSelectedProject(): Promise<void> {
  const project = selectedProject.value;
  if (!canSaveProject.value || project === undefined) {
    return;
  }

  isSavingProject.value = true;
  const updatedProjectSlug = await updateProject(buildUpdateRequest(project));
  isSavingProject.value = false;

  if (updatedProjectSlug !== undefined) {
    showProjectSlugConfirmDialog.value = false;
    selectedProjectSlug.value = updatedProjectSlug;
    await refreshProjects();
  }
}

async function archiveSelectedProject(): Promise<void> {
  const project = selectedProject.value;
  if (project === undefined || isArchivingProject.value) {
    return;
  }

  isArchivingProject.value = true;
  const success = await archiveProject({ projectSlug: project.projectSlug });
  isArchivingProject.value = false;

  if (success) {
    showProjectArchiveConfirmDialog.value = false;
    selectedProjectSlug.value = undefined;
    await refreshProjects();
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

.admin-tabs {
  border-radius: 1rem;
  background: white;
}

.language-settings-card {
  border: 1px solid #e9e9f1;
  border-radius: 0.75rem;
}

.section-title {
  margin-bottom: 0.35rem;
  font-size: 1.1rem;
  font-weight: 700;
}

.section-description {
  margin: 0 0 1rem;
  color: #5f6368;
  line-height: 1.4;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 1rem;
}

.grid-full {
  grid-column: 1 / -1;
}

.language-expansion {
  border: 1px solid #e9e9f1;
  border-radius: 0.75rem;
}

.nested-form {
  padding: 0 1rem 1rem;
}

.section-action {
  margin-top: 1rem;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
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

.compact-list {
  margin-top: 0.75rem;
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

.create-button {
  margin-bottom: 1.5rem;
}

.slug-dialog {
  width: min(26rem, calc(100vw - 2rem));
}

.dialog-title {
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
  font-weight: 700;
}

.slug-dialog p {
  margin: 0;
  color: #5f6368;
  line-height: 1.4;
}

@media (max-width: 600px) {
  .container {
    padding-bottom: 1rem;
  }

  .create-button {
    margin-bottom: 0.5rem;
  }
}
</style>
