<template>
  <NewConversationLayout v-slot="{ isActive }">
    <Teleport v-if="isActive" to="#page-header">
      <DefaultMenuBar :click-to-scroll-top="false">
        <template #left
          ><BackButton :fallback-route="detailsRoute" @click="handleBack"
        /></template>
        <template #right
          ><PrimeButton
            :label="editT('saveButton')"
            :loading="isSaving"
            :disabled="isSaveDisabled"
            @click="save"
        /></template>
      </DefaultMenuBar>
    </Teleport>

    <div v-if="session !== undefined" class="container">
      <ConversationTitle
        :is-private="session.form.isPrivate"
        :title="session.form.title"
        size="large"
        :conversation-type-config="session.form.conversationTypeConfig"
        :external-source-config="session.original.externalSourceConfig"
        :project-context="undefined"
        project-context-title-mode="original"
      />

      <section v-if="participantPolicyNeedsRefresh" role="alert">
        <p>{{ participantT("changed") }}</p>
        <PrimeButton
          :label="participantT('reload')"
          :loading="isSaving"
          @click="reloadParticipantPolicy"
        />
      </section>
      <ParticipantStatementsSetting
        v-model="session.form.participantStatements"
        :disabled="
          isSaving ||
          participantPolicyNeedsRefresh ||
          session.original.isLocked ||
          !session.original.editPermissions.canEditNormalSettings
        "
      />
      <section
        v-if="session.original.qvStatements !== undefined"
        class="statement-section"
      >
        <p class="description">
          {{ qvT("budget", { credits: CREDIT_VOTING_BUDGET }) }}
        </p>
        <div v-if="session.qvStatementsNeedRefresh" role="alert">
          <p>{{ qvT("conflict") }}</p>
          <PrimeButton
            :label="qvT('reloadStatements')"
            :loading="isSaving"
            @click="reloadQvStatements"
          />
        </div>
        <q-toggle
          v-if="
            session.form.conversationTypeConfig.conversationType ===
              'prioritizing' &&
            session.form.conversationTypeConfig.prioritizationType === 'qv'
          "
          :model-value="session.form.conversationTypeConfig.allowOpposition"
          :label="qvT('opposition')"
          disable
        />
        <p
          v-if="!session.original.qvStatements.editing.allowed"
          role="status"
          class="description"
        >
          {{
            qvT(
              session.original.qvStatements.editing.reason === "closed"
                ? "closed"
                : session.original.qvStatements.editing.reason ===
                    "participation_started"
                  ? "locked"
                  : "notAllowed"
            )
          }}
        </p>
        <QvStatementListEditor
          ref="qvEditor"
          v-model="qvStatements"
          :disabled="isSaving || !session.original.qvStatements.editing.allowed"
          :allow-add="false"
        />
      </section>
      <section v-else class="statement-section">
        <h2>{{ t("existingTitle") }}</h2>
        <p class="description">
          {{
            session.original.externalSourceConfig === null
              ? t("draftDescription")
              : t("sourceManaged")
          }}
        </p>
        <p
          v-if="session.original.seedOpinions.length === 0"
          class="description"
        >
          {{ t("emptyExisting") }}
        </p>
        <ExistingSeedOpinionListEditor
          ref="existingSeedEditor"
          v-model="existingSeedOpinions"
          :editable="session.original.canAddSeedOpinions"
          :disabled="isSaving"
        />
      </section>

      <section
        v-if="
          session.original.qvStatements === undefined &&
          session.original.canAddSeedOpinions
        "
        class="statement-section"
      >
        <h2>{{ t("newTitle") }}</h2>
        <SeedOpinionEditor
          ref="seedEditor"
          v-model="newSeedOpinions"
          :suggestion-context="{
            aiSuggestionDraftId: session.aiSuggestionDraftId,
            title: session.form.title,
            content: session.form.content,
            conversationType:
              session.form.conversationTypeConfig.conversationType,
            externalSourceConfig: session.original.externalSourceConfig,
            postAs: session.postAs,
          }"
          :existing-opinions="survivingSeedOpinions"
          :disabled="isSaving"
          :edit-conversation-route="detailsRoute"
          @edit-conversation="handleBack"
        />
      </section>
      <ZKCard
        v-else-if="!session.original.editPermissions.canEditConversationContent"
        padding="1rem"
      >
        {{ editT("premiumEditRestrictedBanner") }}
      </ZKCard>
    </div>

    <EditConversationRouteGuard
      ref="routeGuard"
      :conversation-slug-id="conversationSlugId"
      :has-unsaved-changes="hasUnsavedChanges"
      :navigation-pending="isSaving"
    />
  </NewConversationLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import Button from "primevue/button";
