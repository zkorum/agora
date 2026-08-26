<template>
  <PageLoadingSpinner v-if="isLoading" />

  <ErrorRetryBlock
    v-else-if="loadError !== undefined"
    :title="loadError"
    :retry-label="t('tryAgain')"
    @retry="loadConfiguration"
  />

  <div v-else-if="configuration?.hasEntitlement" class="section">
    <ProjectConversationUpdatesActivation
      :model-value="configuration.defaultEnabled"
      activation-kind="no-project-container"
      :project-title="organizationName"
      :has-participant-contact-email="configuration.contact !== undefined"
      :has-entitlement="configuration.hasEntitlement"
      :disabled="isSaving || isContactDirty"
      @update:model-value="updateDefaultEnabled"
      @edit-contact="focusContactName"
    />

    <ZKCard padding="1rem" class="card-background">
      <form ref="contactForm" class="section" @submit.prevent="saveContact">
        <AdminSectionHeader
          :title="t('contactTitle')"
          :description="t('contactDescription')"
        />
        <div class="form-grid">
          <q-input
            ref="contactNameInput"
            :model-value="contactName"
            outlined
            :label="t('contactNameLabel')"
            autocomplete="name"
            :disable="isSaving"
            @update:model-value="setContactName"
          />
          <q-input
            :model-value="contactEmail"
            outlined
            type="email"
            :label="t('contactEmailLabel')"
            autocomplete="email"
            :disable="isSaving"
            @update:model-value="setContactEmail"
          />
        </div>
        <p
          v-if="
            configuration.contact !== undefined &&
            !configuration.canDeleteContact
          "
          class="contact-hint"
        >
          {{ t("contactInUse") }}
        </p>
        <div class="actions">
          <ZKButton
            button-type="largeButton"
            :label="t('saveContact')"
            type="submit"
            color="primary"
            :loading="isSaving"
            :disable="!canSaveContact"
          />
          <ZKButton
            v-if="configuration.contact !== undefined"
            button-type="largeButton"
            :label="t('deleteContact')"
            color="negative"
            outline
            :disable="!configuration.canDeleteContact || isSaving"
            @click="showDeleteConfirmDialog = true"
          />
        </div>
      </form>
    </ZKCard>
  </div>

  <ZKConfirmDialog
    v-model="showDeleteConfirmDialog"
    :title="t('deleteContact')"
    :message="t('deleteConfirmation')"
    :confirm-text="t('deleteContact')"
    :cancel-text="t('cancel')"
    variant="destructive"
    @confirm="deleteContact"
  />
</template>

<script setup lang="ts">
import AdminSectionHeader from "src/components/administrator/AdminSectionHeader.vue";
import {
  type ProjectConversationUpdatesActivationTranslations,
  projectConversationUpdatesActivationTranslations,
} from "src/components/administrator/project/ProjectConversationUpdatesActivation.i18n";
import ProjectConversationUpdatesActivation from "src/components/administrator/project/ProjectConversationUpdatesActivation.vue";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { inputToString } from "src/pages/settings/account/administrator/organization/organizationAdminForm";
import {
  type AdminNoProjectEmailUpdatesConfiguration,
  Dto,
} from "src/shared/types/dto";
import { useBackendAdministratorOrganizationApi } from "src/utils/api/administrator/organization";
import { useNotify } from "src/utils/ui/notify";
import { computed, nextTick, ref, watch } from "vue";

import {
  type OrganizationNoProjectEmailUpdatesTranslations,
  organizationNoProjectEmailUpdatesTranslations,
} from "./OrganizationNoProjectEmailUpdates.i18n";

const props = defineProps<{
  organizationSlug: string;
  organizationName: string;
}>();

const { t } = useComponentI18n<OrganizationNoProjectEmailUpdatesTranslations>(
  organizationNoProjectEmailUpdatesTranslations
);
const { t: tActivation } =
  useComponentI18n<ProjectConversationUpdatesActivationTranslations>(
    projectConversationUpdatesActivationTranslations
  );
const { getNoProjectEmailUpdates, updateNoProjectEmailUpdates } =
  useBackendAdministratorOrganizationApi();
const { showNotifyMessage } = useNotify();
const configuration = ref<AdminNoProjectEmailUpdatesConfiguration>();
const contactName = ref("");
const contactEmail = ref("");
const contactForm = ref<HTMLFormElement>();
const contactNameInput = ref<{ focus: () => void }>();
const isSaving = ref(false);
const isLoading = ref(true);
const loadError = ref<string>();
const showDeleteConfirmDialog = ref(false);
let loadRequestId = 0;

