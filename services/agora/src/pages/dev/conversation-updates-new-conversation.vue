<template>
  <NewConversationLayout v-slot="{ isActive }">
    <Teleport v-if="isActive" to="#page-header">
      <DefaultMenuBar :click-to-scroll-top="false">
        <template #left>
          <BackButton fallback-route="/dev/conversation-updates" />
        </template>
        <template #right>
          <PrimeButton :label="formActionLabel" @click="requestFormAction" />
        </template>
      </DefaultMenuBar>
    </Teleport>

    <div class="container">
      <ZKInfoBanner
        message="Dev fixture using the real new-conversation layout and controls. Nothing is saved. Both listed-project and No Project defaults start Off."
      />

      <q-expansion-item
        default-opened
        icon="mdi-test-tube"
        label="Email Updates test controls"
        class="test-controls"
      >
        <div class="test-controls__content">
          <q-btn-toggle
            v-model="formMode"
            spread
            no-caps
            unelevated
            toggle-color="primary"
            color="white"
            text-color="primary"
            :options="formModeOptions"
          />
          <label>
            <span>
              <strong>Organization has entitlement</strong>
              <small
                >Without entitlement, no update controls are rendered.</small
              >
            </span>
            <ZKSwitch v-model="hasEntitlement" />
          </label>
          <label>
            <span>
              <strong>Civic Cooling Plan default</strong>
              <small
                >Default Off. On enables inheritance for all conversations.</small
              >
            </span>
            <ZKSwitch v-model="civicCoolingPlanDefaultEnabled" />
          </label>
          <label>
            <span>
              <strong>No Project default</strong>
              <small
                >Default Off. Owners can override individual conversations.</small
              >
            </span>
            <ZKSwitch v-model="noProjectDefaultEnabled" />
          </label>
          <small class="test-controls__hint">
            Use the real project control below to switch between Civic Cooling
            Plan and No Project. Use the real participation control to choose
            account, guest, or strong verification and exercise the limited
            email-reach confirmation.
          </small>
        </div>
      </q-expansion-item>

      <NewConversationControlBar
        v-model:is-private="isPrivate"
        v-model:participation-mode="participationMode"
        v-model:requires-event-ticket="requiresEventTicket"
        v-model:post-as="postAs"
        v-model:conversation-type-config="conversationTypeConfig"
        v-model:import-settings="importSettings"
        v-model:external-source-config="externalSourceConfig"
        v-model:title="title"
        v-model:content="content"
        v-model:multilingual-setting="multilingualSetting"
        v-model:ai-labeling-enabled="aiLabelingEnabled"
        v-model:preferred-opinion-group-count="preferredOpinionGroupCount"
        :is-edit-mode="formMode === 'edit'"
        :hide-language-setting="selectedProjectSlug !== undefined"
      >
        <template #extra-controls>
          <CreateConversationProjectLanguageSettings
            v-model:selected-project-slug="selectedProjectSlug"
            v-model:inherit-project-languages="inheritProjectLanguages"
            v-model:override-multilingual-setting="multilingualSetting"
            :project-list="projectFixtures"
          />
          <CreateConversationUpdatesSettings
            v-model="currentConversationUpdatesEnabled"
            conversation-title="Where should neighborhood cooling centers open?"
            :scope-kind="scopeKind"
            :project-title="selectedProject?.title"
            :scope-default-enabled="currentProjectDefaultEnabled"
            :inherits-scope-default="currentConversationInheritsDefault"
            :has-entitlement="hasEntitlement"
          />
        </template>
      </NewConversationControlBar>

      <ZKConfirmDialog
        v-model="showPartialReachDialog"
        :title="t('partialReachTitle')"
        :message="partialReachConfirmationMessage"
        :confirm-text="t('keepUpdatesOn')"
        :cancel-text="t('enforceEmailVerificationOnly')"
        cancel-severity="primary"
        :cancel-outlined="false"
        :alternate-text="t('turnUpdatesOff')"
        alternate-severity="primary"
        :persistent="true"
        variant="warning"
        @confirm="keepConversationUpdatesOn"
        @cancel="enforceEmailVerification"
        @alternate="continueWithoutConversationUpdates"
      />

      <ZKInfoBanner v-if="notice !== undefined" :message="notice" />

      <div class="contentFlexStyle">
        <Editor
          v-model="title"
          placeholder="Conversation title"
          :show-toolbar="false"
          :single-line="true"
          :disabled="false"
          :max-length="MAX_LENGTH_TITLE"
          :show-character-count="true"
          min-height="auto"
          class="title-editor"
        />
        <div class="editor-style">
          <Editor
            v-model="content"
            placeholder="What should participants know?"
            min-height="5rem"
            :show-toolbar="true"
            :single-line="false"
            :disabled="false"
            :max-length="MAX_LENGTH_CONVERSATION_BODY"
            :show-character-count="true"
          />
        </div>
      </div>
    </div>
  </NewConversationLayout>