import ConversationTitle from "src/components/features/conversation/ConversationTitle.vue";
import BackButton from "src/components/navigation/buttons/BackButton.vue";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import { conversationProjectEditTranslations } from "src/components/newConversation/conversationProjectEdit.i18n";
import { conversationTypeEditingTranslations } from "src/components/newConversation/conversationTypeEditing.i18n";
import { createConversationUpdatesSettingsTranslations } from "src/components/newConversation/CreateConversationUpdatesSettings.i18n";
import EditConversationRouteGuard from "src/components/newConversation/EditConversationRouteGuard.vue";
import ExistingSeedOpinionListEditor from "src/components/newConversation/ExistingSeedOpinionListEditor.vue";
import NewConversationLayout from "src/components/newConversation/NewConversationLayout.vue";
import { participantStatementsTranslations } from "src/components/newConversation/ParticipantStatements.i18n";
import ParticipantStatementsSetting from "src/components/newConversation/ParticipantStatementsSetting.vue";
import QvStatementListEditor from "src/components/newConversation/QvStatementListEditor.vue";
import { qvStatementsTranslations } from "src/components/newConversation/QvStatements.i18n";
import SeedOpinionEditor from "src/components/newConversation/SeedOpinionEditor.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import type { QvStatementDraft } from "src/composables/conversation/draft/conversationDraft.types";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { UpdateConversationResponse } from "src/shared/types/dto";
import { CREDIT_VOTING_BUDGET } from "src/shared/utils/qv";
import { useAuthenticationStore } from "src/stores/authentication";
import {
  buildEditConversationRequest,
  buildQvStatementUpdate,
  buildSeedOpinionChanges,
  type ExistingSeedOpinionDraft,
  useEditConversationStore,
} from "src/stores/editConversation";
import { useBackendPostEditApi } from "src/utils/api/post/postEdit";
import { useUpdateConversationMutation } from "src/utils/api/post/useConversationMutations";
import {
  isHistoryBackToPath,
  navigateBackOrReplace,
} from "src/utils/nav/historyBack";
import { getConversationEditReturnPath } from "src/utils/router/conversationEditReturn";
import { getSingleRouteParam } from "src/utils/router/params";
import { useNotify } from "src/utils/ui/notify";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { editConversationTranslations } from "../index.i18n";
import { editSeedOpinionsTranslations } from "./index.i18n";

defineOptions({ components: { PrimeButton: Button } });
const { t } = useComponentI18n(editSeedOpinionsTranslations);
const { t: qvT } = useComponentI18n(qvStatementsTranslations);
const { t: participantT } = useComponentI18n(participantStatementsTranslations);
const { getConversationForEdit } = useBackendPostEditApi();
const qvEditor = ref<InstanceType<typeof QvStatementListEditor>>();
const { t: editT } = useComponentI18n(editConversationTranslations);
const { t: projectT } = useComponentI18n(conversationProjectEditTranslations);
const { t: updatesT } = useComponentI18n(
  createConversationUpdatesSettingsTranslations
);
const route = useRoute();
const router = useRouter();
const conversationSlugId = computed(() =>
  getSingleRouteParam(route.params.conversationSlugId)
);
const store = useEditConversationStore();
const auth = useAuthenticationStore();
const { t: typeT } = useComponentI18n(conversationTypeEditingTranslations);
const { session: storedSession } = storeToRefs(store);
const session = computed(() =>
  storedSession.value?.original.conversationSlugId === conversationSlugId.value
    ? storedSession.value
    : undefined
);
const participantPolicyNeedsRefresh = computed({
  get: () => session.value?.participantPolicyNeedsRefresh ?? false,
  set: (value: boolean) => {
    if (session.value !== undefined)
      session.value.participantPolicyNeedsRefresh = value;
  },
});
const { showNotifyMessage } = useNotify();
const mutation = useUpdateConversationMutation();
const isSaving = computed(() => session.value?.isSaving ?? false);
const seedEditor = ref<InstanceType<typeof SeedOpinionEditor>>();
const existingSeedEditor =
  ref<InstanceType<typeof ExistingSeedOpinionListEditor>>();
