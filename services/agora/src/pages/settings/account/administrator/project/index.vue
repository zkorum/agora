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
          <ZKSelect
            v-model="ownerOrganizationSlugsSelectModel"
            multiple
            searchable
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
          <div class="grid-full">
            <ProjectBodyEditor
              v-model="projectBody"
              v-model:plain-text="projectBodyPlainText"
              v-model:is-over-limit="isProjectBodyOverLimit"
              :placeholder="t('bodyLabel')"
              :disabled="false"
            />
          </div>
          <q-input
            v-model="bannerPathInput"
            outlined
            :label="optionalLabel(t('bannerPathLabel'))"
          />
          <q-checkbox
            v-model="bannerIsFullPath"
            :label="t('bannerIsFullPathLabel')"
          />
          <ConversationLanguageSettingsRow
            class="grid-full language-settings-card"
            :title="t('projectLanguageSettingsLabel')"
            :value="createProjectLanguageSummary"
            :description="createProjectLanguageDescription"
            :icon="forwardIcon"
            :disabled="false"
            :clickable="true"
            @click="showCreateLanguageSettingDialog = true"
          />
          <ProjectContentLocalizationEditor
            v-model="createContentLocalizations"
            class="grid-full language-expansion"
            :title="t('contentLocalizationsTitle')"
            :description="t('contentLocalizationsDescription')"
            :language-label="t('localizationLanguageLabel')"
            :project-title-label="t('projectTitleLabel')"
            :subtitle-label="t('subtitleLabel')"
            :body-label="t('bodyLabel')"
            :banner-path-label="t('bannerPathLabel')"
            :banner-is-full-path-label="t('bannerIsFullPathLabel')"
            :add-button-label="t('addLocalizationButton')"
            :update-button-label="t('updateLocalizationButton')"
            :edit-button-label="t('editLocalizationButton')"
            :cancel-button-label="t('cancelButton')"
            :remove-button-label="t('removeButton')"
            :no-languages-message="t('noLocalizationLanguagesMessage')"
            :machine-translation-preview-title="
              t('machineTranslationPreviewTitle')
            "
            :machine-translation-preview-description="
              t('machineTranslationPreviewDescription')
            "
            :use-machine-translation-button-label="
              t('useMachineTranslationButton')
            "
            :machine-translation-incomplete-label="
              t('machineTranslationIncomplete')
            "
            :required-suffix="t('requiredSuffix')"
            :optional-suffix="t('optionalSuffix')"
            :localized-subtitle-required="createLocalizedSubtitleRequired"
            :localized-body-required="createLocalizedBodyRequired"
            :target-language-codes="
              createMultilingualSetting.additionalLanguageCodes
            "
            :display-language-options="displayLanguageOptions"
            :machine-localizations="noMachineContentLocalizations"
            :dynamic-translation-enabled="
              createMultilingualSetting.dynamicTranslationEnabled
            "
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
          <ZKSelect
            v-if="attributionSource === 'organization'"
            v-model="attributionOrganizationSlugSelectModel"
            searchable
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
            <ProjectExternalOrganizationLocalizationEditor
              v-model="externalLocalizations"
              class="grid-full"
              :default-language-code="externalDefaultLanguage"
              :display-language-options="displayLanguageOptions"
              :labels="externalLocalizationEditorLabels"
            />
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
              <div class="summary-title">
                {{ getRoleLabel(attribution.role) }}
              </div>
              <div class="summary-meta">
                {{ getAttributionLabel(attribution) }}
              </div>
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
            v-model="contactFirstNameInput"
            outlined
            :maxlength="MAX_LENGTH_NAME_CREATOR"
            :label="contactRequiredLabel(t('contactFirstNameLabel'))"
          />
          <q-input
            v-model="contactLastNameInput"
            outlined
            :maxlength="MAX_LENGTH_NAME_CREATOR"
            :label="optionalLabel(t('contactLastNameLabel'))"
          />
          <q-input
            v-model="contactRoleInput"
            outlined
            :maxlength="MAX_LENGTH_TITLE"
            :label="optionalLabel(t('contactRoleLabel'))"
          />
          <q-input
            v-model="contactEmailInput"
            outlined
            type="email"
            :label="contactChannelLabel(t('contactEmailLabel'))"
          />
          <q-input
            v-model="contactWebsiteInput"
            outlined
            type="url"
            :label="contactChannelLabel(t('contactWebsiteLabel'))"
          />
          <q-input
            v-model="contactImagePathInput"
            outlined
            :label="optionalLabel(t('contactImagePathLabel'))"
          />
          <q-checkbox
            v-model="contactImageIsFullPath"
            :label="t('contactImageIsFullPathLabel')"
          />
          <ZKSelect
            v-model="contactOrganizationSlugSelectModel"
            clearable
            searchable
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
        <div
          v-if="projectOptionList.length > 0"
          class="form-grid header-form-grid"
        >
          <ZKSelect
            v-model="selectedProjectSlugSelectModel"
            searchable
            :label="t('selectProjectLabel')"
            :loading="isLoadingProjects"
            :disable="isLoadingProjects"
            :options="projectOptions"
          />
          <q-input
            v-if="selectedProject !== undefined"
            :model-value="selectedProjectPublicUrl"
            class="grid-full"
            outlined
            readonly
            :label="t('projectLinkLabel')"
          >
            <template #append>
              <q-btn
                flat
                round
                dense
                icon="mdi-content-copy"
                :aria-label="t('copyProjectLinkLabel')"
                @click="copySelectedProjectLink"
              />
            </template>
          </q-input>
        </div>
        <p
          v-if="!isLoadingProjects && selectedProject === undefined"
          class="empty-state"
        >
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
            <ZKSelect
              v-model="manageOwnerOrganizationSlugsSelectModel"
              multiple
              searchable
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
            <div class="grid-full">
              <ProjectBodyEditor
                v-model="manageProjectBody"
                v-model:plain-text="manageProjectBodyPlainText"
                v-model:is-over-limit="isManageProjectBodyOverLimit"
                :placeholder="t('bodyLabel')"
                :disabled="false"
              />
            </div>
            <q-input
              v-model="manageBannerPathInput"
              outlined
              :label="optionalLabel(t('bannerPathLabel'))"
            />
            <q-checkbox
              v-model="manageBannerIsFullPath"
              :label="t('bannerIsFullPathLabel')"
            />
            <ConversationLanguageSettingsRow
              class="grid-full language-settings-card"
              :title="t('projectLanguageSettingsLabel')"
              :value="manageProjectLanguageSummary"
              :description="manageProjectLanguageDescription"
              :icon="forwardIcon"
              :disabled="false"
              :clickable="true"
              @click="showManageLanguageSettingDialog = true"
            />
            <ProjectContentLocalizationEditor
              v-model="manageContentLocalizations"
              class="grid-full language-expansion"
              :title="t('contentLocalizationsTitle')"
              :description="t('contentLocalizationsDescription')"
              :language-label="t('localizationLanguageLabel')"
              :project-title-label="t('projectTitleLabel')"
              :subtitle-label="t('subtitleLabel')"
              :body-label="t('bodyLabel')"
              :banner-path-label="t('bannerPathLabel')"
              :banner-is-full-path-label="t('bannerIsFullPathLabel')"
              :add-button-label="t('addLocalizationButton')"
              :update-button-label="t('updateLocalizationButton')"
              :edit-button-label="t('editLocalizationButton')"
              :cancel-button-label="t('cancelButton')"
              :remove-button-label="t('removeButton')"
              :no-languages-message="t('noLocalizationLanguagesMessage')"
              :machine-translation-preview-title="
                t('machineTranslationPreviewTitle')
              "
              :machine-translation-preview-description="
                t('machineTranslationPreviewDescription')
              "
              :use-machine-translation-button-label="
                t('useMachineTranslationButton')
              "
              :machine-translation-incomplete-label="
                t('machineTranslationIncomplete')
              "
              :required-suffix="t('requiredSuffix')"
              :optional-suffix="t('optionalSuffix')"
              :localized-subtitle-required="manageLocalizedSubtitleRequired"
              :localized-body-required="manageLocalizedBodyRequired"
              :target-language-codes="
                manageMultilingualSetting.additionalLanguageCodes
              "
              :display-language-options="displayLanguageOptions"
              :machine-localizations="
                selectedProject?.machineContentLocalizations ??
                noMachineContentLocalizations
              "
              :dynamic-translation-enabled="
                manageMultilingualSetting.dynamicTranslationEnabled
              "
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
            <ZKSelect
              v-if="attributionSource === 'organization'"
              v-model="attributionOrganizationSlugSelectModel"
              searchable
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
              <ProjectExternalOrganizationLocalizationEditor
                v-model="externalLocalizations"
                class="grid-full"
                :default-language-code="externalDefaultLanguage"
                :display-language-options="displayLanguageOptions"
                :labels="externalLocalizationEditorLabels"
              />
            </template>
          </div>
          <q-btn
            class="section-action"
            color="primary"
            outline
            no-caps
            :disable="!canAddManageAttribution"
            :label="manageAttributionActionLabel"
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
                <div class="summary-title">
                  {{ getRoleLabel(attribution.role) }}
                </div>
                <div class="summary-meta">
                  {{ getAttributionLabel(attribution) }}
                </div>
              </div>
              <q-btn
                v-if="attribution.source === 'external'"
                flat
                color="primary"
                no-caps
                :label="t('editAttributionButton')"
                @click="editManageExternalAttribution(index)"
              />
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
              v-model="manageContactFirstNameInput"
              outlined
              :maxlength="MAX_LENGTH_NAME_CREATOR"
              :label="
                hasManageContactInput
                  ? requiredLabel(t('contactFirstNameLabel'))
                  : optionalLabel(t('contactFirstNameLabel'))
              "
            />
            <q-input
              v-model="manageContactLastNameInput"
              outlined
              :maxlength="MAX_LENGTH_NAME_CREATOR"
              :label="optionalLabel(t('contactLastNameLabel'))"
            />
            <q-input
              v-model="manageContactRoleInput"
              outlined
              :maxlength="MAX_LENGTH_TITLE"
              :label="optionalLabel(t('contactRoleLabel'))"
            />
            <q-input
              v-model="manageContactEmailInput"
              outlined
              type="email"
              :label="manageContactChannelLabel(t('contactEmailLabel'))"
            />
            <q-input
              v-model="manageContactWebsiteInput"
              outlined
              type="url"
              :label="manageContactChannelLabel(t('contactWebsiteLabel'))"
            />
            <q-input
              v-model="manageContactImagePathInput"
              outlined
              :label="optionalLabel(t('contactImagePathLabel'))"
            />
            <q-checkbox
              v-model="manageContactImageIsFullPath"
              :label="t('contactImageIsFullPathLabel')"
            />
            <ZKSelect
              v-model="manageContactOrganizationSlugSelectModel"
              clearable
              searchable
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
        </div>

        <ZKCard padding="0" class="card-background danger-zone-card">
          <div class="danger-zone-title">{{ t("dangerZoneTitle") }}</div>

          <form
            class="danger-zone-row"
            @submit.prevent="requestProjectSlugUpdate"
          >
            <div class="danger-zone-content">
              <div class="danger-zone-row-title">
                {{ t("changeSlugDangerTitle") }}
              </div>
              <div class="danger-zone-description">
                {{ t("changeSlugDangerDescription") }}
              </div>
              <q-input
                v-model="selectedProjectSlugDraftInput"
                class="danger-zone-input"
                outlined
                dense
                :label="requiredLabel(t('projectSlugLabel'))"
                autocomplete="off"
                data-1p-ignore
              />
            </div>
            <q-btn
              class="danger-zone-action"
              type="submit"
              color="negative"
              outline
              no-caps
              :label="t('saveSlugButton')"
              :loading="isSavingProject"
              :disable="!canSaveProjectSlug"
            />
          </form>

          <div class="danger-zone-row">
            <div class="danger-zone-content">
              <div class="danger-zone-row-title">
                {{ t("deleteDangerTitle") }}
              </div>
              <div class="danger-zone-description">
                {{ t("deleteDangerDescription") }}
              </div>
            </div>
            <q-btn
              class="danger-zone-action"
              color="negative"
              outline
              no-caps
              :label="t('deleteProjectButton')"
              :loading="isDeletingProject"
              @click="showProjectDeleteConfirmDialog = true"
            />
          </div>
        </ZKCard>
      </template>
    </template>

    <ConversationLanguageSettingDialog
      v-model:show-dialog="showCreateLanguageSettingDialog"
      v-model:multilingual-setting="createMultilingualSetting"
      :can-use-dynamic-translation="createCanUseDynamicTranslation === true"
    />

    <ConversationLanguageSettingDialog
      v-model:show-dialog="showManageLanguageSettingDialog"
      v-model:multilingual-setting="manageMultilingualSetting"
      :can-use-dynamic-translation="manageCanUseDynamicTranslation === true"
    />

    <ZKConfirmDialog
      v-model="showProjectSlugConfirmDialog"
      :title="t('slugWarningTitle')"
      :message="t('slugWarningDescription')"
      :confirm-text="t('confirmSlugChangeButton')"
      :cancel-text="t('cancelButton')"
      variant="destructive"
      @confirm="saveProjectSlug"
    />

    <ZKConfirmDialog
      v-model="showProjectDeleteConfirmDialog"
      :title="t('deleteProjectTitle')"
      :message="t('deleteProjectDescription')"
      :confirm-text="t('confirmDeleteProjectButton')"
      :cancel-text="t('cancelButton')"
      variant="destructive"
      @confirm="deleteSelectedProject"
    />
  </div>