</template>

<script setup lang="ts">
import Button from "primevue/button";
import Editor from "src/components/editor/Editor.vue";
import BackButton from "src/components/navigation/buttons/BackButton.vue";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import { hasConversationUpdatesPartialEmailReach } from "src/components/newConversation/conversationUpdatesParticipation";
import type { CreateConversationProjectLanguageProject } from "src/components/newConversation/CreateConversationProjectLanguageSettings.vue";
import CreateConversationProjectLanguageSettings from "src/components/newConversation/CreateConversationProjectLanguageSettings.vue";
import CreateConversationUpdatesSettings from "src/components/newConversation/CreateConversationUpdatesSettings.vue";
import NewConversationControlBar from "src/components/newConversation/NewConversationControlBar.vue";
import NewConversationLayout from "src/components/newConversation/NewConversationLayout.vue";
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import ZKInfoBanner from "src/components/ui-library/ZKInfoBanner.vue";
import ZKSwitch from "src/components/ui-library/ZKSwitch.vue";
import { useConversationDraft } from "src/composables/conversation/draft";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  MAX_LENGTH_CONVERSATION_BODY,
  MAX_LENGTH_TITLE,
} from "src/shared/shared";
import type { ConversationTypeConfig } from "src/shared/types/zod";
import { computed, ref, watch } from "vue";

import {
  type ConversationUpdatesNewConversationTranslations,
  conversationUpdatesNewConversationTranslations,
} from "./conversation-updates-new-conversation.i18n";

defineOptions({
  components: {
    PrimeButton: Button,
  },
});

const { t } = useComponentI18n<ConversationUpdatesNewConversationTranslations>(
  conversationUpdatesNewConversationTranslations
);

type FormMode = "create" | "edit";

const projectFixtures: CreateConversationProjectLanguageProject[] = [
  {
    slug: "civic-cooling-plan",
    title: "Civic Cooling Plan",
    directoryVisible: true,
    deletedAt: null,
    defaultLanguageCode: "en",
    languageSettings: {
      targetLanguageCodes: ["fr", "es"],
      dynamicTranslationEnabled: true,
    },
  },
];

const {
  title,
  content,
  multilingualSetting,
  selectedProjectSlug,
  inheritProjectLanguages,
  conversationType,
  rankingMode,
  isPrivate,
  participationMode,
  requiresEventTicket,
  aiLabelingEnabled,
  preferredOpinionGroupCount,
  postAs,
  importSettings,
  externalSourceConfig,
} = useConversationDraft({ syncToStore: false });

title.value = "Where should neighborhood cooling centers open?";
content.value =
  "<p>Help identify accessible locations for cooling centers during extreme heat.</p>";

const formMode = ref<FormMode>("create");
const formModeOptions: { label: string; value: FormMode }[] = [
  { label: "Create · Next", value: "create" },
  { label: "Edit · Save", value: "edit" },
];
const hasEntitlement = ref(true);
const projectDefaultBySlug = ref<Readonly<Record<string, boolean>>>({
  "civic-cooling-plan": false,
});
const noProjectDefaultEnabled = ref(false);
const listedConversationOverride = ref<boolean | undefined>(undefined);
const noProjectConversationOverride = ref<boolean | undefined>(undefined);
const showPartialReachDialog = ref(false);
const notice = ref<string | undefined>(undefined);