const contactRequest = computed(() =>
  Dto.updateAdminNoProjectEmailUpdatesRequest.safeParse({
    organizationSlug: props.organizationSlug,
    defaultEnabled: configuration.value?.defaultEnabled ?? false,
    contact: {
      name: contactName.value,
      email: contactEmail.value,
    },
  })
);
const canSaveContact = computed(
  () => !isSaving.value && contactRequest.value.success
);
const isContactDirty = computed(() => {
  const savedContact = configuration.value?.contact;
  return (
    contactName.value !== (savedContact?.name ?? "") ||
    contactEmail.value !== (savedContact?.email ?? "")
  );
});

watch(
  () => props.organizationSlug,
  async () => {
    await loadConfiguration();
  },
  { immediate: true }
);

async function loadConfiguration(): Promise<void> {
  const requestId = ++loadRequestId;
  isLoading.value = true;
  loadError.value = undefined;
  configuration.value = undefined;
  const response = await getNoProjectEmailUpdates({
    organizationSlug: props.organizationSlug,
  });
  if (requestId !== loadRequestId) {
    return;
  }
  isLoading.value = false;
  if (response === undefined) {
    loadError.value = t("configurationUnavailable");
    return;
  }
  if (!response.success) {
    loadError.value = t("organizationNotFound");
    return;
  }
  setConfiguration(response.configuration);
}

function setConfiguration(
  nextConfiguration: AdminNoProjectEmailUpdatesConfiguration
): void {
  configuration.value = nextConfiguration;
  contactName.value = nextConfiguration.contact?.name ?? "";
  contactEmail.value = nextConfiguration.contact?.email ?? "";
  showDeleteConfirmDialog.value = false;
}

function setContactName(value: unknown): void {
  contactName.value = inputToString(value);
}

function setContactEmail(value: unknown): void {
  contactEmail.value = inputToString(value);
}

async function focusContactName(): Promise<void> {
  await nextTick();
  contactForm.value?.scrollIntoView({ behavior: "smooth", block: "center" });
  contactNameInput.value?.focus();
}

async function updateDefaultEnabled(defaultEnabled: boolean): Promise<void> {
  const current = configuration.value;
  if (
    current === undefined ||
    isSaving.value ||
    isContactDirty.value ||
    defaultEnabled === current.defaultEnabled
  ) {
    return;
  }
  const organizationSlug = props.organizationSlug;
  configuration.value = { ...current, defaultEnabled };
  const result = await updateConfiguration({
    defaultEnabled,
    contact: current.contact,
    successMessage: tActivation(
      defaultEnabled ? "defaultEnabledSaved" : "defaultDisabledSaved"
    ),
  });
  if (result === "failed" && organizationSlug === props.organizationSlug) {
    configuration.value = current;
  }
}

async function saveContact(): Promise<void> {
  if (!contactRequest.value.success) {
    return;
  }
  await updateConfiguration({
    defaultEnabled: contactRequest.value.data.defaultEnabled,
    contact: contactRequest.value.data.contact,
    successMessage: t("saved"),
  });
}

async function deleteContact(): Promise<void> {
  const current = configuration.value;
  if (current === undefined || !current.canDeleteContact || isSaving.value) {
    return;
  }
  await updateConfiguration({
    defaultEnabled: current.defaultEnabled,
    contact: undefined,
    successMessage: t("saved"),
  });
}

type UpdateConfigurationResult = "saved" | "failed" | "stale";

async function updateConfiguration({
  defaultEnabled,
  contact,
  successMessage,
}: {
  defaultEnabled: boolean;
  contact: { name: string; email: string } | undefined;
  successMessage: string;
}): Promise<UpdateConfigurationResult> {
  const organizationSlug = props.organizationSlug;
  const request = Dto.updateAdminNoProjectEmailUpdatesRequest.safeParse({
    organizationSlug,
    defaultEnabled,
    contact,
  });
  if (!request.success) {
    showNotifyMessage(t("missingContact"));
    return "failed";
  }
  isSaving.value = true;
  const response = await updateNoProjectEmailUpdates(request.data);
  isSaving.value = false;
  if (organizationSlug !== props.organizationSlug) {
    return "stale";
  }
  if (response === undefined) {
    return "failed";
  }
  if (!response.success) {
    showNotifyMessage(
      t(
        response.reason === "contact_in_use"
          ? "contactInUse"
          : response.reason === "entitlement_required"
            ? "entitlementRequired"
            : "organizationNotFound"
      )
    );
    return "failed";
  }
  setConfiguration(response.configuration);
  showNotifyMessage(successMessage);
  return "saved";
}
</script>

<style scoped lang="scss">
.section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-background {
  background: white;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 1rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;

  > * {
    flex: 1 1 12rem;
  }
}

.contact-hint {
  margin: 0;
  color: $color-text-weak;
  font-size: 0.85rem;
}
</style>
