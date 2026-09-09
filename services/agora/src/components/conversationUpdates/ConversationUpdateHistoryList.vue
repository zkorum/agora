<template>
  <q-card flat bordered class="history-card">
    <q-card-section v-if="records.length > 0" class="history-card__heading">
      <div>
        <p>{{ t("deliveryHistory") }}</p>
        <h2>{{ t("sentUpdates") }}</h2>
      </div>
      <q-icon name="mdi-history" size="1.65rem" />
    </q-card-section>

    <q-separator v-if="records.length > 0" />

    <q-card-section v-if="records.length === 0" class="history-card__empty">
      <q-icon name="mdi-email-outline" size="2rem" />
      <div>
        <h2>{{ t("emptyHeading") }}</h2>
        <p>{{ t("emptyDescription") }}</p>
      </div>
    </q-card-section>

    <q-list v-else separator>
      <q-item
        v-for="record in records"
        :key="record.id"
        class="history-card__item"
      >
        <q-item-section>
          <div class="history-card__item-heading">
            <div>
              <q-item-label class="history-card__subject">{{
                record.subject
              }}</q-item-label>
              <q-item-label caption
                >{{ record.scopeLabel }} ·
                {{ formatDate(record.acceptedAt) }}</q-item-label
              >
            </div>
            <ZKChip :color="getStatusColor(record.status)">
              {{ getStatusLabel(record.status) }}
            </ZKChip>
          </div>

          <div class="history-card__facts">
            <span>
              <q-icon name="mdi-account-multiple-outline" />
              {{ getAudienceLabel(record.audienceEstimate) }}
            </span>
            <span>
              <q-icon name="mdi-forum-outline" />
              {{ getConversationCountLabel(record.conversations.length) }}
            </span>
            <span>
              <q-icon name="mdi-account-tie-outline" />
              {{ getOwnerCopyCountLabel(record.ownerCopyCount) }}
            </span>
          </div>

          <p
            v-if="getOutcomeDetail(record) !== undefined"
            class="history-card__reason"
          >
            {{ getOutcomeDetail(record) }}
          </p>

          <q-expansion-item
            v-model="expandedRecords[record.id]"
            dense
            switch-toggle-side
            icon="mdi-email-open-outline"
            :label="t('viewEmailContent')"
            class="history-card__content-disclosure"
          >
            <ConversationUpdateHistoryPreview
              v-if="expandedRecords[record.id]"
              :update-id="record.id"
              :language="language"
            />
          </q-expansion-item>
        </q-item-section>
      </q-item>
    </q-list>
  </q-card>
</template>

<script setup lang="ts">
import type {
  ConversationUpdateAutomaticStopReason,
  ConversationUpdateFailureReason,
  ConversationUpdateHistoryRecord,
  ConversationUpdateStatus,
} from "src/components/conversationUpdates/conversationUpdateTypes";
import ZKChip from "src/components/ui-library/ZKChip.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import { ref } from "vue";

import {
  type ConversationUpdateHistoryListTranslations,
  conversationUpdateHistoryListTranslations,
} from "./ConversationUpdateHistoryList.i18n";
import ConversationUpdateHistoryPreview from "./ConversationUpdateHistoryPreview.vue";

defineProps<{
  records: readonly ConversationUpdateHistoryRecord[];
  language: SupportedDisplayLanguageCodes;
}>();
const expandedRecords = ref<Partial<Record<string, boolean>>>({});

const { t, locale } =
  useComponentI18n<ConversationUpdateHistoryListTranslations>(
    conversationUpdateHistoryListTranslations
  );

function getStatusLabel(status: ConversationUpdateStatus): string {
  switch (status) {
    case "preparing":
      return t("statusPreparing");
    case "sending":
      return t("statusSending");
    case "queued":
      return t("statusQueued");
    case "stopping":
      return t("statusStopping");
    case "completed":
      return t("statusCompleted");
    case "completed_with_failures":
      return t("statusCompletedWithFailures");
    case "failed":
      return t("statusFailed");
    case "stopped":
      return t("statusStopped");
  }
}