</template>

<script setup lang="ts">
import { copyToClipboard, useQuasar } from "quasar";
import AdminSectionHeader from "src/components/administrator/AdminSectionHeader.vue";
import ProjectBodyEditor from "src/components/administrator/project/ProjectBodyEditor.vue";
import ProjectContentLocalizationEditor from "src/components/administrator/project/ProjectContentLocalizationEditor.vue";
import ProjectExternalOrganizationLocalizationEditor from "src/components/administrator/project/ProjectExternalOrganizationLocalizationEditor.vue";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import ConversationLanguageSettingDialog from "src/components/newConversation/dialog/ConversationLanguageSettingDialog.vue";
import ConversationLanguageSettingsRow from "src/components/newConversation/dialog/ConversationLanguageSettingsRow.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import ZKSelect from "src/components/ui-library/ZKSelect.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import {
  MAX_LENGTH_DESCRIPTION_CREATOR,
  MAX_LENGTH_NAME_CREATOR,
  MAX_LENGTH_TITLE,
} from "src/shared/shared";
import type {
  AdminOrganizationOption,
  AdminProject,
  AdminProjectOption,
  CreateProjectAttributionRequest,
  CreateProjectRequest,
  UpdateProjectRequest,
} from "src/shared/types/dto";
import type { ConversationMultilingualSetting } from "src/shared/types/zod";
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
import { useNotify } from "src/utils/ui/notify";
import {
  computed,
  onMounted,
  type Ref,
  ref,
  watch,
  type WritableComputedRef,
} from "vue";

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