const conversationTypeConfig = computed({
  get: (): ConversationTypeConfig =>
    conversationType.value === "ranking"
      ? {
          conversationType: "ranking",
          rankingMode: rankingMode.value ?? "bws",
        }
      : { conversationType: "polis" },
  set: (value: ConversationTypeConfig) => {
    conversationType.value = value.conversationType;
    rankingMode.value =
      value.conversationType === "ranking" ? value.rankingMode : undefined;
  },
});
const selectedProject = computed(() =>
  projectFixtures.find((project) => project.slug === selectedProjectSlug.value)
);
const civicCoolingPlanDefaultEnabled = computed({
  get: () => projectDefaultBySlug.value["civic-cooling-plan"] ?? false,
  set: (enabled: boolean) => {
    projectDefaultBySlug.value = {
      ...projectDefaultBySlug.value,
      "civic-cooling-plan": enabled,
    };
  },
});
const scopeKind = computed<"no-project" | "project">(() =>
  selectedProject.value === undefined ? "no-project" : "project"
);
const currentProjectDefaultEnabled = computed(() =>
  scopeKind.value === "project"
    ? (projectDefaultBySlug.value[selectedProjectSlug.value ?? ""] ?? false)
    : noProjectDefaultEnabled.value
);
const currentConversationOverride = computed(() =>
  scopeKind.value === "project"
    ? listedConversationOverride.value
    : noProjectConversationOverride.value
);
const currentConversationInheritsDefault = computed(
  () => currentConversationOverride.value === undefined
);
const currentConversationUpdatesEnabled = computed({
  get: () =>
    currentConversationOverride.value ?? currentProjectDefaultEnabled.value,
  set: (enabled: boolean) => {
    const override =
      enabled === currentProjectDefaultEnabled.value ? undefined : enabled;
    if (scopeKind.value === "project") {
      listedConversationOverride.value = override;
      return;
    }
    noProjectConversationOverride.value = override;
  },
});
const conversationUpdatesEffectivelyEnabled = computed(
  () =>
    hasEntitlement.value &&
    currentConversationUpdatesEnabled.value
);
const partialReachConfirmationMessage = computed(() => {
  if (participationMode.value === "strong_verification") {
    return t("strongVerificationPartialReach");
  }
  if (participationMode.value === "guest") {
    return t("guestPartialReach");
  }
  return t("accountPartialReach");
});
const partialReachNotice = computed(() => {
  const participationDescription =
    participationMode.value === "strong_verification"
      ? "uses strong verification"
      : participationMode.value === "guest"
        ? "allows guest participation"
        : "allows any account";
  return `Email Updates is on, but this conversation ${participationDescription} and does not require email. Only participants who voluntarily verified an email in Settings will see the onboarding opt-in, so most may not receive updates.`;
});
const formActionLabel = computed(() =>
  formMode.value === "create" ? "Next" : "Save"
);

watch(
  [participationMode, conversationUpdatesEffectivelyEnabled],
  ([mode, updatesEnabled], [previousMode, updatesWereEnabled]) => {
    notice.value = undefined;
    if (
      updatesEnabled &&
      hasConversationUpdatesPartialEmailReach(mode) &&
      (!updatesWereEnabled || mode !== previousMode)
    ) {
      showPartialReachDialog.value = true;
    }
  }
);

function requestFormAction(): void {
  simulateFormAction();
}

function continueWithoutConversationUpdates(): void {
  currentConversationUpdatesEnabled.value = false;
  showPartialReachDialog.value = false;
  notice.value =
    "Email Updates turned off. The selected participation method was kept.";
}

function keepConversationUpdatesOn(): void {
  currentConversationUpdatesEnabled.value = true;
  showPartialReachDialog.value = false;
  notice.value = partialReachNotice.value;
}

function enforceEmailVerification(): void {
  participationMode.value = "email_verification";
  currentConversationUpdatesEnabled.value = true;
  showPartialReachDialog.value = false;
  notice.value = t("emailVerificationEnabled");
}

function simulateFormAction(): void {
  notice.value =
    formMode.value === "create"
      ? "Next simulated. The real flow would continue to its survey or seed step."
      : "Save simulated with participation mode and Email Updates applied together.";
}
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding-block: 0.5rem 8rem;
}

.test-controls {
  overflow: hidden;
  border: 1px solid $grey-4;
  border-radius: 1rem;
  background: $color-background-default;

  &__content {
    display: grid;
    gap: 1rem;
    padding: 1rem;
    border-top: 1px solid $grey-4;
  }

  label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;

    span {
      display: grid;
      gap: 0.2rem;
    }

    small {
      color: $grey-7;
    }
  }

  &__hint {
    color: $grey-7;
    line-height: 1.45;
  }
}

.title-editor,
.editor-style {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
}

.editor-style {
  margin-bottom: 2rem;
  font-size: 1rem;
}

.contentFlexStyle {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