const routeGuard = ref<InstanceType<typeof EditConversationRouteGuard>>();
const detailsRoute = computed(() => ({
  name: "/conversation/[conversationSlugId]/edit/" as const,
  params: { conversationSlugId: conversationSlugId.value },
  query: route.query,
}));
const newSeedOpinions = computed({
  get: () => session.value?.newSeedOpinions ?? [],
  set: (value: string[]) => {
    if (session.value !== undefined) session.value.newSeedOpinions = value;
  },
});
const existingSeedOpinions = computed({
  get: () => session.value?.existingSeedOpinions ?? [],
  set: (value: ExistingSeedOpinionDraft[]) => {
    if (session.value !== undefined) session.value.existingSeedOpinions = value;
  },
});
const survivingSeedOpinions = computed(() =>
  existingSeedOpinions.value
    .filter((opinion) => !opinion.deleted)
    .map((opinion) => opinion.content)
);
const hasUnsavedChanges = computed(
  () => session.value !== undefined && store.hasUnsavedChanges
);
const isSaveDisabled = computed(
  () =>
    isSaving.value ||
    participantPolicyNeedsRefresh.value ||
    session.value?.qvStatementsNeedRefresh === true ||
    !hasUnsavedChanges.value ||
    (session.value?.original.qvStatements !== undefined &&
      !session.value.original.qvStatements.editing.allowed &&
      buildQvStatementUpdate(session.value) !== undefined)
);
const qvStatements = computed({
  get: () => session.value?.qvStatements ?? [],
  set: (value: QvStatementDraft[]) => {
    if (session.value !== undefined) session.value.qvStatements = value;
  },
});

watch(
  [conversationSlugId, () => auth.userId],
  async () => {
    if (session.value === undefined) {
      await router.replace({
        ...detailsRoute.value,
        query: { ...route.query, editStep: "seed" },
      });
    }
  },
  { immediate: true }
);

async function handleBack(event: MouseEvent): Promise<void> {
  event.preventDefault();
  if (isSaving.value) return;
  await navigateBackOrReplace({
    router,
    fallbackRoute: detailsRoute.value,
    shouldNavigateBack: isHistoryBackToPath({
      historyBack: window.history.state?.back,
      expectedPath: router.resolve(detailsRoute.value).fullPath,
    }),
  });
}

function showSaveFailure(
  response: Extract<UpdateConversationResponse, { success: false }>
): void {
  switch (response.reason) {
    case "participant_statements_changed":
      showNotifyMessage(participantT("changed"));
      return;
    case "participant_statements_unsupported":
      showNotifyMessage(participantT("disabled"));
      return;
    case "conversation_type_fixed":
      showNotifyMessage(typeT("fixed"));
      return;
    case "conversation_type_changed":
      showNotifyMessage(typeT("changed"));
      return;
    case "qv_statement_change_rejected":
      showNotifyMessage(qvT("conflict"));
      return;
    case "project_not_available":
      showNotifyMessage(projectT("projectUnavailableError"));
      return;
    case "missing_project_capability":
      showNotifyMessage(projectT("projectPermissionError"));
      return;
    case "project_assignment_changed":
      showNotifyMessage(projectT("projectChangedError"));
      return;
    case "invalid_seed_opinion":
      if (response.seedOpinionSlugId !== undefined) {
        existingSeedEditor.value?.showFailure({
          slugId: response.seedOpinionSlugId,
          failure: response.seedOpinionFailure,
        });
      } else seedEditor.value?.showFailure(response.seedOpinionFailure);
      return;
    case "seed_opinion_change_rejected":
      existingSeedEditor.value?.showChangeFailure(response);
      return;
    case "not_found":
      showNotifyMessage(editT("notFoundError"));
      return;
    case "not_author":
      showNotifyMessage(editT("notAuthorError"));
      return;
    case "conversation_locked":
      showNotifyMessage(editT("conversationLockedError"));
      return;
    case "invalid_access_settings":
      showNotifyMessage(editT("invalidAccessSettingsError"));
      return;
    case "premium_access_expired":
      showNotifyMessage(editT("premiumAccessExpiredError"));
      return;
    case "premium_access_required":
      showNotifyMessage(editT("premiumAccessRequiredError"));
      return;
    case "feature_not_available":
      showNotifyMessage(projectT("emailUpdatesUnavailableError"));
      return;
    case "missing_participant_contact_email":
      showNotifyMessage(updatesT("missingContact"));
      return;
    case "active_delivery_conflict":
      showNotifyMessage(projectT("activeDeliveryError"));
      return;
    case "seed_opinions_not_allowed":
    case "plain_text_too_long":
    case "html_too_long":
      showNotifyMessage(editT("updateError"));
  }
}