function getStatusColor(
  status: ConversationUpdateStatus
): "muted" | "primary" | "warning" {
  switch (status) {
    case "completed":
    case "sending":
      return "primary";
    case "queued":
    case "preparing":
    case "stopping":
    case "completed_with_failures":
    case "failed":
      return "warning";
    case "stopped":
      return "muted";
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(locale.value).format(value);
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function getConversationCountLabel(count: number): string {
  return t(count === 1 ? "conversationSingular" : "conversationPlural", {
    count: formatNumber(count),
  });
}

function getOwnerCopyCountLabel(count: number): string {
  return t(count === 1 ? "ownerCopySingular" : "ownerCopyPlural", {
    count: formatNumber(count),
  });
}

function getAudienceLabel(count: number): string {
  return t(count === 1 ? "audienceSingular" : "audiencePlural", {
    count: formatNumber(count),
  });
}

function getOutcomeDetail(
  record: ConversationUpdateHistoryRecord
): string | undefined {
  switch (record.status) {
    case "completed_with_failures":
      return t("outcomeCompletedWithFailures");
    case "failed":
      return getFailureDetail(record.reason);
    case "stopping":
    case "stopped":
      return getAutomaticStopDetail(record.reason);
    case "completed":
    case "preparing":
    case "queued":
    case "sending":
      return undefined;
  }
}

function getAutomaticStopDetail(
  reason: ConversationUpdateAutomaticStopReason
): string {
  switch (reason) {
    case "emergency_global_kill_switch":
      return t("stopGlobalKillSwitch");
    case "emergency_legal_or_abuse_block":
      return t("stopLegalOrAbuseBlock");
  }
}

function getFailureDetail(reason: ConversationUpdateFailureReason): string {
  switch (reason) {
    case "required_owner_copy_not_accepted":
      return t("failureOwnerCopyNotAccepted");
    case "audience_materialization_failed":
      return t("failureAudienceMaterialization");
    case "no_eligible_participants":
      return t("failureNoEligibleParticipants");
    case "provider_configuration_error":
      return t("failureProviderConfiguration");
    case "all_participant_attempts_failed":
      return t("failureAllParticipantAttempts");
  }
}
</script>

<style scoped lang="scss">
.history-card {
  overflow: hidden;
  border-radius: 1rem;

  &__heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;

    p {
      margin: 0;
      color: $primary;
      font-size: 0.75rem;
      font-weight: var(--font-weight-semibold);
    }

    h2 {
      margin: 0.2rem 0 0;
      color: $color-text-strong;
      font-size: 1.2rem;
    }

    .q-icon {
      color: $primary;
    }
  }

  &__item {
    padding-block: 1.25rem;
  }

  &__empty {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;

    .q-icon {
      flex: 0 0 auto;
      color: $primary;
    }

    h2,
    p {
      margin: 0;
    }

    h2 {
      color: $color-text-strong;
      font-size: 1.1rem;
    }

    p {
      margin-block-start: 0.25rem;
      color: $grey-7;
      line-height: 1.4;
    }
  }

  &__item-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  &__subject {
    color: $color-text-strong;
    font-weight: var(--font-weight-semibold);
  }

  &__facts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1.25rem;
    margin-block: 0.85rem;
    color: $grey-8;
    font-size: 0.78rem;

    span {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }
  }

  &__reason {
    margin: 0.75rem 0 0;
    padding: 0.7rem 0.8rem;
    border-radius: 0.5rem;
    background: $grey-2;
    color: $grey-8;
    font-size: 0.78rem;
  }

  &__content-disclosure {
    margin-block-start: 0.75rem;
    border: 1px solid $grey-4;
    border-radius: 0.65rem;
    overflow: hidden;
  }
}

@media (max-width: $breakpoint-xs-max) {
  .history-card__item-heading {
    flex-direction: column;
  }
}
</style>