type ZKSelectModel = string | string[] | null;

type ExternalLocalization = Extract<
  CreateProjectAttributionRequest,
  { source: "external" }
>["additionalLocalizations"][number];
type ExternalAttribution = Extract<
  CreateProjectAttributionRequest,
  { source: "external" }
>;
type ProjectContentLocalization =
  CreateProjectRequest["contentLocalizations"][number];

const noMachineContentLocalizations: ProjectContentLocalization[] = [];

const { isActive } = usePageLayout({ reducedWidth: true });
const { t } = useComponentI18n<AdministratorProjectTranslations>(
  administratorProjectTranslations
);
const { getOrganizationOptions } = useBackendAdministratorOrganizationApi();
const {
  deleteProject,
  createProject,
  getProjectDetails,
  getProjectOptions,
  updateProject,
  updateProjectSlug,
} = useBackendAdministratorProjectApi();
const languageStore = useLanguageStore();
const $q = useQuasar();
const { showNotifyMessage, showCopiedToClipboard } = useNotify();

const organizationList = ref<AdminOrganizationOption[]>([]);
const projectOptionList = ref<AdminProjectOption[]>([]);
const selectedProject = ref<AdminProject | undefined>(undefined);
const isLoadingOrganizations = ref(false);
const isLoadingProjects = ref(false);
const projectTitle = ref("");
const projectSlug = ref("");
const hasEditedProjectSlug = ref(false);
const fallbackProjectSlug = ref(createRandomOrganizationSlugFallback());
const ownerOrganizationSlugs = ref<string[]>([]);
const subtitle = ref("");
const projectBody = ref("");
const projectBodyPlainText = ref("");
const isProjectBodyOverLimit = ref(false);
const bannerPath = ref("");
const bannerIsFullPath = ref(true);
const createContentLocalizations = ref<ProjectContentLocalization[]>([]);
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
const externalImageIsFullPath = ref(true);
const externalLocalizations = ref<ExternalLocalization[]>([]);
const attributions = ref<CreateProjectAttributionRequest[]>([]);
const dismissedOwnerAttributionSlugs = ref<Set<string>>(new Set());
const contactFirstName = ref("");
const contactLastName = ref("");
const contactRole = ref("");
const contactEmail = ref("");
const contactWebsite = ref("");
const contactImagePath = ref("");
const contactImageIsFullPath = ref(true);
const contactOrganizationSlug = ref<string | null>(null);
const isCreating = ref(false);
const isDeletingProject = ref(false);
const activeTab = ref<"create" | "manage">("create");
const selectedProjectSlug = ref<string | undefined>(undefined);
const selectedProjectSlugDraft = ref("");
const manageProjectTitle = ref("");
const manageOwnerOrganizationSlugs = ref<string[]>([]);
const manageSubtitle = ref("");
const manageProjectBody = ref("");
const manageProjectBodyPlainText = ref("");
const isManageProjectBodyOverLimit = ref(false);
const manageBannerPath = ref("");
const manageBannerIsFullPath = ref(true);
const manageContentLocalizations = ref<ProjectContentLocalization[]>([]);
const manageAttributions = ref<CreateProjectAttributionRequest[]>([]);
const manageDismissedOwnerAttributionSlugs = ref<Set<string>>(new Set());
const manageContactFirstName = ref("");
const manageContactLastName = ref("");
const manageContactRole = ref("");
const manageContactEmail = ref("");
const manageContactWebsite = ref("");
const manageContactImagePath = ref("");
const manageContactImageIsFullPath = ref(true);
const manageContactOrganizationSlug = ref<string | null>(null);
const isSavingProject = ref(false);
const editingManageAttributionIndex = ref<number | undefined>();
let isPopulatingManageProject = false;
let latestProjectDetailsRequest = 0;
const showCreateLanguageSettingDialog = ref(false);
const showManageLanguageSettingDialog = ref(false);
const showProjectSlugConfirmDialog = ref(false);
const showProjectDeleteConfirmDialog = ref(false);
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
const selectedProjectSlugDraftInput = stringInputModel(
  selectedProjectSlugDraft
);
const manageProjectTitleInput = stringInputModel(manageProjectTitle);
const manageSubtitleInput = stringInputModel(manageSubtitle);
const manageBannerPathInput = stringInputModel(manageBannerPath);
const subtitleInput = stringInputModel(subtitle);
const bannerPathInput = stringInputModel(bannerPath);
const externalDisplayNameInput = stringInputModel(externalDisplayName);
const externalDescriptionInput = stringInputModel(externalDescription);
const externalWebsiteUrlInput = stringInputModel(externalWebsiteUrl);
const externalImagePathInput = stringInputModel(externalImagePath);
const contactFirstNameInput = stringInputModel(contactFirstName);
const contactLastNameInput = stringInputModel(contactLastName);
const contactRoleInput = stringInputModel(contactRole);
const contactEmailInput = stringInputModel(contactEmail);
const contactWebsiteInput = stringInputModel(contactWebsite);
const contactImagePathInput = stringInputModel(contactImagePath);
const manageContactFirstNameInput = stringInputModel(manageContactFirstName);
const manageContactLastNameInput = stringInputModel(manageContactLastName);
const manageContactRoleInput = stringInputModel(manageContactRole);
const manageContactEmailInput = stringInputModel(manageContactEmail);
const manageContactWebsiteInput = stringInputModel(manageContactWebsite);
const manageContactImagePathInput = stringInputModel(manageContactImagePath);
const ownerOrganizationSlugsSelectModel = stringArraySelectModel(
  ownerOrganizationSlugs
);
const attributionOrganizationSlugSelectModel = nullableStringSelectModel(
  attributionOrganizationSlug
);
const contactOrganizationSlugSelectModel = nullableStringSelectModel(
  contactOrganizationSlug
);
const selectedProjectSlugSelectModel =
  optionalStringSelectModel(selectedProjectSlug);
