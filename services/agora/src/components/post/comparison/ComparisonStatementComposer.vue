<template>
  <div
    v-if="policy.supported && (policy.enabled || body.length > 0)"
    class="statement-composer"
  >
    <q-btn
      v-if="policy.enabled"
      flat
      no-caps
      color="primary"
      :label="t('add')"
      :disable="disabled || busy"
      @click="open = true"
    />
    <p v-else role="status">{{ t("disabled") }}</p>
    <q-dialog v-model="open" :persistent="busy">
      <q-card class="statement-dialog">
        <q-card-section>
          <h2>{{ t("add") }}</h2>
          <p v-if="!policy.enabled" role="status">{{ t("disabled") }}</p>
          <Editor
            v-model="body"
            v-model:plain-text="plainText"
            :show-toolbar="true"
            min-height="6rem"
            :single-line="false"
            :placeholder="t('placeholder')"
            :max-length="MAX_LENGTH_OPINION"
            :disabled="busy || disabled || !policy.enabled"
            @update:is-over-limit="(value: boolean) => (overLimit = value)"
          />
          <p v-if="errorMessage" role="alert">{{ errorMessage }}</p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            flat
            no-caps
            :label="t('close')"
            :disable="busy"
            @click="open = false"
          />
          <q-btn
            unelevated
            no-caps
            color="primary"
            :label="t('submit')"
            :loading="busy"
            :disable="
              disabled ||
              !policy.enabled ||
              overLimit ||
              plainText.trim().length === 0
            "
            @click="submit"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { useQueryClient } from "@tanstack/vue-query";
import { participantStatementsTranslations } from "src/components/newConversation/ParticipantStatements.i18n";
import { useParticipationGate } from "src/composables/conversation/useParticipationGate";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { MAX_LENGTH_OPINION } from "src/shared/shared";
import type { ParticipantStatements } from "src/shared/types/zod";
import { useNewOpinionDraftsStore } from "src/stores/newOpinionDrafts";
import { useComparisonApi } from "src/utils/api/comparison/comparison";
import { useParticipationViewerLifetime } from "src/utils/api/participation/useParticipationViewerLifetime";
import { useNotify } from "src/utils/ui/notify";
import {
  defineAsyncComponent,
  onDeactivated,
  onScopeDispose,
  ref,
  watch,
} from "vue";

const props = defineProps<{
  conversationSlugId: string;
  policy: ParticipantStatements;
  disabled: boolean;
}>();
const { t } = useComponentI18n(participantStatementsTranslations);
const Editor = defineAsyncComponent(
  () => import("src/components/editor/Editor.vue")
);
const drafts = useNewOpinionDraftsStore();
const viewerLifetime = useParticipationViewerLifetime();
const { createStatement } = useComparisonApi();
const { showNotifyMessage } = useNotify();
const queryClient = useQueryClient();
const {
  participationStatus,
  openParticipationOnboarding,
  captureParticipationAction,
} = useParticipationGate(() => props.conversationSlugId);
const body = ref(drafts.getOpinionDraft(props.conversationSlugId)?.body ?? "");
const plainText = ref("");
const open = ref(false);
const busy = ref(false);
const overLimit = ref(false);
const errorMessage = ref("");
let generation = 0;
function invalidateSubmission(): void {
  generation += 1;
  busy.value = false;
}
onScopeDispose(invalidateSubmission);
onDeactivated(invalidateSubmission);
watch(
  body,
  (value) => {
    if (value.length > 0)
      drafts.saveOpinionDraft(props.conversationSlugId, value);
    else drafts.deleteOpinionDraft(props.conversationSlugId);
  },
  { flush: "sync" }
);
watch(
  () => props.conversationSlugId,
  (slug) => {
    invalidateSubmission();
    open.value = false;
    plainText.value = "";
    overLimit.value = false;
    body.value = drafts.getOpinionDraft(slug)?.body ?? "";
    errorMessage.value = "";
  },
  { flush: "sync" }
);

async function submit(): Promise<void> {
  if (
    busy.value ||
    props.disabled ||
    !props.policy.supported ||
    !props.policy.enabled ||
    overLimit.value ||
    plainText.value.trim().length === 0
  )
    return;
  if (participationStatus.value.status !== "ready") {
    await openParticipationOnboarding();
    return;
  }
  const action = captureParticipationAction();
  const isViewerCurrent = viewerLifetime.capture();
  const submittedGeneration = generation;
  const slug = props.conversationSlugId;
  const isCurrent = () =>
    submittedGeneration === generation &&
    action.isCurrent() &&
    isViewerCurrent();
  const submittedBody = body.value;
  busy.value = true;
  errorMessage.value = "";
  try {
    const response = await createStatement({
      conversationSlugId: slug,
      statementBody: submittedBody,
      isCurrent,
    });
    if (!isCurrent() || response === undefined) return;
    if (!response.success) {
      if ("participationStatus" in response)
        await action.handleBlockedReason(response);
      else {
        errorMessage.value = t(
          response.reason === "participant_statements_disabled" ||
            response.reason === "participant_statements_unsupported"
            ? "disabled"
            : "failed"
        );
        if (
          response.reason === "participant_statements_disabled" ||
          response.reason === "participant_statements_unsupported"
        )
          void queryClient.invalidateQueries({
            queryKey: ["conversation", slug],
          });
      }
      return;
    }
    if (body.value === submittedBody) {
      body.value = "";
      open.value = false;
    }
    for (const family of [
      "comparison-items",
      "comparison-load",
      "prioritization-items",
    ])
      void queryClient.invalidateQueries({ queryKey: [family, slug] });
    showNotifyMessage(t("created"));
  } catch {
    if (isCurrent()) errorMessage.value = t("failed");
  } finally {
    if (submittedGeneration === generation) busy.value = false;
  }
}
</script>

<style scoped lang="scss">
.statement-composer {
  margin-block: 1rem;
}
.statement-dialog {
  inline-size: min(36rem, 90vw);
}
h2 {
  margin-block: 0 1rem;
  font-size: 1.2rem;
}
</style>