async function save(): Promise<void> {
  const current = session.value;
  if (current === undefined || isSaveDisabled.value) return;
  if (
    current.original.qvStatements !== undefined &&
    qvEditor.value?.validate() !== true
  )
    return;
  if (
    current.original.qvStatements === undefined &&
    current.original.canAddSeedOpinions &&
    (existingSeedEditor.value?.validate() !== true ||
      seedEditor.value?.validate() !== true)
  )
    return;
  current.isSaving = true;
  try {
    const response = await mutation.mutateAsync({
      ...buildEditConversationRequest(current),
      newSeedOpinionList: [...current.newSeedOpinions],
      seedOpinionChanges: buildSeedOpinionChanges(current),
      qvStatementUpdate: buildQvStatementUpdate(current),
    });
    if (session.value !== current) return;
    if (!response.success) {
      if (response.reason === "participant_statements_changed")
        participantPolicyNeedsRefresh.value = true;
      showSaveFailure(response);
      if (response.reason === "qv_statement_change_rejected") {
        current.qvStatementsNeedRefresh = true;
        const fresh = await getConversationForEdit(
          current.original.conversationSlugId
        );
        if (
          session.value === current &&
          fresh.success &&
          fresh.qvStatements !== undefined &&
          current.original.qvStatements !== undefined
        )
          current.original.qvStatements.editing = fresh.qvStatements.editing;
      }
      return;
    }
    showNotifyMessage(editT("updateSuccess"));
    routeGuard.value?.unlockRoute();
    store.clear();
    await router.push(
      getConversationEditReturnPath({
        conversationSlugId: current.original.conversationSlugId,
        returnTo: route.query.returnTo,
        projectAssignment: response.projectAssignment,
      })
    );
  } catch {
    if (session.value === current) showNotifyMessage(editT("updateError"));
  } finally {
    current.isSaving = false;
  }
}

async function reloadParticipantPolicy(): Promise<void> {
  const current = session.value;
  if (current === undefined || isSaving.value) return;
  current.isSaving = true;
  try {
    const fresh = await getConversationForEdit(
      current.original.conversationSlugId
    );
    if (session.value !== current) return;
    if (!fresh.success) {
      showSaveFailure(fresh);
      return;
    }
    current.original.participantStatements = { ...fresh.participantStatements };
    current.form.participantStatements = { ...fresh.participantStatements };
    participantPolicyNeedsRefresh.value = false;
  } catch {
    if (session.value === current) showNotifyMessage(editT("updateError"));
  } finally {
    current.isSaving = false;
  }
}

async function reloadQvStatements(): Promise<void> {
  const current = session.value;
  if (current === undefined || isSaving.value) return;
  current.isSaving = true;
  try {
    const fresh = await getConversationForEdit(
      current.original.conversationSlugId
    );
    if (session.value !== current) return;
    if (!fresh.success) {
      showSaveFailure(fresh);
      return;
    }
    if (fresh.qvStatements === undefined) return;
    current.original.qvStatements = fresh.qvStatements;
    current.qvStatements = fresh.qvStatements.items.map((item) => ({
      localKey: item.slugId,
      title: item.title,
      description: item.description ?? "",
    }));
    current.qvStatementsNeedRefresh = false;
  } catch {
    if (session.value === current) showNotifyMessage(qvT("loadError"));
  } finally {
    current.isSaving = false;
  }
}
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding-block: 1rem 4rem;
}
.statement-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: var(--font-weight-medium);
}
.description {
  margin: 0;
  font-size: 0.9rem;
  color: $color-text-weak;
}
</style>