const manageOwnerOrganizationSlugsSelectModel = stringArraySelectModel(
  manageOwnerOrganizationSlugs
);
const manageContactOrganizationSlugSelectModel = nullableStringSelectModel(
  manageContactOrganizationSlug
);

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
      organizationList.value.map((organization) => [
        organization.slug,
        organization,
      ])
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
  projectOptionList.value.map((project) => ({
    label: `${project.projectTitle} (${project.projectSlug})`,
    value: project.projectSlug,
  }))
);

const selectedProjectPublicUrl = computed(() => {
  const project = selectedProject.value;
  if (project === undefined) {
    return "";
  }

  return `${window.location.origin}/project/${encodeURIComponent(project.projectSlug)}`;
});

const forwardIcon = computed(() =>
  $q.lang.rtl ? "mdi-chevron-left" : "mdi-chevron-right"
);

const createProjectLanguageSummary = computed(() =>
  getLanguageSettingSummary(createMultilingualSetting.value)
);

const manageProjectLanguageSummary = computed(() =>
  getLanguageSettingSummary(manageMultilingualSetting.value)
);

const createCanUseDynamicTranslation = computed(() =>
  hasProjectOwnerDynamicTranslationEntitlement({
    ownerOrganizationSlugs: ownerOrganizationSlugs.value,
  })
);

const manageCanUseDynamicTranslation = computed(() =>
  hasProjectOwnerDynamicTranslationEntitlement({
    ownerOrganizationSlugs: manageOwnerOrganizationSlugs.value,
  })
);

const createProjectLanguageDescription = computed(() =>
  createCanUseDynamicTranslation.value === false
    ? t("projectLanguageEntitlementRequiredDescription")
    : createCanUseDynamicTranslation.value === undefined
      ? t("projectLanguageEntitlementLoadingDescription")
      : t("projectLanguageSettingsDescription")
);

const manageProjectLanguageDescription = computed(() =>
  manageCanUseDynamicTranslation.value === false
    ? t("projectLanguageEntitlementRequiredDescription")
    : manageCanUseDynamicTranslation.value === undefined
      ? t("projectLanguageEntitlementLoadingDescription")
      : t("projectLanguageSettingsDescription")
);

const manageAttributionActionLabel = computed(() =>
  editingManageAttributionIndex.value === undefined
    ? t("addAttributionButton")
    : t("updateAttributionButton")
);

const createLocalizedBodyRequired = computed(
  () => projectBodyPlainText.value.trim() !== ""
);

const createLocalizedSubtitleRequired = computed(
  () => subtitle.value.trim() !== ""
);

const manageLocalizedBodyRequired = computed(
  () => manageProjectBodyPlainText.value.trim() !== ""
);

const manageLocalizedSubtitleRequired = computed(
  () => manageSubtitle.value.trim() !== ""
);

const externalLocalizationEditorLabels = computed(() => ({
  title: t("additionalLanguagesTitle"),
  languageLabel: requiredLabel(t("externalLanguageLabel")),
  nameLabel: requiredLabel(t("externalNameLabel")),
  descriptionLabel: optionalLabel(t("externalDescriptionLabel")),
  websiteLabel: optionalLabel(t("externalWebsiteLabel")),
  imagePathLabel: optionalLabel(t("externalImagePathLabel")),
  imageIsFullPathLabel: t("externalImageIsFullPathLabel"),
  addLanguageButton: t("addLanguageButton"),
  removeButton: t("removeButton"),
}));

