<template>
  <q-card flat bordered class="history-card">
    <q-card-section class="history-card__heading">
      <div>
        <p>Immutable history</p>
        <h2>Email Updates</h2>
      </div>
      <q-icon name="mdi-history" size="1.65rem" />
    </q-card-section>

    <q-separator />

    <q-list separator>
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
                {{ record.createdAtLabel }}</q-item-label
              >
            </div>
            <ZKChip :color="getStatusColor(record.status)">
              {{ getStatusLabel(record.status) }}
            </ZKChip>
          </div>

          <div class="history-card__facts">
            <span>
              <q-icon name="mdi-account-multiple-outline" />
              About {{ formatNumber(record.audienceEstimate) }} eligible
              participants
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
            dense
            switch-toggle-side
            icon="mdi-email-open-outline"
            label="View email content"
            class="history-card__content-disclosure"
          >
            <div class="history-card__content-snapshot">
              <div>
                <span>Subject</span>
                <strong>{{ record.subject }}</strong>
              </div>
              <ZKHtmlContent
                :html-body="record.bodyHtml"
                :compact-mode="false"
                :enable-links="false"
                :collapsible="false"
              />
              <section>
                <SpaLink
                  v-if="
                    record.scopeKind === 'project' &&
                    record.scopeHref !== undefined
                  "
                  :to="record.scopeHref"
                  class="history-card__scope-link"
                >
                  <strong>{{ record.scopeLabel }}</strong>
                  <q-icon name="mdi-open-in-new" size="1rem" />
                </SpaLink>
                <ul>
                  <li
                    v-for="conversation in record.conversations"
                    :key="conversation.href"
                  >
                    <SpaLink :to="conversation.href">
                      <span>{{ conversation.title }}</span>
                      <q-icon name="mdi-open-in-new" size="1rem" />
                    </SpaLink>
                  </li>
                </ul>
              </section>
            </div>
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
import SpaLink from "src/components/ui-library/SpaLink.vue";
import ZKChip from "src/components/ui-library/ZKChip.vue";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";

defineProps<{
  records: readonly ConversationUpdateHistoryRecord[];
}>();

function getStatusLabel(status: ConversationUpdateStatus): string {
  switch (status) {
    case "preparing":
      return "Preparing";
    case "sending":
      return "Sending";
    case "queued":
      return "Queued";
    case "stopping":
      return "Stopping";
    case "completed":
      return "Completed";
    case "completed_with_failures":
      return "Completed with failures";
    case "failed":
      return "Failed";
    case "stopped":
      return "Stopped";
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
  return new Intl.NumberFormat().format(value);
}

function getConversationCountLabel(count: number): string {
  return count === 1 ? "1 conversation" : `${String(count)} conversations`;
}

function getOwnerCopyCountLabel(count: number): string {
  return count === 1 ? "1 owner copy" : `${String(count)} owner copies`;
}

function getOutcomeDetail(
  record: ConversationUpdateHistoryRecord
): string | undefined {
  switch (record.status) {
    case "completed_with_failures":
      return "Participant delivery finished, but one or more recipient attempts failed or had an unknown provider outcome.";
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
      return "Automatically stopped before remaining delivery because Agora activated the emergency global sending stop.";
    case "emergency_legal_or_abuse_block":
      return "Automatically stopped before remaining delivery because Agora applied an emergency legal or abuse-safety block.";
  }
}

function getFailureDetail(reason: ConversationUpdateFailureReason): string {
  switch (reason) {
    case "required_owner_copy_not_accepted":
      return "Participant delivery did not begin because at least one required conversation owner copy was not accepted by the email provider.";
    case "audience_materialization_failed":
      return "The eligible participant audience could not be prepared safely, so no participant delivery began.";
    case "no_eligible_participants":
      return "No participants remained eligible at the accepted audience cutoff, so no participant delivery began.";
    case "provider_configuration_error":
      return "Participant delivery could not begin because the email provider configuration was invalid.";
    case "all_participant_attempts_failed":
      return "No participant attempt was provider-accepted; every participant attempt failed or ended with an unknown outcome.";
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

  &__content-snapshot {
    display: grid;
    gap: 1.25rem;
    padding: 1rem;
    border-top: 1px solid $grey-4;
    background: $grey-1;

    > div:first-child,
    section {
      display: grid;
      gap: 0.35rem;
    }

    > div:first-child > span {
      color: $grey-7;
      font-size: 0.7rem;
      font-weight: var(--font-weight-semibold);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    section > .history-card__scope-link + ul {
      margin-inline-start: 0.4rem;
      padding-inline-start: 1.75rem;
      border-inline-start: 2px solid rgba($primary, 0.24);
    }

    ul {
      display: grid;
      gap: 0.25rem;
      margin: 0;
      padding-inline-start: 1.2rem;
      color: $grey-8;
      font-size: 0.78rem;

      a {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        color: $primary;
      }
    }
  }

  &__scope-link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    color: $primary;
    font-size: 0.9rem;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-block-start: 0.75rem;
  }
}

@media (max-width: $breakpoint-xs-max) {
  .history-card__item-heading {
    flex-direction: column;
  }
}
</style>