const hasCompleteCreateManualLocalizations = computed(() =>
  hasCompleteManualLocalizations({
    languageCodes: createMultilingualSetting.value.additionalLanguageCodes,
    localizations: createContentLocalizations.value,
    dynamicTranslationEnabled:
      createMultilingualSetting.value.dynamicTranslationEnabled,
    localizedSubtitleRequired: createLocalizedSubtitleRequired.value,
    localizedBodyRequired: createLocalizedBodyRequired.value,
  })
);

const hasCompleteManageManualLocalizations = computed(() =>
  hasCompleteManualLocalizations({
    languageCodes: manageMultilingualSetting.value.additionalLanguageCodes,
    localizations: manageContentLocalizations.value,
    dynamicTranslationEnabled:
      manageMultilingualSetting.value.dynamicTranslationEnabled,
    localizedSubtitleRequired: manageLocalizedSubtitleRequired.value,
    localizedBodyRequired: manageLocalizedBodyRequired.value,
  })
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

const hasContactInput = computed(
  () =>
    contactFirstName.value.trim() !== "" ||
    contactLastName.value.trim() !== "" ||
    contactRole.value.trim() !== "" ||
    contactEmail.value.trim() !== "" ||
    contactWebsite.value.trim() !== "" ||
    contactImagePath.value.trim() !== "" ||
    contactOrganizationSlug.value !== null
);

const hasManageContactInput = computed(
  () =>
    manageContactFirstName.value.trim() !== "" ||
    manageContactLastName.value.trim() !== "" ||
    manageContactRole.value.trim() !== "" ||
    manageContactEmail.value.trim() !== "" ||
    manageContactWebsite.value.trim() !== "" ||
    manageContactImagePath.value.trim() !== "" ||
    manageContactOrganizationSlug.value !== null
);

const hasContactChannelInput = computed(
  () => contactEmail.value.trim() !== "" || contactWebsite.value.trim() !== ""
);

const hasManageContactChannelInput = computed(
  () =>
    manageContactEmail.value.trim() !== "" ||
    manageContactWebsite.value.trim() !== ""
);

const hasValidContact = computed(() => {
  if (!hasContactInput.value) {
    return true;
  }

  const trimmedEmail = contactEmail.value.trim();
  const trimmedWebsite = contactWebsite.value.trim();
  return (
    contactFirstName.value.trim() !== "" &&
    (trimmedEmail === "" || zodEmail.safeParse(trimmedEmail).success) &&
    isOptionalUrlValid(trimmedWebsite) &&
    hasContactChannelInput.value
  );
});

const hasValidManageContact = computed(() => {
  if (!hasManageContactInput.value) {
    return true;
  }

  const trimmedEmail = manageContactEmail.value.trim();
  const trimmedWebsite = manageContactWebsite.value.trim();
  return (
    manageContactFirstName.value.trim() !== "" &&
    (trimmedEmail === "" || zodEmail.safeParse(trimmedEmail).success) &&
    isOptionalUrlValid(trimmedWebsite) &&
    hasManageContactChannelInput.value
  );
});

const canCreateProject = computed(
  () =>
    !isLoadingOrganizations.value &&
    !isCreating.value &&
    projectTitle.value.trim() !== "" &&
    zodProjectSlug.safeParse(projectSlug.value.trim()).success &&
    ownerOrganizationSlugs.value.length > 0 &&
    !isProjectBodyOverLimit.value &&
    hasCompleteCreateManualLocalizations.value &&
    hasValidContact.value
);

const canSaveProject = computed(
  () =>
    selectedProject.value !== undefined &&
    !isSavingProject.value &&
    manageProjectTitle.value.trim() !== "" &&
    manageOwnerOrganizationSlugs.value.length > 0 &&
    !isManageProjectBodyOverLimit.value &&
    hasCompleteManageManualLocalizations.value &&
    hasValidManageContact.value
);

const canSaveProjectSlug = computed(() => {
  const project = selectedProject.value;
  return (
    project !== undefined &&
    !isSavingProject.value &&
    zodProjectSlug.safeParse(selectedProjectSlugDraft.value.trim()).success &&
    selectedProjectSlugDraft.value.trim() !== project.projectSlug
  );
});

watch(projectTitle, (title) => {
  if (!hasEditedProjectSlug.value) {
    projectSlug.value =
      slugifyOrganizationDisplayName(title) ?? fallbackProjectSlug.value;
  }
});

watch(externalDefaultLanguage, () => {
  externalLocalizations.value = externalLocalizations.value.filter(
    (localization) =>
      localization.languageCode !== externalDefaultLanguage.value
  );
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
        !manageDismissedOwnerAttributionSlugs.value.has(
          ownerOrganizationSlug
        ) &&
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

watch(
  createCanUseDynamicTranslation,
  (canUseDynamicTranslation) => {
    if (canUseDynamicTranslation === false) {
      createMultilingualSetting.value = {
        additionalLanguageCodes: [],
        dynamicTranslationEnabled: false,
      };
      createContentLocalizations.value = [];
    }
  },
  { immediate: true }
);

watch(
  () => createMultilingualSetting.value.additionalLanguageCodes,
  (languageCodes) => {
    const languageCodeSet = new Set(languageCodes);
    createContentLocalizations.value = createContentLocalizations.value.filter(
      (localization) => languageCodeSet.has(localization.languageCode)
    );
  }
);

watch(
  manageCanUseDynamicTranslation,
  (canUseDynamicTranslation) => {
    if (canUseDynamicTranslation === false) {
      manageMultilingualSetting.value = {
        additionalLanguageCodes: [],
        dynamicTranslationEnabled: false,
      };
      manageContentLocalizations.value = [];
    }
  },
  { immediate: true }
);

watch(
  () => manageMultilingualSetting.value.additionalLanguageCodes,
  (languageCodes) => {
    const languageCodeSet = new Set(languageCodes);
    manageContentLocalizations.value = manageContentLocalizations.value.filter(
      (localization) => languageCodeSet.has(localization.languageCode)
    );
  }
);

watch(activeTab, async (tab) => {
  if (
    tab === "manage" &&
    projectOptionList.value.length === 0 &&
    !isLoadingProjects.value
  ) {
    await refreshProjects();
  }
});

watch(selectedProjectSlug, async (projectSlug) => {
  await refreshSelectedProjectDetails(projectSlug);
});

watch(selectedProject, (project) => {
  isPopulatingManageProject = true;
  if (project === undefined) {
    selectedProjectSlugDraft.value = "";
    manageProjectTitle.value = "";
    manageOwnerOrganizationSlugs.value = [];
    manageSubtitle.value = "";
    manageProjectBody.value = "";
    manageProjectBodyPlainText.value = "";
    isManageProjectBodyOverLimit.value = false;
    manageBannerPath.value = "";
    manageBannerIsFullPath.value = true;
    manageContentLocalizations.value = [];
    manageAttributions.value = [];
    manageDismissedOwnerAttributionSlugs.value = new Set();
    editingManageAttributionIndex.value = undefined;
    manageContactFirstName.value = "";
    manageContactLastName.value = "";
    manageContactRole.value = "";
    manageContactEmail.value = "";
    manageContactWebsite.value = "";
    manageContactImagePath.value = "";
    manageContactImageIsFullPath.value = true;
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
  manageProjectBody.value = project.body ?? "";
  manageProjectBodyPlainText.value = project.bodyPlainText ?? "";
  isManageProjectBodyOverLimit.value = false;
  manageBannerPath.value = project.bannerPath ?? "";
  manageBannerIsFullPath.value = project.bannerIsFullPath;
  manageContentLocalizations.value = [...project.contentLocalizations];
  manageAttributions.value = [...project.attributions];
  manageDismissedOwnerAttributionSlugs.value = new Set();
  editingManageAttributionIndex.value = undefined;
  manageContactFirstName.value = project.contact?.firstName ?? "";
  manageContactLastName.value = project.contact?.lastName ?? "";
  manageContactRole.value = project.contact?.roleLabel ?? "";
  manageContactEmail.value = project.contact?.email ?? "";
  manageContactWebsite.value = project.contact?.websiteUrl ?? "";
  manageContactImagePath.value = project.contact?.imagePath ?? "";
  manageContactImageIsFullPath.value = project.contact?.isFullImagePath ?? true;
  manageContactOrganizationSlug.value =
    project.contact?.organizationSlug ?? null;
  manageMultilingualSetting.value = {
    additionalLanguageCodes: [...project.languageSettings.targetLanguageCodes],
    dynamicTranslationEnabled:
      project.languageSettings.dynamicTranslationEnabled,
  };
  if (manageCanUseDynamicTranslation.value === false) {
    manageMultilingualSetting.value = {
      additionalLanguageCodes: [],
      dynamicTranslationEnabled: false,
    };
  }
  isPopulatingManageProject = false;
});

onMounted(async () => {
  isLoadingOrganizations.value = true;
  try {
    organizationList.value = await getOrganizationOptions();
  } finally {
    isLoadingOrganizations.value = false;
  }
  if (activeTab.value === "manage") {
    await refreshProjects();
  }
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

function contactChannelLabel(label: string): string {
  return hasContactInput.value && !hasContactChannelInput.value
    ? requiredLabel(label)
    : optionalLabel(label);
}

function manageContactChannelLabel(label: string): string {
  return hasManageContactInput.value && !hasManageContactChannelInput.value
    ? requiredLabel(label)
    : optionalLabel(label);
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

function stringArraySelectModel(
  source: Ref<string[]>
): WritableComputedRef<ZKSelectModel> {
  return computed({
    get: () => [...source.value],
    set: (value) => {
      source.value = Array.isArray(value) ? value : [];
    },
  });
}

function nullableStringSelectModel(
  source: Ref<string | null>
): WritableComputedRef<ZKSelectModel> {
  return computed({
    get: () => source.value,
    set: (value) => {
      source.value =
        typeof value === "string" && value.length > 0 ? value : null;
    },
  });
}

function optionalStringSelectModel(
  source: Ref<string | undefined>
): WritableComputedRef<ZKSelectModel> {
  return computed({
    get: () => source.value ?? null,
    set: (value) => {
      source.value =
        typeof value === "string" && value.length > 0 ? value : undefined;
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

function optionalRichTextHtml({
  html,
  plainText,
}: {
  html: string;
  plainText: string;
}): string | undefined {
  if (optionalString(plainText) === undefined) {
    return undefined;
  }

  return optionalString(html);
}

function getRoleLabel(role: AttributionRole): string {
  return roleLabels[role]();
}

function getAttributionLabel(
  attribution: CreateProjectAttributionRequest
): string {
  if (attribution.source === "organization") {
    const organization = organizationsBySlug.value.get(
      attribution.organizationSlug
    );
    return organization?.name ?? attribution.organizationSlug;
  }

  return attribution.displayName;
}

function getLanguageLabel(languageCode: SupportedDisplayLanguageCodes): string {
  return (
    displayLanguageOptions.find((option) => option.value === languageCode)
      ?.label ?? languageCode
  );
}

function getLanguageSettingSummary(
  setting: ConversationMultilingualSetting
): string {
  const dynamicLabel = setting.dynamicTranslationEnabled
    ? t("dynamicTranslationEnabledLabel")
    : t("dynamicTranslationDisabledLabel");
  const languageSummary = [
    t("autoLanguageLabel"),
    ...setting.additionalLanguageCodes.map(getLanguageLabel),
  ].join(", ");

  return `${dynamicLabel}: ${languageSummary}`;
}

function hasProjectOwnerDynamicTranslationEntitlement({
  ownerOrganizationSlugs,
}: {
  ownerOrganizationSlugs: readonly string[];
}): boolean | undefined {
  if (isLoadingOrganizations.value) {
    return undefined;
  }

  return ownerOrganizationSlugs.some((organizationSlug) => {
    const organization = organizationsBySlug.value.get(organizationSlug);
    return organization?.canUseDynamicTranslation === true;
  });
}

async function refreshProjects({
  refreshSelectedDetails = true,
}: {
  refreshSelectedDetails?: boolean;
} = {}): Promise<void> {
  isLoadingProjects.value = true;
  try {
    projectOptionList.value = await getProjectOptions();
    const shouldSelectFallbackProject =
      selectedProjectSlug.value === undefined ||
      !projectOptionList.value.some(
        (project) => project.projectSlug === selectedProjectSlug.value
      );
    const nextProjectSlug = shouldSelectFallbackProject
      ? projectOptionList.value[0]?.projectSlug
      : selectedProjectSlug.value;

    if (selectedProjectSlug.value === nextProjectSlug) {
      if (!refreshSelectedDetails) {
        return;
      }

      await refreshSelectedProjectDetails(nextProjectSlug);
      return;
    }

    selectedProjectSlug.value = nextProjectSlug;
  } finally {
    isLoadingProjects.value = false;
  }
}

async function refreshSelectedProjectDetails(
  projectSlug: string | undefined
): Promise<void> {
  latestProjectDetailsRequest += 1;
  const requestId = latestProjectDetailsRequest;

  if (projectSlug === undefined) {
    selectedProject.value = undefined;
    return;
  }

  const project = await getProjectDetails({ projectSlug });
  if (requestId === latestProjectDetailsRequest) {
    selectedProject.value = project;
  }
}

function hasCompleteManualLocalizations({
  languageCodes,
  localizations,
  dynamicTranslationEnabled,
  localizedSubtitleRequired,
  localizedBodyRequired,
}: {
  languageCodes: readonly SupportedDisplayLanguageCodes[];
  localizations: readonly ProjectContentLocalization[];
  dynamicTranslationEnabled: boolean;
  localizedSubtitleRequired: boolean;
  localizedBodyRequired: boolean;
}): boolean {
  if (dynamicTranslationEnabled) {
    return true;
  }

  const localizationsByLanguageCode = new Map(
    localizations.map((localization) => [
      localization.languageCode,
      localization,
    ])
  );
  return languageCodes.every((languageCode) => {
    const localization = localizationsByLanguageCode.get(languageCode);
    return (
      localization !== undefined &&
      (localization.projectTitle?.trim() ?? "") !== "" &&
      (!localizedSubtitleRequired ||
        (localization.subtitle?.trim() ?? "") !== "") &&
      (!localizedBodyRequired ||
        (localization.bodyPlainText?.trim() ?? "") !== "")
    );
  });
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

  const role = zodProjectOrganizationAttributionRole.parse(
    attributionRole.value
  );
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
    additionalLocalizations: [...externalLocalizations.value],
  });
  externalDefaultLanguage.value = languageStore.displayLanguage;
  externalDisplayName.value = "";
  externalDescription.value = "";
  externalWebsiteUrl.value = "";
  externalImagePath.value = "";
  externalImageIsFullPath.value = true;
  externalLocalizations.value = [];
}

function addManageAttribution(): void {
  if (!canAddManageAttribution.value) {
    return;
  }

  const role = zodProjectOrganizationAttributionRole.parse(
    attributionRole.value
  );
  const editingIndex = editingManageAttributionIndex.value;
  if (attributionSource.value === "organization") {
    if (attributionOrganizationSlug.value === null) {
      return;
    }

    const attribution: CreateProjectAttributionRequest = {
      source: "organization",
      role,
      organizationSlug: attributionOrganizationSlug.value,
    };
    if (editingIndex === undefined) {
      manageAttributions.value.push(attribution);
    } else {
      manageAttributions.value.splice(editingIndex, 1, attribution);
      editingManageAttributionIndex.value = undefined;
    }
    attributionOrganizationSlug.value = null;
    return;
  }

  const attribution: CreateProjectAttributionRequest = {
    source: "external",
    role,
    defaultLanguageCode: externalDefaultLanguage.value,
    displayName: externalDisplayName.value.trim(),
    description: optionalString(externalDescription.value),
    imagePath: optionalString(externalImagePath.value),
    isFullImagePath: externalImageIsFullPath.value,
    websiteUrl: optionalString(externalWebsiteUrl.value),
    additionalLocalizations: [...externalLocalizations.value],
  };
  if (editingIndex === undefined) {
    manageAttributions.value.push(attribution);
  } else {
    manageAttributions.value.splice(editingIndex, 1, attribution);
    editingManageAttributionIndex.value = undefined;
  }
  externalDefaultLanguage.value = languageStore.displayLanguage;
  externalDisplayName.value = "";
  externalDescription.value = "";
  externalWebsiteUrl.value = "";
  externalImagePath.value = "";
  externalImageIsFullPath.value = true;
  externalLocalizations.value = [];
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
    manageDismissedOwnerAttributionSlugs.value.add(
      attribution.organizationSlug
    );
  }

  manageAttributions.value.splice(index, 1);
  if (editingManageAttributionIndex.value === undefined) {
    return;
  }

  if (editingManageAttributionIndex.value === index) {
    editingManageAttributionIndex.value = undefined;
    return;
  }

  if (editingManageAttributionIndex.value > index) {
    editingManageAttributionIndex.value -= 1;
  }
}

function editManageExternalAttribution(index: number): void {
  const attribution = manageAttributions.value[index];
  if (attribution?.source !== "external") {
    return;
  }

  populateExternalAttributionForm({ attribution });
  editingManageAttributionIndex.value = index;
}

function populateExternalAttributionForm({
  attribution,
}: {
  attribution: ExternalAttribution;
}): void {
  attributionSource.value = "external";
  attributionRole.value = attribution.role;
  externalDefaultLanguage.value = attribution.defaultLanguageCode;
  externalDisplayName.value = attribution.displayName;
  externalDescription.value = attribution.description ?? "";
  externalWebsiteUrl.value = attribution.websiteUrl ?? "";
  externalImagePath.value = attribution.imagePath ?? "";
  externalImageIsFullPath.value = attribution.isFullImagePath;
  externalLocalizations.value = attribution.additionalLocalizations.map(
    (localization) => ({ ...localization })
  );
}

function buildCreateRequest(): CreateProjectRequest {
  const bodyPlainText = optionalString(projectBodyPlainText.value);
  return {
    projectSlug: projectSlug.value.trim(),
    projectTitle: projectTitle.value.trim(),
    ownerOrganizationSlugs: ownerOrganizationSlugs.value,
    subtitle: optionalString(subtitle.value),
    body: optionalRichTextHtml({
      html: projectBody.value,
      plainText: projectBodyPlainText.value,
    }),
    bodyPlainText,
    bannerPath: optionalString(bannerPath.value),
    bannerIsFullPath: bannerIsFullPath.value,
    contentLocalizations: createContentLocalizations.value,
    languageSettings: {
      targetLanguageCodes:
        createMultilingualSetting.value.additionalLanguageCodes,
      dynamicTranslationEnabled:
        createMultilingualSetting.value.dynamicTranslationEnabled,
    },
    attributions: attributions.value,
    contact: hasContactInput.value
      ? {
          firstName: contactFirstName.value.trim(),
          lastName: optionalString(contactLastName.value),
          roleLabel: optionalString(contactRole.value),
          email: optionalString(contactEmail.value),
          websiteUrl: optionalString(contactWebsite.value),
          imagePath: optionalString(contactImagePath.value),
          isFullImagePath: contactImageIsFullPath.value,
          organizationSlug: contactOrganizationSlug.value ?? undefined,
        }
      : undefined,
  };
}

function buildUpdateRequest(project: AdminProject): UpdateProjectRequest {
  const bodyPlainText = optionalString(manageProjectBodyPlainText.value);
  return {
    currentProjectSlug: project.projectSlug,
    projectSlug: project.projectSlug,
    projectTitle: manageProjectTitle.value.trim(),
    ownerOrganizationSlugs: manageOwnerOrganizationSlugs.value,
    subtitle: optionalString(manageSubtitle.value),
    body: optionalRichTextHtml({
      html: manageProjectBody.value,
      plainText: manageProjectBodyPlainText.value,
    }),
    bodyPlainText,
    bannerPath: optionalString(manageBannerPath.value),
    bannerIsFullPath: manageBannerIsFullPath.value,
    contentLocalizations: manageContentLocalizations.value,
    languageSettings: {
      targetLanguageCodes:
        manageMultilingualSetting.value.additionalLanguageCodes,
      dynamicTranslationEnabled:
        manageMultilingualSetting.value.dynamicTranslationEnabled,
    },
    attributions: manageAttributions.value,
    contact: hasManageContactInput.value
      ? {
          firstName: manageContactFirstName.value.trim(),
          lastName: optionalString(manageContactLastName.value),
          roleLabel: optionalString(manageContactRole.value),
          email: optionalString(manageContactEmail.value),
          websiteUrl: optionalString(manageContactWebsite.value),
          imagePath: optionalString(manageContactImagePath.value),
          isFullImagePath: manageContactImageIsFullPath.value,
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
  projectBody.value = "";
  projectBodyPlainText.value = "";
  isProjectBodyOverLimit.value = false;
  bannerPath.value = "";
  bannerIsFullPath.value = true;
  createContentLocalizations.value = [];
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
  externalImageIsFullPath.value = true;
  externalLocalizations.value = [];
  contactFirstName.value = "";
  contactLastName.value = "";
  contactRole.value = "";
  contactEmail.value = "";
  contactWebsite.value = "";
  contactImagePath.value = "";
  contactImageIsFullPath.value = true;
  contactOrganizationSlug.value = null;
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
    const createdProjectSlug = projectSlug.value.trim();
    const wasCreated = await createProject(buildCreateRequest());
    if (wasCreated) {
      resetForm();
      selectedProjectSlug.value = createdProjectSlug;
      activeTab.value = "manage";
      await refreshProjects();
    }
  } finally {
    isCreating.value = false;
  }
}

async function copySelectedProjectLink(): Promise<void> {
  try {
    await copyToClipboard(selectedProjectPublicUrl.value);
    showCopiedToClipboard();
  } catch (error) {
    console.error("Failed to copy project link:", error);
    showNotifyMessage(t("copyProjectLinkFailed"));
  }
}

async function requestSaveSelectedProject(): Promise<void> {
  const project = selectedProject.value;
  if (!canSaveProject.value || project === undefined) {
    return;
  }

  await saveSelectedProject();
}

function requestProjectSlugUpdate(): void {
  if (!canSaveProjectSlug.value) {
    return;
  }

  showProjectSlugConfirmDialog.value = true;
}

async function saveProjectSlug(): Promise<void> {
  const project = selectedProject.value;
  if (!canSaveProjectSlug.value || project === undefined) {
    return;
  }

  isSavingProject.value = true;
  const newProjectSlug = selectedProjectSlugDraft.value.trim();
  const wasUpdated = await updateProjectSlug({
    currentProjectSlug: project.projectSlug,
    newProjectSlug,
  });
  isSavingProject.value = false;

  if (wasUpdated) {
    showProjectSlugConfirmDialog.value = false;
    selectedProjectSlug.value = newProjectSlug;
    await refreshProjects({ refreshSelectedDetails: false });
  }
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

async function deleteSelectedProject(): Promise<void> {
  const project = selectedProject.value;
  if (project === undefined || isDeletingProject.value) {
    return;
  }

  isDeletingProject.value = true;
  const success = await deleteProject({ projectSlug: project.projectSlug });
  isDeletingProject.value = false;

  if (success) {
    showProjectDeleteConfirmDialog.value = false;
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
  padding-bottom: max(3rem, calc(env(safe-area-inset-bottom) + 2rem));
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

.header-form-grid {
  margin-top: 1rem;
}

.grid-full {
  grid-column: 1 / -1;
}

.language-expansion {
  border: 1px solid #e9e9f1;
  border-radius: 0.75rem;
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

.danger-zone-card {
  margin-top: 1rem;
  overflow: hidden;
  border: 1px solid rgba($negative, 0.35);
}

.danger-zone-title {
  padding: 1rem 1rem 0.75rem;
  color: $negative;
  font-size: 1.15rem;
  font-weight: var(--font-weight-semibold);
}

.danger-zone-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  border-top: 1px solid rgba($negative, 0.22);
}

.danger-zone-content {
  min-width: 0;
  flex: 1;
}

.danger-zone-row-title {
  font-weight: var(--font-weight-semibold);
}

.danger-zone-description {
  margin-top: 0.25rem;
  color: $color-text-weak;
  line-height: 1.35;
}

.danger-zone-input {
  max-width: 28rem;
  margin-top: 0.75rem;
}

.danger-zone-action {
  flex: 0 0 auto;
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

.create-button {
  margin-bottom: 1.5rem;
}

@media (max-width: 600px) {
  .danger-zone-row {
    align-items: stretch;
    flex-direction: column;
  }

  .create-button {
    margin-bottom: 0.5rem;
  }
}
</style>
